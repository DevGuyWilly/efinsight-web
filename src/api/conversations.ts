import { request } from './client';
import type { ConversationDetail, ConversationListResponse } from './types';

/** Advisor conversations, most recently used first. New ones are created by askPlan without a conversationId. */
export function listConversations(signal?: AbortSignal): Promise<ConversationListResponse> {
  return request<ConversationListResponse>('/api/conversations', { signal });
}

/** 404 (ApiError kind 'http') when it doesn't exist or belongs to someone else. */
export function getConversation(id: number, signal?: AbortSignal): Promise<ConversationDetail> {
  return request<ConversationDetail>(`/api/conversations/${id}`, { signal });
}

export async function deleteConversation(id: number): Promise<void> {
  await request<void>(`/api/conversations/${id}`, { method: 'DELETE' });
}

export async function deleteAllConversations(): Promise<void> {
  await request<void>('/api/conversations', { method: 'DELETE' });
}
