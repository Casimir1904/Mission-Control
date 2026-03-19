"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAbort?: () => void;
  isGenerating?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onAbort,
  isGenerating = false,
  isDisabled = false,
  placeholder = "Message agent...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;

    onSend(trimmed);
    setValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isDisabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Auto-resize textarea
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-border-subtle bg-bg-surface p-space-3">
      {isGenerating && (
        <div className="mb-space-2 flex items-center gap-space-2 text-xs text-text-muted">
          <ThinkingDots />
          <span>Agent is responding...</span>
        </div>
      )}

      <div className="flex items-end gap-space-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-md border border-border-subtle bg-bg-surface px-space-3 py-space-2",
            "text-sm text-text-primary placeholder:text-text-muted",
            "focus:border-border-default focus:outline-none focus:ring-1 focus:ring-border-default",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[36px] max-h-[120px]"
          )}
          aria-label="Chat message input"
        />

        {isGenerating ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={onAbort}
            aria-label="Stop generation"
            className="shrink-0"
          >
            <Square size={14} aria-hidden="true" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!value.trim() || isDisabled}
            aria-label="Send message"
            className="shrink-0"
          >
            <Send size={14} aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Animated thinking dots indicator.
 * Three dots with staggered pulse animation.
 */
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      <span className="h-1 w-1 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
    </span>
  );
}

export { ThinkingDots };
