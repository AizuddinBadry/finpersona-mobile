/**
 * Cards — Sources screen with full CRUD wiring.
 *
 * Card stack (tap any card → edit sheet), quick actions for Transfer / Add
 * Money / New Source / Edit, and a Commitments section that replaces the
 * former static auto-deduct rules. All mutations call Supabase directly via
 * the user's anon-key session; RLS enforces ownership.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { useCards } from '@/hooks/useCards';
import { useCommitments } from '@/hooks/useCommitments';
import { useAuth } from '@/hooks/useAuth';
import { cardsMock, commitmentsMock } from '@/mocks/seed';
import type { Commitment } from '@/mocks/seed';
import {
  addSource,
  editSource,
  setPrimarySource,
  addMoneyToSource,
  transferBetweenSources,
} from '@/lib/supabase/queries/cards';
import {
  addCommitment,
  editCommitment,
  toggleCommitment,
  toggleNotifyCommitment,
  deleteCommitment,
} from '@/lib/supabase/queries/commitments';
import {
  getPermission,
  requestAndSubscribe,
} from '@/lib/notifications';

const GRAD_GLOW =
  'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)';
const GRAD_HERO = 'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';

const COLOR_PRESETS = [
  { hex: '#5837C9', grad: 'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)' },
  { hex: '#1A1530', grad: 'linear-gradient(140deg, #1A1530 0%, #3A3458 100%)' },
  { hex: '#1FB573', grad: 'linear-gradient(140deg, #1FB573 0%, #4DD7A0 100%)' },
  { hex: '#1E80B5', grad: 'linear-gradient(140deg, #1E80B5 0%, #4DA6D8 100%)' },
  { hex: '#B57415', grad: 'linear-gradient(140deg, #B57415 0%, #E89B2A 100%)' },
  { hex: '#D63440', grad: 'linear-gradient(140deg, #D63440 0%, #F06070 100%)' },
];

const SOURCE_TYPES = [
  { value: 'bank', label: 'Bank' },
  { value: 'ewallet', label: 'e-Wallet' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
];

const COMMITMENT_TYPES: { value: Commitment['commitment_type']; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'direct_debit', label: 'Direct Debit' },
  { value: 'subscription', label: 'Subscription' },
];

const TYPE_BADGE: Record<Commitment['commitment_type'], { bg: string; color: string }> = {
  manual: { bg: '#F0EEF8', color: '#7A7392' },
  invoice: { bg: '#E8F4FB', color: '#1E80B5' },
  direct_debit: { bg: '#FDF4E3', color: '#B57415' },
  subscription: { bg: '#F1ECFB', color: '#6E4CE6' },
};

function ordinal(n: number) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function colorFromGradient(grad: string): string {
  const m = grad.match(/#[0-9A-Fa-f]{6}/);
  return m ? m[0] : COLOR_PRESETS[0]!.hex;
}

type SheetType =
  | 'add-source'
  | 'edit-source'
  | 'transfer'
  | 'add-money'
  | 'add-commitment'
  | 'edit-commitment';

type CommitmentForm = {
  name: string;
  amount: string;
  due_day: string;
  commitment_type: Commitment['commitment_type'];
  source_id: string;
  notes: string;
  is_active: boolean;
  notify_enabled: boolean;
};

const EMPTY_CF: CommitmentForm = {
  name: '',
  amount: '',
  due_day: '',
  commitment_type: 'subscription',
  source_id: '',
  notes: '',
  is_active: true,
  notify_enabled: true,
};

const inputCls: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(91,71,168,0.20)',
  fontSize: 14,
  background: '#F8F7FC',
  outline: 'none',
  color: '#1A1530',
  boxSizing: 'border-box',
};

const labelCls: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#7A7392',
  letterSpacing: 0.3,
  textTransform: 'uppercase',
  marginBottom: 4,
};

export default function Cards() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = cardsMock } = useCards();
  const { data: commitments = commitmentsMock } = useCommitments();
  const { cards } = data;

  const [sheet, setSheet] = useState<SheetType | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addSrcF, setAddSrcF] = useState({
    name: '',
    source_type: 'bank',
    color: COLOR_PRESETS[0]!.hex,
    initial_balance: '',
  });
  const [editSrcF, setEditSrcF] = useState({ name: '', color: COLOR_PRESETS[0]!.hex });
  const [transferF, setTransferF] = useState({ fromId: '', toId: '', amount: '' });
  const [addMoneyF, setAddMoneyF] = useState({ sourceId: '', amount: '', description: '' });
  const [commitF, setCommitF] = useState<CommitmentForm>(EMPTY_CF);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const primaryCard = cards[0];

  function openSheet(
    type: SheetType,
    opts?: { sourceId?: string; commitmentId?: string },
  ) {
    setErr(null);
    const srcId = opts?.sourceId;
    const cmId = opts?.commitmentId;
    if (srcId) setSelectedSourceId(srcId);
    if (cmId) setSelectedCommitmentId(cmId);

    if (type === 'edit-source') {
      const card = cards.find((c) => c.id === (srcId ?? selectedSourceId));
      if (card) setEditSrcF({ name: card.name, color: colorFromGradient(card.gradient) });
    }
    if (type === 'transfer') {
      setTransferF({ fromId: primaryCard?.id ?? '', toId: '', amount: '' });
    }
    if (type === 'add-money') {
      setAddMoneyF({ sourceId: srcId ?? primaryCard?.id ?? '', amount: '', description: '' });
    }
    if (type === 'add-commitment') {
      setCommitF(EMPTY_CF);
    }
    if (type === 'edit-commitment') {
      const cm = commitments.find((c) => c.id === cmId);
      if (cm) {
        setCommitF({
          name: cm.name,
          amount: String(cm.amount),
          due_day: cm.due_day != null ? String(cm.due_day) : '',
          commitment_type: cm.commitment_type,
          source_id: cm.source_id ?? '',
          notes: cm.notes ?? '',
          is_active: cm.is_active,
          notify_enabled: cm.notify_enabled,
        });
      }
    }
    setSheet(type);
  }

  function closeSheet() {
    if (busy) return;
    setSheet(null);
    setErr(null);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      setSheet(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddSource() {
    if (!user || !addSrcF.name.trim()) return;
    await run(async () => {
      await addSource(user.id, {
        name: addSrcF.name,
        source_type: addSrcF.source_type,
        color: addSrcF.color,
        initial_balance: parseFloat(addSrcF.initial_balance) || 0,
      });
      await qc.invalidateQueries({ queryKey: ['cards', user.id] });
      setAddSrcF({ name: '', source_type: 'bank', color: COLOR_PRESETS[0]!.hex, initial_balance: '' });
    });
  }

  async function handleEditSource() {
    if (!user || !selectedSourceId || !editSrcF.name.trim()) return;
    await run(async () => {
      await editSource(selectedSourceId, { name: editSrcF.name, color: editSrcF.color });
      await qc.invalidateQueries({ queryKey: ['cards', user.id] });
    });
  }

  async function handleSetPrimary() {
    if (!user || !selectedSourceId) return;
    await run(async () => {
      await setPrimarySource(user.id, selectedSourceId);
      await qc.invalidateQueries({ queryKey: ['cards', user.id] });
    });
  }

  async function handleTransfer() {
    const amount = parseFloat(transferF.amount);
    if (!transferF.fromId || !transferF.toId || !amount || amount <= 0) {
      setErr('Choose both sources and enter a valid amount.');
      return;
    }
    await run(async () => {
      await transferBetweenSources(transferF.fromId, transferF.toId, amount);
      await qc.invalidateQueries({ queryKey: ['cards', user?.id] });
    });
  }

  async function handleAddMoney() {
    const amount = parseFloat(addMoneyF.amount);
    if (!addMoneyF.sourceId || !amount || amount <= 0) {
      setErr('Choose a source and enter a valid amount.');
      return;
    }
    await run(async () => {
      await addMoneyToSource(addMoneyF.sourceId, amount, addMoneyF.description || undefined);
      await qc.invalidateQueries({ queryKey: ['cards', user?.id] });
    });
  }

  async function handleSaveCommitment(isEdit: boolean) {
    const amount = parseFloat(commitF.amount);
    if (!user || !commitF.name.trim() || !amount || amount <= 0) {
      setErr('Name and a valid amount are required.');
      return;
    }
    const payload = {
      name: commitF.name,
      amount,
      due_day: commitF.due_day ? parseInt(commitF.due_day, 10) : null,
      commitment_type: commitF.commitment_type,
      source_id: commitF.source_id || null,
      notes: commitF.notes || null,
      notify_enabled: commitF.notify_enabled,
    };
    await run(async () => {
      if (isEdit && selectedCommitmentId) {
        await editCommitment(selectedCommitmentId, { ...payload, is_active: commitF.is_active });
      } else {
        await addCommitment(user.id, payload);
      }
      await qc.invalidateQueries({ queryKey: ['commitments', user.id] });
    });
  }

  async function handleDeleteCommitment() {
    if (!selectedCommitmentId) return;
    await run(async () => {
      await deleteCommitment(selectedCommitmentId);
      await qc.invalidateQueries({ queryKey: ['commitments', user?.id] });
    });
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await toggleCommitment(id, !current);
      await qc.invalidateQueries({ queryKey: ['commitments', user?.id] });
    } catch {
      // silent — toggle is non-critical
    }
  }

  async function handleToggleNotify(id: string, current: boolean) {
    const next = !current;
    // When enabling, request push permission and subscribe if needed.
    if (next && user) {
      const perm = getPermission();
      if (perm !== 'granted') {
        await requestAndSubscribe(user.id);
      }
    }
    try {
      await toggleNotifyCommitment(id, next);
      await qc.invalidateQueries({ queryKey: ['commitments', user?.id] });
    } catch {
      // silent — notify toggle is non-critical
    }
  }

  function renderSheet() {
    if (sheet === 'add-source' || sheet === 'edit-source') {
      const isEdit = sheet === 'edit-source';
      const form = isEdit ? editSrcF : addSrcF;
      const setColor = (hex: string) =>
        isEdit ? setEditSrcF((f) => ({ ...f, color: hex })) : setAddSrcF((f) => ({ ...f, color: hex }));
      const isAlreadyPrimary = isEdit
        ? cards.find((c) => c.id === selectedSourceId)?.primary
        : false;

      return (
        <>
          <div className="font-bold text-ink" style={{ fontSize: 17, letterSpacing: -0.3, marginBottom: 20 }}>
            {isEdit ? 'Edit Source' : 'New Source'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelCls}>Name</label>
              <input
                style={inputCls}
                placeholder="e.g. Maybank Savings"
                value={form.name}
                onChange={(e) =>
                  isEdit
                    ? setEditSrcF((f) => ({ ...f, name: e.target.value }))
                    : setAddSrcF((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            {!isEdit && (
              <div>
                <label style={labelCls}>Type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SOURCE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAddSrcF((f) => ({ ...f, source_type: t.value }))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor:
                          addSrcF.source_type === t.value ? '#6E4CE6' : 'rgba(91,71,168,0.20)',
                        background: addSrcF.source_type === t.value ? '#F1ECFB' : '#fff',
                        color: addSrcF.source_type === t.value ? '#6E4CE6' : '#7A7392',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label style={labelCls}>Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setColor(p.hex)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      background: p.grad,
                      border: form.color === p.hex ? '2.5px solid #fff' : '2.5px solid transparent',
                      outline: form.color === p.hex ? '2px solid #6E4CE6' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
            {!isEdit && (
              <div>
                <label style={labelCls}>Opening Balance (RM)</label>
                <input
                  style={inputCls}
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={addSrcF.initial_balance}
                  onChange={(e) => setAddSrcF((f) => ({ ...f, initial_balance: e.target.value }))}
                />
              </div>
            )}
            {isEdit && !isAlreadyPrimary && (
              <button
                type="button"
                onClick={handleSetPrimary}
                disabled={busy}
                style={{
                  padding: '10px',
                  borderRadius: 10,
                  border: '1px solid rgba(91,71,168,0.20)',
                  background: '#F8F7FC',
                  color: '#6E4CE6',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Set as Primary Source
              </button>
            )}
            {isEdit && (
              <button
                type="button"
                onClick={() => openSheet('add-money', { sourceId: selectedSourceId ?? undefined })}
                disabled={busy}
                style={{
                  padding: '10px',
                  borderRadius: 10,
                  border: '1px solid rgba(91,71,168,0.20)',
                  background: '#F8F7FC',
                  color: '#3A3458',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add Money to this source
              </button>
            )}
          </div>
          {err && <div style={{ color: '#D63440', fontSize: 12, marginTop: 10 }}>{err}</div>}
          <button
            type="button"
            onClick={isEdit ? handleEditSource : handleAddSource}
            disabled={busy || !form.name.trim()}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '13px',
              borderRadius: 12,
              background: GRAD_HERO,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: busy || !form.name.trim() ? 'not-allowed' : 'pointer',
              opacity: busy || !form.name.trim() ? 0.6 : 1,
            }}
          >
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Source'}
          </button>
        </>
      );
    }

    if (sheet === 'transfer') {
      const canSubmit = !!transferF.fromId && !!transferF.toId && !!transferF.amount;
      return (
        <>
          <div className="font-bold text-ink" style={{ fontSize: 17, letterSpacing: -0.3, marginBottom: 20 }}>
            Transfer
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(['From', 'To'] as const).map((label) => {
              const key = label === 'From' ? 'fromId' : 'toId';
              const otherId = label === 'From' ? transferF.toId : transferF.fromId;
              return (
                <div key={label}>
                  <label style={labelCls}>{label}</label>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                    {cards
                      .filter((c) => c.id !== otherId)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTransferF((f) => ({ ...f, [key]: c.id }))}
                          style={{
                            flexShrink: 0,
                            padding: '8px 12px',
                            borderRadius: 10,
                            border: '1.5px solid',
                            borderColor:
                              transferF[key] === c.id ? '#6E4CE6' : 'rgba(91,71,168,0.20)',
                            background: transferF[key] === c.id ? '#F1ECFB' : '#fff',
                            color: '#1A1530',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left' as const,
                          }}
                        >
                          <div>{c.name}</div>
                          <div style={{ color: '#7A7392', fontSize: 11, marginTop: 2 }}>
                            RM {c.amount}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
            <div>
              <label style={labelCls}>Amount (RM)</label>
              <input
                style={inputCls}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={transferF.amount}
                onChange={(e) => setTransferF((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            {transferF.fromId && transferF.toId && transferF.amount && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#F8F7FC',
                  fontSize: 12,
                  color: '#7A7392',
                }}
              >
                {cards.find((c) => c.id === transferF.fromId)?.name} →{' '}
                {cards.find((c) => c.id === transferF.toId)?.name} · RM{' '}
                {parseFloat(transferF.amount).toFixed(2)}
              </div>
            )}
          </div>
          {err && <div style={{ color: '#D63440', fontSize: 12, marginTop: 10 }}>{err}</div>}
          <button
            type="button"
            onClick={handleTransfer}
            disabled={busy || !canSubmit}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '13px',
              borderRadius: 12,
              background: GRAD_HERO,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: busy || !canSubmit ? 'not-allowed' : 'pointer',
              opacity: busy || !canSubmit ? 0.6 : 1,
            }}
          >
            {busy ? 'Transferring…' : 'Transfer'}
          </button>
        </>
      );
    }

    if (sheet === 'add-money') {
      const canSubmit = !!addMoneyF.sourceId && !!addMoneyF.amount;
      return (
        <>
          <div className="font-bold text-ink" style={{ fontSize: 17, letterSpacing: -0.3, marginBottom: 20 }}>
            Add Money
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelCls}>Source</label>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setAddMoneyF((f) => ({ ...f, sourceId: c.id }))}
                    style={{
                      flexShrink: 0,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1.5px solid',
                      borderColor:
                        addMoneyF.sourceId === c.id ? '#6E4CE6' : 'rgba(91,71,168,0.20)',
                      background: addMoneyF.sourceId === c.id ? '#F1ECFB' : '#fff',
                      color: '#1A1530',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                    }}
                  >
                    <div>{c.name}</div>
                    <div style={{ color: '#7A7392', fontSize: 11, marginTop: 2 }}>RM {c.amount}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelCls}>Amount (RM)</label>
              <input
                style={inputCls}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={addMoneyF.amount}
                onChange={(e) => setAddMoneyF((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelCls}>Description (optional)</label>
              <input
                style={inputCls}
                placeholder="e.g. Salary, top-up…"
                value={addMoneyF.description}
                onChange={(e) => setAddMoneyF((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          {err && <div style={{ color: '#D63440', fontSize: 12, marginTop: 10 }}>{err}</div>}
          <button
            type="button"
            onClick={handleAddMoney}
            disabled={busy || !canSubmit}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '13px',
              borderRadius: 12,
              background: GRAD_HERO,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: busy || !canSubmit ? 'not-allowed' : 'pointer',
              opacity: busy || !canSubmit ? 0.6 : 1,
            }}
          >
            {busy ? 'Adding…' : 'Add Money'}
          </button>
        </>
      );
    }

    if (sheet === 'add-commitment' || sheet === 'edit-commitment') {
      const isEdit = sheet === 'edit-commitment';
      const canSubmit = !!commitF.name.trim() && !!commitF.amount;
      return (
        <>
          <div className="font-bold text-ink" style={{ fontSize: 17, letterSpacing: -0.3, marginBottom: 20 }}>
            {isEdit ? 'Edit Commitment' : 'New Commitment'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelCls}>Name</label>
              <input
                style={inputCls}
                placeholder="e.g. Netflix, Astro, Gym…"
                value={commitF.name}
                onChange={(e) => setCommitF((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelCls}>Amount (RM)</label>
              <input
                style={inputCls}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={commitF.amount}
                onChange={(e) => setCommitF((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelCls}>Due Day (1–31)</label>
              <input
                style={inputCls}
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                placeholder="e.g. 15"
                value={commitF.due_day}
                onChange={(e) => setCommitF((f) => ({ ...f, due_day: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelCls}>Type</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COMMITMENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCommitF((f) => ({ ...f, commitment_type: t.value }))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor:
                        commitF.commitment_type === t.value ? '#6E4CE6' : 'rgba(91,71,168,0.20)',
                      background: commitF.commitment_type === t.value ? '#F1ECFB' : '#fff',
                      color: commitF.commitment_type === t.value ? '#6E4CE6' : '#7A7392',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelCls}>Linked Source (optional)</label>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => setCommitF((f) => ({ ...f, source_id: '' }))}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: !commitF.source_id ? '#6E4CE6' : 'rgba(91,71,168,0.20)',
                    background: !commitF.source_id ? '#F1ECFB' : '#fff',
                    color: !commitF.source_id ? '#6E4CE6' : '#7A7392',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  None
                </button>
                {cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCommitF((f) => ({ ...f, source_id: c.id }))}
                    style={{
                      flexShrink: 0,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor:
                        commitF.source_id === c.id ? '#6E4CE6' : 'rgba(91,71,168,0.20)',
                      background: commitF.source_id === c.id ? '#F1ECFB' : '#fff',
                      color: commitF.source_id === c.id ? '#6E4CE6' : '#7A7392',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelCls}>Notes (optional)</label>
              <input
                style={inputCls}
                placeholder="Any notes…"
                value={commitF.notes}
                onChange={(e) => setCommitF((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {/* Reminder notification toggle */}
            <div
              className="flex items-center justify-between"
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: '#F8F7FC',
                border: '1px solid rgba(91,71,168,0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon
                  name="bell"
                  size={18}
                  color={commitF.notify_enabled ? '#6E4CE6' : '#C5C2D6'}
                />
                <div>
                  <div className="font-semibold text-ink" style={{ fontSize: 13 }}>
                    Remind me 1 day before
                  </div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                    Push notification on due day − 1
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={commitF.notify_enabled}
                aria-label="Reminder notification"
                onClick={() => setCommitF((f) => ({ ...f, notify_enabled: !f.notify_enabled }))}
                style={{
                  width: 36,
                  height: 22,
                  borderRadius: 11,
                  background: commitF.notify_enabled ? '#6E4CE6' : '#D5D2E0',
                  position: 'relative',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: commitF.notify_enabled ? 16 : 2,
                    top: 2,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.15s',
                  }}
                />
              </button>
            </div>
          </div>
          {err && <div style={{ color: '#D63440', fontSize: 12, marginTop: 10 }}>{err}</div>}
          <button
            type="button"
            onClick={() => handleSaveCommitment(isEdit)}
            disabled={busy || !canSubmit}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '13px',
              borderRadius: 12,
              background: GRAD_HERO,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: busy || !canSubmit ? 'not-allowed' : 'pointer',
              opacity: busy || !canSubmit ? 0.6 : 1,
            }}
          >
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Commitment'}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={handleDeleteCommitment}
              disabled={busy}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '13px',
                borderRadius: 12,
                background: '#FEF0F0',
                color: '#D63440',
                fontSize: 14,
                fontWeight: 700,
                border: '1px solid #FCCACA',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Delete Commitment
            </button>
          )}
        </>
      );
    }

    return null;
  }

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '4px 20px 8px' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-ink" style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
            Sources
          </h1>
          <button
            type="button"
            aria-label="Add source"
            onClick={() => {
              setAddSrcF({ name: '', source_type: 'bank', color: COLOR_PRESETS[0]!.hex, initial_balance: '' });
              openSheet('add-source');
            }}
            className="flex items-center justify-center bg-surface shadow-card"
            style={{ width: 36, height: 36, borderRadius: 18, border: '0.5px solid rgba(91,71,168,0.10)' }}
          >
            <Icon name="plus" size={18} color="#39314F" />
          </button>
        </div>
        <div className="font-medium text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          {cards.length} {cards.length === 1 ? 'source' : 'sources'} linked
        </div>
      </div>

      {/* Primary card */}
      {primaryCard && (
        <div style={{ padding: '0 20px' }}>
          <button
            type="button"
            onClick={() => openSheet('edit-source', { sourceId: primaryCard.id })}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 22,
              padding: '20px 22px',
              height: 200,
              marginBottom: 14,
              background: primaryCard.gradient,
              color: '#fff',
              boxShadow: '0 18px 40px rgba(91,71,168,0.32)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div
              aria-hidden
              style={{ position: 'absolute', inset: 0, background: GRAD_GLOW, pointerEvents: 'none' }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                right: -30,
                top: -30,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
              }}
            />
            <div className="flex items-center justify-between" style={{ position: 'relative' }}>
              <div>
                <div
                  className="font-semibold"
                  style={{ fontSize: 11, opacity: 0.8, letterSpacing: 0.5, textTransform: 'uppercase' }}
                >
                  {primaryCard.flag} {primaryCard.name}
                </div>
                <div
                  className="font-mono font-semibold"
                  style={{ fontSize: 13, opacity: 0.65, marginTop: 2, letterSpacing: 0.4 }}
                >
                  •• {primaryCard.last4}
                </div>
              </div>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.18)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  backdropFilter: 'blur(8px)',
                }}
              >
                PRIMARY
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <div
                style={{ fontSize: 11, opacity: 0.75, fontWeight: 500, letterSpacing: 0.3, marginBottom: 4 }}
              >
                Available balance
              </div>
              <div className="flex items-baseline" style={{ gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>RM</span>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    letterSpacing: -0.8,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {primaryCard.amount}
                </span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Non-primary cards — horizontal scroll strip */}
      {cards.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '0 20px 4px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {cards.slice(1).map((c) => {
            const isExpanded = expandedIds.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleExpanded(c.id)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 20,
                  flexShrink: 0,
                  width: isExpanded ? 240 : 148,
                  height: 140,
                  background: c.gradient,
                  color: '#fff',
                  boxShadow: isExpanded
                    ? '0 14px 32px rgba(60,40,140,0.22)'
                    : '0 8px 20px rgba(60,40,140,0.14)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '16px 18px',
                  transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s ease',
                }}
              >
                <div
                  aria-hidden
                  style={{ position: 'absolute', inset: 0, background: GRAD_GLOW, pointerEvents: 'none' }}
                />
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: -20,
                    top: -20,
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
                  }}
                />
                {/* Name + last4 */}
                <div style={{ position: 'relative' }}>
                  <div
                    className="font-semibold"
                    style={{
                      fontSize: 10,
                      opacity: 0.8,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: isExpanded ? 160 : 100,
                    }}
                  >
                    {c.flag} {c.name}
                  </div>
                  <div
                    className="font-mono font-semibold"
                    style={{ fontSize: 11, opacity: 0.55, marginTop: 2, letterSpacing: 0.4 }}
                  >
                    •• {c.last4}
                  </div>
                </div>
                {/* Balance — bottom */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 18,
                    right: 18,
                  }}
                >
                  <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 500, letterSpacing: 0.3, marginBottom: 3 }}>
                    Balance
                  </div>
                  {isExpanded ? (
                    <div className="flex items-end justify-between">
                      <div className="flex items-baseline" style={{ gap: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{c.currency}</span>
                        <span
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: -0.5,
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                          }}
                        >
                          {c.amount}
                        </span>
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          openSheet('edit-source', { sourceId: c.id });
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            openSheet('edit-source', { sourceId: c.id });
                          }
                        }}
                        style={{
                          padding: '5px 11px',
                          borderRadius: 999,
                          background: 'rgba(255,255,255,0.20)',
                          border: '1px solid rgba(255,255,255,0.25)',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                          cursor: 'pointer',
                          backdropFilter: 'blur(8px)',
                          flexShrink: 0,
                        }}
                      >
                        Edit
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: -0.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.amount}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Quick actions */}
      <div
        style={{ padding: '6px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}
      >
        {(
          [
            {
              id: 'transfer',
              icon: 'transfer' as const,
              label: 'Transfer',
              action: () => openSheet('transfer'),
            },
            {
              id: 'add-money',
              icon: 'plus' as const,
              label: 'Add Money',
              action: () => openSheet('add-money'),
            },
            {
              id: 'new-source',
              icon: 'cards' as const,
              label: 'New Source',
              action: () => {
                setAddSrcF({ name: '', source_type: 'bank', color: COLOR_PRESETS[0]!.hex, initial_balance: '' });
                openSheet('add-source');
              },
            },
            {
              id: 'edit',
              icon: 'settings' as const,
              label: 'Edit',
              action: () => primaryCard && openSheet('edit-source', { sourceId: primaryCard.id }),
            },
          ] as const
        ).map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={q.action}
            className="flex flex-col items-center bg-surface shadow-card"
            style={{ gap: 6, borderRadius: 14, padding: '12px 8px', border: '0.5px solid rgba(91,71,168,0.10)' }}
          >
            <Icon name={q.icon} size={18} color="#6E4CE6" strokeWidth={2} />
            <span className="font-semibold text-ink2" style={{ fontSize: 11 }}>
              {q.label}
            </span>
          </button>
        ))}
      </div>

      {/* Commitments */}
      <div style={{ padding: '20px 16px 0' }}>
        <div className="flex items-center justify-between" style={{ padding: '0 4px', marginBottom: 10 }}>
          <span className="font-bold text-ink" style={{ fontSize: 14, letterSpacing: -0.2 }}>
            Commitments
          </span>
          <button
            type="button"
            onClick={() => openSheet('add-commitment')}
            className="flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              background: '#F1ECFB',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon name="plus" size={13} color="#6E4CE6" />
          </button>
        </div>

        {commitments.length === 0 ? (
          <div
            className="bg-surface shadow-card flex flex-col items-center"
            style={{
              borderRadius: 16,
              border: '0.5px solid rgba(91,71,168,0.10)',
              padding: '28px 16px',
              gap: 8,
            }}
          >
            <Icon name="repeat" size={28} color="#C9BAFB" />
            <div className="text-muted" style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
              No commitments yet.
              <br />
              Add recurring payments to track them here.
            </div>
            <button
              type="button"
              onClick={() => openSheet('add-commitment')}
              style={{
                marginTop: 4,
                padding: '8px 16px',
                borderRadius: 10,
                background: '#F1ECFB',
                color: '#6E4CE6',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Add commitment
            </button>
          </div>
        ) : (
          <div
            className="bg-surface shadow-card"
            style={{ borderRadius: 16, border: '0.5px solid rgba(91,71,168,0.10)', overflow: 'hidden' }}
          >
            {commitments.map((cm, i) => {
              const badge = TYPE_BADGE[cm.commitment_type];
              const typeLabel = COMMITMENT_TYPES.find((t) => t.value === cm.commitment_type)?.label;
              return (
                <div
                  key={cm.id}
                  className="flex items-center"
                  style={{
                    gap: 12,
                    padding: '12px 14px',
                    borderBottom:
                      i < commitments.length - 1 ? '0.5px solid rgba(91,71,168,0.08)' : 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openSheet('edit-commitment', { commitmentId: cm.id })}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div className="flex items-center" style={{ gap: 6, marginBottom: 2 }}>
                      <span
                        className="font-semibold text-ink"
                        style={{ fontSize: 13, letterSpacing: -0.1 }}
                      >
                        {cm.name}
                      </span>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: badge.bg,
                          color: badge.color,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {typeLabel}
                      </span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      RM {cm.amount.toFixed(2)}
                      {cm.due_day != null ? ` · ${ordinal(cm.due_day)} of month` : ''}
                      {cm.source_name ? ` · ${cm.source_name}` : ''}
                    </div>
                  </button>
                  {/* Notification bell */}
                  <button
                    type="button"
                    aria-label={`${cm.name} reminder ${cm.notify_enabled ? 'on' : 'off'}`}
                    onClick={() => handleToggleNotify(cm.id, cm.notify_enabled)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Icon
                      name="bell"
                      size={16}
                      color={cm.notify_enabled ? '#6E4CE6' : '#C5C2D6'}
                    />
                  </button>
                  {/* Active toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={cm.is_active}
                    aria-label={`${cm.name} commitment`}
                    onClick={() => handleToggle(cm.id, cm.is_active)}
                    style={{
                      width: 36,
                      height: 22,
                      borderRadius: 11,
                      background: cm.is_active ? '#6E4CE6' : '#D5D2E0',
                      position: 'relative',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: cm.is_active ? 16 : 2,
                        top: 2,
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'left 0.15s',
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sheet overlay */}
      {sheet && (
        <>
          <div
            onClick={closeSheet}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', zIndex: 110 }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 120,
              borderRadius: '20px 20px 0 0',
              background: '#fff',
              padding: '20px 20px 40px',
              maxHeight: '84vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: '#E0DBF0',
                margin: '0 auto 16px',
              }}
            />
            <button
              type="button"
              onClick={closeSheet}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: '#F0EEF8',
                border: 'none',
                borderRadius: 16,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="close" size={14} color="#7A7392" />
            </button>
            {renderSheet()}
          </div>
        </>
      )}
    </div>
  );
}
