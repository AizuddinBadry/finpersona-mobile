/**
 * FinSplit — bill splitting screen.
 *
 * Two phases:
 *   setup    — first-time: enter name, bank, account number and/or upload DuitNow QR
 *   main     — payment profile card + optional bill split across N people
 *              with per-person WhatsApp share and a "Share All" summary
 *
 * All state is persisted to localStorage via finsplit-storage.ts. No backend.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import {
  getFinSplitConfig,
  saveFinSplitConfig,
  type FinSplitConfig,
  type SplitParticipant,
} from '@/lib/finsplit-storage';

const GRAD_HERO = 'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';
const GRAD_CARD = 'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)';
const GRAD_GLOW = 'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)';
const GRAD_TEAL = 'linear-gradient(135deg, #0EA5A0 0%, #14C4BC 100%)';

const BANK_OPTIONS = [
  'Maybank', 'CIMB', 'Public Bank', 'RHB', 'Hong Leong Bank',
  'AmBank', 'Bank Islam', 'Bank Rakyat', 'BSN', 'OCBC', 'UOB',
  'HSBC', 'Standard Chartered', "Touch 'n Go", 'GrabPay', 'Boost',
  'BigPay', 'Other',
];

function formatRm(n: number): string {
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maskAccount(acct: string): string {
  if (acct.length <= 4) return acct;
  return `•••• ${acct.slice(-4)}`;
}

function buildParticipants(count: number, total: number): SplitParticipant[] {
  const base = total > 0 ? Math.floor((total / count) * 100) / 100 : 0;
  const remainder = total > 0 ? Math.round((total - base * count) * 100) / 100 : 0;
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Person ${i + 1}`,
    amount: i === count - 1 ? Math.round((base + remainder) * 100) / 100 : base,
    paid: false,
  }));
}

// ─── Setup Phase ────────────────────────────────────────────────────────────

interface SetupProps {
  initial: Partial<FinSplitConfig> | null;
  onComplete: (config: FinSplitConfig) => void;
  onCancel?: () => void;
}

function SetupForm({ initial, onComplete, onCancel }: SetupProps) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [bankName, setBankName] = useState(initial?.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? '');
  const [qrImage, setQrImage] = useState<string | null>(initial?.qrImageBase64 ?? null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => { setQrImage(e.target?.result as string); setError(null); };
    reader.readAsDataURL(file);
  }, []);

  function handleSubmit() {
    if (!displayName.trim()) { setError('Please enter your display name'); return; }
    if (!bankName) { setError('Please select your bank or e-wallet'); return; }
    if (!accountNumber.trim() && !qrImage) {
      setError('Please enter account number or upload DuitNow QR');
      return;
    }
    const config: FinSplitConfig = {
      displayName: displayName.trim(),
      bankName,
      accountNumber: accountNumber.trim(),
      qrImageBase64: qrImage,
      setupCompleted: true,
      updatedAt: new Date().toISOString(),
    };
    saveFinSplitConfig(config);
    onComplete(config);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    borderRadius: 10,
    border: '1px solid rgba(91,71,168,0.20)',
    background: '#F8F6FF',
    padding: '0 12px',
    fontSize: 14,
    color: '#1A1530',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#6B6584',
    letterSpacing: 0.2,
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div className="flex items-center" style={{ gap: 12, padding: '20px 20px 0' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 0, padding: 4, cursor: 'pointer', display: 'flex' }}
          >
            <Icon name="arrowLeft" size={20} color="#1A1530" />
          </button>
        )}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1530', letterSpacing: -0.4, margin: 0 }}>
            {initial?.setupCompleted ? 'Edit Payment Profile' : 'Set Up FinSplit'}
          </h1>
          <p style={{ fontSize: 12, color: '#6B6584', margin: '2px 0 0' }}>
            {initial?.setupCompleted ? 'Update your payment details' : 'Your payment info for bill splitting'}
          </p>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Illustration */}
        <div
          style={{
            background: GRAD_CARD,
            borderRadius: 18,
            padding: '20px 20px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: GRAD_GLOW, pointerEvents: 'none' }} />
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="splitBill" size={24} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: -0.2 }}>
              Split bills with ease
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              Share your DuitNow QR or bank details. Your info stays on-device only.
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label style={labelStyle}>YOUR NAME</label>
          <input
            style={inputStyle}
            placeholder="e.g. Ahmad Aizuddin"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* Bank */}
        <div>
          <label style={labelStyle}>BANK / E-WALLET</label>
          <select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="">Select bank or e-wallet</option>
            {BANK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Account Number */}
        <div>
          <label style={labelStyle}>ACCOUNT NUMBER (OPTIONAL)</label>
          <input
            style={inputStyle}
            placeholder="e.g. 1234567890"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            inputMode="numeric"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center" style={{ gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(91,71,168,0.10)' }} />
          <span style={{ fontSize: 11, color: '#9B95B0', fontWeight: 500 }}>OR UPLOAD DUITNOW QR</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(91,71,168,0.10)' }} />
        </div>

        {/* QR Upload */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed',
            borderColor: qrImage ? '#0EA5A0' : 'rgba(110,76,230,0.30)',
            borderRadius: 14,
            background: qrImage ? 'rgba(14,165,160,0.05)' : '#FDFCFF',
            padding: '18px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            width: '100%',
            textAlign: 'left',
          }}
        >
          {qrImage ? (
            <>
              <img
                src={qrImage}
                alt="DuitNow QR"
                style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'contain', background: '#fff', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0EA5A0' }}>QR uploaded</div>
                <div style={{ fontSize: 11, color: '#6B6584', marginTop: 2 }}>Tap to replace</div>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#F5F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="qrCode" size={22} color="#6E4CE6" strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1530' }}>
                  Upload DuitNow QR screenshot
                </div>
                <div style={{ fontSize: 11, color: '#6B6584', marginTop: 2 }}>
                  Screenshot from your banking app
                </div>
              </div>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.20)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              color: '#DC2626',
            }}
          >
            {error}
          </div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 14,
            background: GRAD_HERO,
            border: 0,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: -0.2,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(110,76,230,0.32)',
          }}
        >
          {initial?.setupCompleted ? 'Save Changes' : 'Continue'}
        </button>

        <p style={{ fontSize: 11, color: '#9B95B0', textAlign: 'center', margin: 0 }}>
          Your details are stored only on this device.
        </p>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

interface MainViewProps {
  config: FinSplitConfig;
  onEdit: () => void;
  onBack: () => void;
  prefillAmount?: number;
  prefillNote?: string;
}

function MainView({ config, onEdit, onBack, prefillAmount, prefillNote }: MainViewProps) {
  const [totalStr, setTotalStr] = useState(prefillAmount ? String(prefillAmount) : '');
  const [note, setNote] = useState(prefillNote ?? '');
  const [splitEnabled, setSplitEnabled] = useState(!!prefillAmount);
  const [personCount, setPersonCount] = useState(2);
  const [participants, setParticipants] = useState<SplitParticipant[]>(() =>
    buildParticipants(2, 0)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const total = parseFloat(totalStr) || 0;

  useEffect(() => {
    if (!splitEnabled) return;
    setParticipants(buildParticipants(personCount, total));
  }, [personCount, total, splitEnabled]);

  function changeCount(delta: number) {
    const next = Math.min(10, Math.max(2, personCount + delta));
    setPersonCount(next);
  }

  function startEditName(p: SplitParticipant) {
    setEditingId(p.id);
    setEditingName(p.name);
  }

  function commitName(id: string) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: editingName.trim() || p.name } : p))
    );
    setEditingId(null);
  }

  function togglePaid(id: string) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, paid: !p.paid } : p))
    );
  }

  function buildShareText(p: SplitParticipant): string {
    const amtLine = total > 0 ? ` ${formatRm(p.amount)}` : '';
    const notePart = note.trim() ? ` for *${note.trim()}*` : '';
    const payLine = config.accountNumber
      ? `*${config.bankName}* acc: ${config.accountNumber}`
      : `*${config.bankName}* DuitNow QR`;
    return (
      `Hi ${p.name}! 👋\n` +
      `Your share${notePart} is *${amtLine || 'TBD'}*.\n` +
      `Please pay *${config.displayName}* via ${payLine}.`
    );
  }

  async function shareToWhatsApp(p: SplitParticipant) {
    const text = buildShareText(p);
    if (config.qrImageBase64 && navigator.canShare) {
      try {
        const res = await fetch(config.qrImageBase64);
        const blob = await res.blob();
        const file = new File([blob], 'duitnow-qr.png', { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ text, files: [file] });
          setShareSuccess(p.id);
          setTimeout(() => setShareSuccess(null), 2000);
          return;
        }
      } catch {
        // fall through to text-only
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  async function shareAll() {
    const lines = participants.map(
      (p) => `• ${p.name}: ${total > 0 ? formatRm(p.amount) : 'TBD'}`
    );
    const notePart = note.trim() ? ` for *${note.trim()}*` : '';
    const payLine = config.accountNumber
      ? `*${config.bankName}* acc: ${config.accountNumber}`
      : `*${config.bankName}* DuitNow`;
    const text =
      `💰 *Bill Split${notePart}*\n\n` +
      lines.join('\n') +
      `\n\nTotal: ${total > 0 ? formatRm(total) : 'TBD'}\n` +
      `Pay *${config.displayName}* via ${payLine}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    borderRadius: 10,
    border: '1px solid rgba(91,71,168,0.20)',
    background: '#F8F6FF',
    padding: '0 12px',
    fontSize: 14,
    color: '#1A1530',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '20px 20px 0' }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={onBack}
            style={{ background: 'none', border: 0, padding: 4, cursor: 'pointer', display: 'flex' }}
          >
            <Icon name="arrowLeft" size={20} color="#1A1530" />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1530', letterSpacing: -0.4, margin: 0 }}>
              FinSplit
            </h1>
            <p style={{ fontSize: 12, color: '#6B6584', margin: '2px 0 0' }}>Split bills & share payment</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#F5F2FE',
            border: '0.5px solid rgba(91,71,168,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="settings" size={16} color="#6E4CE6" strokeWidth={1.8} />
        </button>
      </div>

      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Payment profile card */}
        <div
          style={{
            background: GRAD_CARD,
            borderRadius: 20,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: GRAD_GLOW, pointerEvents: 'none' }} />
          <div className="flex items-start justify-between">
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.6, marginBottom: 6 }}>
                PAYMENT PROFILE
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>
                {config.displayName}
              </div>
              <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#fff',
                    background: 'rgba(255,255,255,0.18)',
                    padding: '3px 8px',
                    borderRadius: 6,
                  }}
                >
                  {config.bankName}
                </span>
                {config.accountNumber && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>
                    {maskAccount(config.accountNumber)}
                  </span>
                )}
              </div>
            </div>
            {config.qrImageBase64 ? (
              <img
                src={config.qrImageBase64}
                alt="DuitNow QR"
                style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 4 }}
              />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="qrCode" size={26} color="rgba(255,255,255,0.80)" strokeWidth={1.6} />
              </div>
            )}
          </div>
        </div>

        {/* Bill inputs */}
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: '16px',
            border: '0.5px solid rgba(91,71,168,0.10)',
            boxShadow: '0 2px 12px rgba(60,40,140,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6B6584', letterSpacing: 0.2, display: 'block', marginBottom: 6 }}>
              TOTAL BILL (OPTIONAL)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9B95B0', pointerEvents: 'none' }}>
                RM
              </span>
              <input
                style={{ ...inputStyle, paddingLeft: 36 }}
                placeholder="0.00"
                value={totalStr}
                onChange={(e) => setTotalStr(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6B6584', letterSpacing: 0.2, display: 'block', marginBottom: 6 }}>
              NOTE (OPTIONAL)
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Dinner at Nasi Kandar"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Split toggle */}
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            border: '0.5px solid rgba(91,71,168,0.10)',
            boxShadow: '0 2px 12px rgba(60,40,140,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Toggle row */}
          <button
            type="button"
            onClick={() => setSplitEnabled((v) => !v)}
            style={{
              width: '100%',
              background: 'none',
              border: 0,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div className="flex items-center" style={{ gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: splitEnabled ? GRAD_TEAL : '#F5F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="splitBill" size={18} color={splitEnabled ? '#fff' : '#6E4CE6'} strokeWidth={2} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1530', letterSpacing: -0.2 }}>
                  Split Bill
                </div>
                <div style={{ fontSize: 11, color: '#6B6584', marginTop: 1 }}>
                  {splitEnabled ? `Splitting between ${personCount} people` : 'Tap to split between people'}
                </div>
              </div>
            </div>
            {/* Toggle pill */}
            <div
              style={{
                width: 46,
                height: 26,
                borderRadius: 13,
                background: splitEnabled ? '#6E4CE6' : '#E5E0F0',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 3,
                  left: splitEnabled ? 23 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                  transition: 'left 0.2s',
                }}
              />
            </div>
          </button>

          {/* Split panel */}
          {splitEnabled && (
            <div style={{ borderTop: '0.5px solid rgba(91,71,168,0.08)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Person count stepper */}
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1530' }}>Number of people</span>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => changeCount(-1)}
                    disabled={personCount <= 2}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: personCount <= 2 ? '#F0EDF8' : '#6E4CE6',
                      border: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: personCount <= 2 ? 'default' : 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={personCount <= 2 ? '#C4BDD8' : '#fff'} strokeWidth={2.5} strokeLinecap="round">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1A1530', minWidth: 24, textAlign: 'center' }}>
                    {personCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeCount(1)}
                    disabled={personCount >= 10}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: personCount >= 10 ? '#F0EDF8' : '#6E4CE6',
                      border: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: personCount >= 10 ? 'default' : 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={personCount >= 10 ? '#C4BDD8' : '#fff'} strokeWidth={2.5} strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Participant rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {participants.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: p.paid ? 'rgba(31,181,115,0.06)' : '#FDFCFF',
                      borderRadius: 12,
                      padding: '10px 12px',
                      border: `0.5px solid ${p.paid ? 'rgba(31,181,115,0.20)' : 'rgba(91,71,168,0.10)'}`,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: p.paid ? 'rgba(31,181,115,0.15)' : GRAD_HERO,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color: p.paid ? '#1FB573' : '#fff',
                      }}
                    >
                      {p.paid ? <Icon name="check" size={14} color="#1FB573" strokeWidth={2.5} /> : p.id}
                    </div>

                    {/* Name (editable) */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingId === p.id ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => commitName(p.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitName(p.id); }}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#1A1530',
                            background: 'none',
                            border: 0,
                            borderBottom: '1.5px solid #6E4CE6',
                            outline: 'none',
                            width: '100%',
                            padding: '0 0 2px',
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditName(p)}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: p.paid ? '#1FB573' : '#1A1530',
                            background: 'none',
                            border: 0,
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            textDecoration: p.paid ? 'line-through' : 'none',
                            opacity: p.paid ? 0.7 : 1,
                          }}
                        >
                          {p.name}
                          <span style={{ marginLeft: 4, display: 'inline-flex' }}><Icon name="moreV" size={10} color="#9B95B0" /></span>
                        </button>
                      )}
                      {total > 0 && (
                        <div style={{ fontSize: 11, color: '#6B6584', marginTop: 1 }}>
                          {formatRm(p.amount)}
                        </div>
                      )}
                    </div>

                    {/* Paid toggle */}
                    <button
                      type="button"
                      onClick={() => togglePaid(p.id)}
                      title={p.paid ? 'Mark unpaid' : 'Mark paid'}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: p.paid ? 'rgba(31,181,115,0.12)' : '#F0EDF8',
                        border: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="check" size={13} color={p.paid ? '#1FB573' : '#C4BDD8'} strokeWidth={2.5} />
                    </button>

                    {/* WhatsApp share */}
                    <button
                      type="button"
                      onClick={() => shareToWhatsApp(p)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: shareSuccess === p.id ? 'rgba(37,211,102,0.15)' : '#25D166',
                        border: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(37,209,102,0.30)',
                      }}
                    >
                      {shareSuccess === p.id ? (
                        <Icon name="check" size={16} color="#25D166" strokeWidth={2.5} />
                      ) : (
                        <WhatsAppIcon />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Share All */}
              <button
                type="button"
                onClick={shareAll}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: 12,
                  background: '#25D166',
                  border: 0,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: -0.2,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(37,209,102,0.32)',
                }}
              >
                <WhatsAppIcon size={18} />
                Share Summary to WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp Icon (inline SVG — no extra dep) ───────────────────────────────

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.057 23.997l6.305-1.654A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.85 0-3.579-.504-5.065-1.381l-.363-.215-3.741.981.998-3.648-.236-.374A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

type View = 'setup' | 'main' | 'edit';

type LocationState = {
  prefillAmount?: number;
  prefillNote?: string;
} | null;

export default function FinSplit() {
  const navigate = useNavigate();
  const location = useLocation();
  const locState = (location.state as LocationState) ?? null;

  const [config, setConfig] = useState<FinSplitConfig | null>(() => getFinSplitConfig());
  const [view, setView] = useState<View>(() => (getFinSplitConfig()?.setupCompleted ? 'main' : 'setup'));

  function handleSetupComplete(c: FinSplitConfig) {
    setConfig(c);
    setView('main');
  }

  function handleEditSave(c: FinSplitConfig) {
    setConfig(c);
    setView('main');
  }

  if (view === 'setup') {
    return (
      <SetupForm
        initial={null}
        onComplete={handleSetupComplete}
        onCancel={config ? () => setView('main') : () => navigate(-1)}
      />
    );
  }

  if (view === 'edit' && config) {
    return (
      <SetupForm
        initial={config}
        onComplete={handleEditSave}
        onCancel={() => setView('main')}
      />
    );
  }

  if (view === 'main' && config) {
    return (
      <MainView
        config={config}
        onEdit={() => setView('edit')}
        onBack={() => navigate(-1)}
        prefillAmount={locState?.prefillAmount}
        prefillNote={locState?.prefillNote}
      />
    );
  }

  return null;
}
