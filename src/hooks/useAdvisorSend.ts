/**
 * useAdvisorSend — mutation hook that sends a chat message through the
 * /api/advisor/chat round-trip and reconciles the cache.
 *
 *   onMutate    optimistically appends a user-side text bubble to the
 *               ['advisor', userId] cache so the UI updates instantly
 *   mutationFn  POST to /api/advisor/chat (Bearer auth, JSON body)
 *   onSuccess   invalidate ['advisor', userId] so the read path re-fetches
 *               the persisted user + assistant rows from advisor_messages
 *   onError     roll back the optimistic update so the rejected message
 *               doesn't linger in the thread
 *
 * The hook never tries to inject the assistant's reply directly — the
 * server has already written it to advisor_messages, and the read path is
 * the single source of truth. This keeps the cache shape stable and avoids
 * having to mirror the web app's block reshaping logic in two places.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  postAdvisorMessage as defaultPost,
  type AdvisorChatResponse,
} from '@/lib/api/finpersona';
import type { AdvisorMessage, AdvisorMock } from '@/mocks/seed';
import { advisorMock } from '@/mocks/seed';

type SendDeps = {
  postAdvisorMessage?: typeof defaultPost;
};

type Context = {
  /** Snapshot we restore on error. */
  previous: AdvisorMock | undefined;
  queryKey: ['advisor', string];
};

export function useAdvisorSend(deps: SendDeps = {}) {
  const { postAdvisorMessage = defaultPost } = deps;
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation<AdvisorChatResponse, Error, string, Context>({
    mutationFn: (message) => postAdvisorMessage({ message }),

    onMutate: async (message) => {
      const queryKey: ['advisor', string] = ['advisor', user?.id ?? ''];
      // Cancel in-flight read so it doesn't overwrite our optimistic state.
      await qc.cancelQueries({ queryKey });

      const previous = qc.getQueryData<AdvisorMock>(queryKey);
      const base: AdvisorMock = previous ?? advisorMock;
      const userBubble: AdvisorMessage = {
        kind: 'text',
        from: 'user',
        text: message,
      };
      qc.setQueryData<AdvisorMock>(queryKey, {
        ...base,
        messages: [...base.messages, userBubble],
      });

      return { previous, queryKey };
    },

    onError: (_err, _msg, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(context.queryKey, context.previous);
      } else if (context) {
        // No prior cache entry — clear our optimistic write so the
        // ['advisor'] read path falls back to a fresh fetch on next mount.
        qc.removeQueries({ queryKey: context.queryKey });
      }
    },

    onSuccess: (_data, _msg, context) => {
      // Server has persisted both turns; refetch from advisor_messages so
      // the assistant's reply (and any chart/recommendations blocks)
      // appear in the thread via the canonical read path.
      if (context) {
        qc.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
}
