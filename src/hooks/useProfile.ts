/**
 * useProfile / useUpdatePersona — react-query hooks backing the Settings
 * screen's persona switcher (T13). They wrap the bare query functions in
 * `src/lib/supabase/queries/profile.ts` so the screen never has to know
 * about supabase, userIds, or which other caches to invalidate.
 *
 *   useProfile         read the profile row (gated on auth)
 *   useUpdatePersona   write `advisor_persona` optimistically so the UI
 *                      flips instantly when the user picks a persona;
 *                      rolls back on failure, and on success invalidates
 *                      ['advisor', uid] because the persona drives the
 *                      advisor's suggestion chips and tone
 *
 * The optional `deps` arg follows the useAdvisorSend / useReceipt
 * convention: tests inject stubbed query functions and never have to
 * re-mock the supabase client per hook.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchProfile as defaultFetchProfile,
  updateProfilePersona as defaultUpdateProfilePersona,
  type AdvisorPersona,
  type ProfileRow,
} from '@/lib/supabase/queries/profile';

type UseProfileDeps = {
  fetchProfile?: typeof defaultFetchProfile;
};

type UseUpdatePersonaDeps = {
  updateProfilePersona?: typeof defaultUpdateProfilePersona;
};

type UpdatePersonaContext = {
  previous: ProfileRow | undefined;
};

export function useProfile(deps: UseProfileDeps = {}) {
  const { fetchProfile = defaultFetchProfile } = deps;
  const { user } = useAuth();

  return useQuery<ProfileRow>({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user),
  });
}

export function useUpdatePersona(deps: UseUpdatePersonaDeps = {}) {
  const { updateProfilePersona = defaultUpdateProfilePersona } = deps;
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation<ProfileRow, Error, AdvisorPersona, UpdatePersonaContext>({
    mutationFn: (persona) =>
      updateProfilePersona({ userId: user?.id ?? '', persona }),

    onMutate: async (persona) => {
      const uid = user?.id ?? '';
      const queryKey: ['profile', string] = ['profile', uid];
      // Cancel in-flight reads so they don't overwrite our optimistic state.
      await qc.cancelQueries({ queryKey });

      const previous = qc.getQueryData<ProfileRow>(queryKey);
      if (previous) {
        qc.setQueryData<ProfileRow>(queryKey, {
          ...previous,
          advisor_persona: persona,
        });
      }
      return { previous };
    },

    onSuccess: () => {
      const uid = user?.id ?? '';
      // Persona drives the advisor's tone + suggestion chips, so the
      // existing thread cache is now stale.
      qc.invalidateQueries({ queryKey: ['advisor', uid] });
    },

    onError: (_err, _persona, context) => {
      if (context?.previous) {
        const uid = user?.id ?? '';
        qc.setQueryData<ProfileRow>(['profile', uid], context.previous);
      }
      // No else: if there was no previous snapshot, onMutate never wrote
      // anything to the cache, so there is nothing to roll back.
    },
  });
}
