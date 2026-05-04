import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Capture from './Capture';
import type {
  CapturePhase,
  ReviewForm,
} from '@/hooks/useCaptureFlow';

// Spy on useNavigate so we can assert what the screen does on done-phase
// button clicks. Mirrors the pattern used in ReceiptDetail/Activity tests.
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const mod =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...mod, useNavigate: () => navigate };
});

// useCaptureFlow is the orchestrator — mock it so each test drives the
// screen into a specific phase. Real flow logic lives in
// useCaptureFlow.test.ts.
vi.mock('@/hooks/useCaptureFlow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useCaptureFlow')>();
  return {
    ...actual,
    useCaptureFlow: vi.fn(),
  };
});

import { useCaptureFlow } from '@/hooks/useCaptureFlow';
const mockedUseCaptureFlow = vi.mocked(useCaptureFlow);

const sampleForm: ReviewForm = {
  merchantName: 'Kinokuniya KLCC',
  receiptDate: '2026-04-15',
  totalAmount: 142,
  currency: 'MYR',
  category: 'lifestyle',
  isClaimable: true,
};

function makeFlow(overrides: Partial<ReturnType<typeof useCaptureFlow>> = {}) {
  return {
    phase: 'idle' as CapturePhase,
    errorMessage: null,
    form: null,
    extracted: null,
    upload: null,
    insertedId: null,
    start: vi.fn(),
    confirm: vi.fn(),
    reset: vi.fn(),
    setForm: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useCaptureFlow>;
}

function renderCapture() {
  return render(
    <MemoryRouter initialEntries={['/capture']}>
      <Capture />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockedUseCaptureFlow.mockReset();
  navigate.mockReset();
});

describe('Capture', () => {
  it('idle: renders the AI PARSED chip and a Tap to scan CTA', () => {
    mockedUseCaptureFlow.mockReturnValue(makeFlow({ phase: 'idle' }));
    renderCapture();
    expect(screen.getByText('AI PARSED')).toBeInTheDocument();
    expect(screen.getByText('Scan a receipt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tap to scan' })).toBeInTheDocument();
  });

  it('idle: clicking Tap to scan calls flow.start()', async () => {
    const start = vi.fn();
    mockedUseCaptureFlow.mockReturnValue(makeFlow({ phase: 'idle', start }));
    renderCapture();
    await userEvent.click(screen.getByRole('button', { name: 'Tap to scan' }));
    expect(start).toHaveBeenCalledOnce();
  });

  it('progress: renders status label while uploading', () => {
    mockedUseCaptureFlow.mockReturnValue(makeFlow({ phase: 'uploading' }));
    renderCapture();
    // Both the top phase header and the body label render this text.
    expect(screen.getAllByText('Uploading receipt…').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('progress: renders status label while extracting', () => {
    mockedUseCaptureFlow.mockReturnValue(makeFlow({ phase: 'extracting' }));
    renderCapture();
    expect(screen.getAllByText('Reading with AI…').length).toBeGreaterThanOrEqual(1);
  });

  it('review: renders editable fields pre-filled from extraction', () => {
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'review', form: sampleForm }),
    );
    renderCapture();
    expect(screen.getByDisplayValue('Kinokuniya KLCC')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-04-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('142')).toBeInTheDocument();
    expect(screen.getByDisplayValue('lifestyle')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /LHDN claimable/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('review: editing the merchant field calls setForm with the updater', async () => {
    const setForm = vi.fn();
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'review', form: sampleForm, setForm }),
    );
    renderCapture();
    const merchantInput = screen.getByDisplayValue('Kinokuniya KLCC') as HTMLInputElement;
    await userEvent.type(merchantInput, '!');
    expect(setForm).toHaveBeenCalled();
    // The updater should produce a new merchantName ending with '!' when given the current form.
    const updater = setForm.mock.calls[setForm.mock.calls.length - 1]![0] as (f: ReviewForm) => ReviewForm;
    expect(updater(sampleForm).merchantName).toBe('Kinokuniya KLCC!');
  });

  it('review: tapping LHDN switch toggles isClaimable via setForm', async () => {
    const setForm = vi.fn();
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'review', form: sampleForm, setForm }),
    );
    renderCapture();
    await userEvent.click(screen.getByRole('switch', { name: /LHDN claimable/i }));
    const updater = setForm.mock.calls[0]![0] as (f: ReviewForm) => ReviewForm;
    expect(updater(sampleForm).isClaimable).toBe(false);
  });

  it('review: Save expense triggers flow.confirm()', async () => {
    const confirm = vi.fn();
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'review', form: sampleForm, confirm }),
    );
    renderCapture();
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('review: Cancel triggers flow.reset()', async () => {
    const reset = vi.fn();
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'review', form: sampleForm, reset }),
    );
    renderCapture();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('saving: Save button is disabled and shows pending label', () => {
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'saving', form: sampleForm }),
    );
    renderCapture();
    const saveBtn = screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('done: shows the success banner with View receipt + Back to home buttons', () => {
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'done', insertedId: 'new-id' }),
    );
    renderCapture();
    expect(screen.getByText('Receipt saved')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'View receipt' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Back to home' }),
    ).toBeInTheDocument();
  });

  it('done: clicking View receipt navigates to /receipts/<insertedId>', async () => {
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'done', insertedId: 'new-id' }),
    );
    renderCapture();
    await userEvent.click(
      screen.getByRole('button', { name: 'View receipt' }),
    );
    expect(navigate).toHaveBeenCalledWith('/receipts/new-id');
  });

  it('done: clicking Back to home navigates to /', async () => {
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'done', insertedId: 'new-id' }),
    );
    renderCapture();
    await userEvent.click(
      screen.getByRole('button', { name: 'Back to home' }),
    );
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('done: does not auto-navigate — navigate stays untouched until a button is clicked', () => {
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'done', insertedId: 'new-id' }),
    );
    renderCapture();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('done: View receipt is disabled when insertedId is null', () => {
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'done', insertedId: null }),
    );
    renderCapture();
    const viewBtn = screen.getByRole('button', {
      name: 'View receipt',
    }) as HTMLButtonElement;
    expect(viewBtn.disabled).toBe(true);
  });

  it('error: shows the error message and Try again retries via flow.start()', async () => {
    const start = vi.fn();
    mockedUseCaptureFlow.mockReturnValue(
      makeFlow({ phase: 'error', errorMessage: 'Claude rate limited', start }),
    );
    renderCapture();
    expect(screen.getByText("Couldn't capture receipt")).toBeInTheDocument();
    expect(screen.getByText('Claude rate limited')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(start).toHaveBeenCalledOnce();
  });
});
