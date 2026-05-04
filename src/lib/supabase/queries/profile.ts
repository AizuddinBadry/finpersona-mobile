/**
 * Profile queries — read and write the small slice of the `profiles` row the
 * Settings screen (T13) cares about today: id, full_name, and advisor_persona.
 *
 * RLS already scopes the profiles table to the authenticated user
 * (auth.uid() = id), but every call here also passes a redundant
 * `.eq('id', userId)` filter as defense-in-depth: a token leak that somehow
 * bypassed RLS would still need to know the victim's user id to read or
 * mutate their row.
 *
 * Other profile fields (avatar, locale, onboarding flags, etc.) are out of
 * scope for this phase — Settings only reads these three columns and only
 * writes `advisor_persona`. The row type is re-exported from `home.ts` so
 * the Home dashboard and Settings screen share a single ProfileRow shape.
 */
import { supabase } from '@/lib/supabase/client';
import type { ProfileRow } from './home';

export type { ProfileRow };

export type AdvisorPersona = 'analyst' | 'coach' | 'witty';

export async function fetchProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, advisor_persona, full_name')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as ProfileRow;
}

export async function updateProfilePersona(args: {
  userId: string;
  persona: AdvisorPersona;
}): Promise<ProfileRow> {
  const { userId, persona } = args;
  const { data, error } = await supabase
    .from('profiles')
    .update({ advisor_persona: persona })
    .eq('id', userId)
    .select('id, advisor_persona, full_name')
    .single();
  if (error) throw error;
  return data as ProfileRow;
}
