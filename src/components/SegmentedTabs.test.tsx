/**
 * SegmentedTabs tests — verify ARIA tablist/tab semantics, aria-selected
 * mapping by value, change-on-click, and the no-op when re-clicking the
 * already-active segment.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SegmentedTabs } from './SegmentedTabs';

type Mode = 'claimable' | 'all';

const OPTIONS: ReadonlyArray<{ readonly value: Mode; readonly label: string }> = [
  { value: 'claimable', label: 'Claimable' },
  { value: 'all', label: 'All spend' },
];

describe('SegmentedTabs', () => {
  it('renders all options as buttons with role="tab"', () => {
    const { getAllByRole } = render(
      <SegmentedTabs<Mode> options={OPTIONS} value="claimable" onChange={() => {}} />,
    );
    const tabs = getAllByRole('tab');
    expect(tabs.length).toBe(OPTIONS.length);
    for (const tab of tabs) {
      expect(tab.tagName).toBe('BUTTON');
      expect(tab.getAttribute('type')).toBe('button');
    }
  });

  it('marks the matching option aria-selected="true" and others "false"', () => {
    const { getByRole } = render(
      <SegmentedTabs<Mode> options={OPTIONS} value="claimable" onChange={() => {}} />,
    );
    const claimable = getByRole('tab', { name: 'Claimable' });
    const all = getByRole('tab', { name: 'All spend' });
    expect(claimable.getAttribute('aria-selected')).toBe('true');
    expect(all.getAttribute('aria-selected')).toBe('false');
  });

  it('clicking a non-active button calls onChange with that value', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <SegmentedTabs<Mode> options={OPTIONS} value="claimable" onChange={onChange} />,
    );
    fireEvent.click(getByRole('tab', { name: 'All spend' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('clicking the active button does NOT call onChange', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <SegmentedTabs<Mode> options={OPTIONS} value="claimable" onChange={onChange} />,
    );
    fireEvent.click(getByRole('tab', { name: 'Claimable' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('container has role="tablist"', () => {
    const { getByRole } = render(
      <SegmentedTabs<Mode> options={OPTIONS} value="claimable" onChange={() => {}} />,
    );
    expect(getByRole('tablist')).toBeInTheDocument();
  });

  it('exposes the ariaLabel prop as the tablist accessible name', () => {
    const { getByRole } = render(
      <SegmentedTabs<Mode>
        options={OPTIONS}
        value="claimable"
        onChange={() => {}}
        ariaLabel="Insights view"
      />,
    );
    expect(getByRole('tablist', { name: 'Insights view' })).toBeInTheDocument();
  });
});
