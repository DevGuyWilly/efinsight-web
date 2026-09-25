import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { deleteAllConversations, deleteConversation, getConversation, listConversations } from '@/api/conversations';
import type { ConversationDetail, PlanResponse } from '@/api/types';

export const conversationKeys = {
  all: ['conversations'] as const,
  list: ['conversations', 'list'] as const,
  detail: (id: number) => ['conversations', 'detail', id] as const,
};

/** The signed-in user's conversations, most recently used first. */
export function useConversationList(enabled = true) {
  return useQuery({
    queryKey: conversationKeys.list,
    queryFn: ({ signal }) => listConversations(signal),
    enabled,
    staleTime: 30_000,
    select: (data) => data.conversations ?? [],
  });
}

/** One conversation with all its messages; disabled for a new, not yet saved chat (id null). */
export function useConversation(id: number | null) {
  return useQuery({
    queryKey: conversationKeys.detail(id ?? 0),
    queryFn: ({ signal }) => getConversation(id as number, signal),
    enabled: id !== null,
    staleTime: 30_000,
  });
}

/**
 * Shows a just-answered turn straight away by appending it to the cached conversation (creating the cache entry
 * for a brand-new conversation), then refetches in the background to pick up the saved message ids.
 */
export function recordAnsweredTurn(queryClient: QueryClient, question: string, response: PlanResponse, askedAt: string) {
  const id = response.conversationId;
  if (id != null) {
    const answeredAt = new Date().toISOString();
    queryClient.setQueryData<ConversationDetail>(conversationKeys.detail(id), (old) => {
      const base: ConversationDetail = old ?? {
        id,
        title: response.conversationTitle || question,
        createdAt: askedAt,
        updatedAt: answeredAt,
        messages: [],
      };
      return {
        ...base,
        updatedAt: answeredAt,
        messages: [
          ...base.messages,
          // Temporary negative ids until the background refetch replaces them with the saved ones
          { id: -Date.now(), role: 'user', content: question, createdAt: askedAt },
          { id: -Date.now() - 1, role: 'assistant', content: response.summary ?? '', createdAt: answeredAt, response },
        ],
      };
    });
    void queryClient.invalidateQueries({ queryKey: conversationKeys.detail(id) });
  }
  void queryClient.invalidateQueries({ queryKey: conversationKeys.list });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteConversation(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: conversationKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: conversationKeys.list });
    },
  });
}

export function useClearConversations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllConversations(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: conversationKeys.all, type: 'inactive' });
      return queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
}
