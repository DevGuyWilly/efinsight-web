import { forwardRef } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SUGGESTED_PROMPTS } from '@/lib/prompts';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onPick: (prompt: string) => void;
  loading: boolean;
  /** Suggestion chips above the input. Hidden while a request is in flight. */
  showSuggestions: boolean;
}

/** Suggestion chips, auto-growing-ish textarea (Enter sends, Shift+Enter adds a line), Ask / Stop, and a note. */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { value, onChange, onSubmit, onStop, onPick, loading, showSuggestions },
  ref,
) {
  const canSubmit = value.trim().length > 0 && !loading;
  return (
    <div className="flex flex-col gap-2.5 border-t border-outline-gray-1 bg-surface-white px-4 pb-5 pt-3 md:px-6">
      {showSuggestions ? (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              className="h-7 rounded-full border border-outline-gray-2 bg-surface-white px-2.5 text-sm text-ink-gray-8 hover:bg-surface-gray-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4"
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit();
        }}
        className="flex items-end gap-2 rounded-lg border border-transparent bg-surface-gray-2 p-2 focus-within:border-outline-gray-3"
      >
        <label htmlFor="advisor-question" className="sr-only">
          Your question
        </label>
        <textarea
          ref={ref}
          id="advisor-question"
          rows={2}
          maxLength={1000}
          value={value}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          placeholder="Ask about your spending, budget or investments"
          className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1.5 py-1 text-base leading-normal text-ink-gray-8 outline-none placeholder:text-ink-gray-4 disabled:opacity-70"
        />
        {loading ? (
          <Button variant="outline" size="md" onClick={onStop} iconLeft={<Square size={14} strokeWidth={1.5} aria-hidden="true" />}>
            Stop
          </Button>
        ) : (
          <Button type="submit" size="md" disabled={!canSubmit} iconLeft={<ArrowUp size={16} strokeWidth={1.5} aria-hidden="true" />}>
            Ask
          </Button>
        )}
      </form>
      <span className="text-xs text-ink-gray-5">
        Each question is answered on its own — earlier questions are not used as context. Answers usually take 5–15 seconds.
      </span>
    </div>
  );
});
