/**
 * Commitments query — CRUD for user-managed recurring payment obligations
 * backed by the `commitments` Supabase table (migrations 20260506000000 and
 * 20260506000001).
 *
 * Each commitment tracks a recurring obligation (subscription, invoice,
 * direct debit, or manual payment) optionally attached to a payment source.
 * `notify_enabled` controls whether a web-push reminder is sent 1 day before
 * the `due_day`. RLS enforces user ownership on all operations.
 */
import { supabase } from '@/lib/supabase/client';
import type { Commitment } from '@/mocks/seed';

export type CommitmentRow = {
  id: string;
  user_id: string;
  source_id: string | null;
  name: string;
  amount: string | number;
  due_day: number | null;
  commitment_type: 'manual' | 'invoice' | 'direct_debit' | 'subscription';
  is_active: boolean;
  notify_enabled: boolean;
  notes: string | null;
  created_at: string;
  payment_sources: { name: string } | null;
};

function shapeCommitment(row: CommitmentRow): Commitment {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    due_day: row.due_day,
    commitment_type: row.commitment_type,
    is_active: row.is_active,
    notify_enabled: row.notify_enabled,
    source_id: row.source_id,
    source_name: row.payment_sources?.name ?? null,
    notes: row.notes,
  };
}

export async function fetchCommitments(userId: string): Promise<Commitment[]> {
  const { data, error } = await supabase
    .from('commitments')
    .select('*, payment_sources(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as CommitmentRow[]).map(shapeCommitment);
}

export type AddCommitmentInput = {
  name: string;
  amount: number;
  due_day: number | null;
  commitment_type: Commitment['commitment_type'];
  source_id: string | null;
  notes: string | null;
  notify_enabled?: boolean;
};

export async function addCommitment(
  userId: string,
  input: AddCommitmentInput,
): Promise<void> {
  const { error } = await supabase.from('commitments').insert({
    user_id: userId,
    name: input.name.trim(),
    amount: input.amount,
    due_day: input.due_day,
    commitment_type: input.commitment_type,
    source_id: input.source_id || null,
    notes: input.notes?.trim() || null,
    notify_enabled: input.notify_enabled ?? true,
  });
  if (error) throw new Error(error.message);
}

export type EditCommitmentInput = Partial<Omit<AddCommitmentInput, 'source_id'>> & {
  source_id?: string | null;
  is_active?: boolean;
};

export async function editCommitment(
  id: string,
  input: EditCommitmentInput,
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.due_day !== undefined) patch.due_day = input.due_day;
  if (input.commitment_type !== undefined) patch.commitment_type = input.commitment_type;
  if (input.source_id !== undefined) patch.source_id = input.source_id || null;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.is_active !== undefined) patch.is_active = input.is_active;
  if (input.notify_enabled !== undefined) patch.notify_enabled = input.notify_enabled;

  const { error } = await supabase.from('commitments').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleCommitment(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('commitments')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleNotifyCommitment(
  id: string,
  notifyEnabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('commitments')
    .update({ notify_enabled: notifyEnabled })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCommitment(id: string): Promise<void> {
  const { error } = await supabase.from('commitments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
