import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { ConversationDetail, PlanResponse } from '@/api/types';
import { conversationKeys, recordAnsweredTurn } from '@/hooks/useConversations';

const answer = (overrides: Partial<PlanResponse> = {}): PlanResponse => ({
  success: true,
  summary: 'Most at TESCO.',
  conversationId: 7,
  conversationTitle: 'Where do I spend the most?',
  ...overrides,
});

describe('recordAnsweredTurn', () => {
  it('creates the cached conversation for the first answer of a new chat', () => {
    const qc = new QueryClient();
    recordAnsweredTurn(qc, 'Where do I spend the most?', answer(), '2026-09-25T10:00:00Z');

    const cached = qc.getQueryData<ConversationDetail>(conversationKeys.detail(7));
    expect(cached?.title).toBe('Where do I spend the most?');
    expect(cached?.messages.map((m) => [m.role, m.content])).toEqual([
      ['user', 'Where do I spend the most?'],
      ['assistant', 'Most at TESCO.'],
    ]);
    expect(cached?.messages[1].response?.summary).toBe('Most at TESCO.');
  });

  it('appends a follow-up to the existing cached conversation', () => {
    const qc = new QueryClient();
    qc.setQueryData<ConversationDetail>(conversationKeys.detail(7), {
      id: 7,
      title: 'Where do I spend the most?',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:05Z',
      messages: [
        { id: 1, role: 'user', content: 'Where do I spend the most?', createdAt: '2026-09-25T10:00:00Z' },
        { id: 2, role: 'assistant', content: 'Most at TESCO.', createdAt: '2026-09-25T10:00:05Z', response: answer() },
      ],
    });

    recordAnsweredTurn(qc, 'What about August?', answer({ summary: 'Most at AMAZON.' }), '2026-09-25T10:01:00Z');

    const cached = qc.getQueryData<ConversationDetail>(conversationKeys.detail(7));
    expect(cached?.messages.map((m) => m.content)).toEqual([
      'Where do I spend the most?',
      'Most at TESCO.',
      'What about August?',
      'Most at AMAZON.',
    ]);
  });

  it('leaves the cache alone when the answer has no conversation id', () => {
    const qc = new QueryClient();
    recordAnsweredTurn(qc, 'hi', answer({ conversationId: null }), '2026-09-25T10:00:00Z');
    expect(qc.getQueryCache().getAll()).toHaveLength(0);
  });
});
