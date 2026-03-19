"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Wrench } from "lucide-react";
import type { ChatMessage } from "@/lib/api/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

/**
 * Format an ISO timestamp to a compact time string.
 */
function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
}

/**
 * Simple markdown rendering for agent responses.
 * Handles bold, italic, inline code, code blocks, and lists.
 */
function renderMarkdown(content: string): ReactNode {
  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3);
          const firstNewline = code.indexOf("\n");
          const lang = firstNewline > 0 ? code.slice(0, firstNewline).trim() : "";
          const body = firstNewline > 0 ? code.slice(firstNewline + 1) : code;

          return (
            <pre
              key={i}
              className="my-space-2 overflow-x-auto rounded bg-bg-elevated px-space-3 py-space-2 font-mono text-xs text-text-secondary"
            >
              {lang && (
                <span className="mb-space-1 block text-[10px] uppercase text-text-muted">
                  {lang}
                </span>
              )}
              <code>{body}</code>
            </pre>
          );
        }

        // Process inline elements
        return (
          <span key={i}>
            {part.split("\n").map((line, lineIdx) => {
              // List items
              if (/^\s*[-*]\s/.test(line)) {
                return (
                  <span key={lineIdx} className="block pl-space-3">
                    {"\u2022 "}
                    {renderInline(line.replace(/^\s*[-*]\s/, ""))}
                  </span>
                );
              }
              // Numbered list items
              if (/^\s*\d+\.\s/.test(line)) {
                return (
                  <span key={lineIdx} className="block pl-space-3">
                    {renderInline(line)}
                  </span>
                );
              }

              return (
                <span key={lineIdx}>
                  {lineIdx > 0 && <br />}
                  {renderInline(line)}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
}

/**
 * Render inline markdown: bold, italic, inline code.
 */
function renderInline(text: string): ReactNode {
  // Process: **bold**, *italic*, `code`
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return (
    <>
      {tokens.map((token, i) => {
        if (token.startsWith("**") && token.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-text-primary">
              {token.slice(2, -2)}
            </strong>
          );
        }
        if (token.startsWith("*") && token.endsWith("*")) {
          return <em key={i}>{token.slice(1, -1)}</em>;
        }
        if (token.startsWith("`") && token.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-bg-elevated px-1 py-0.5 font-mono text-xs text-text-secondary"
            >
              {token.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}

/**
 * Extract tool name and args summary from a tool message.
 */
function parseToolContent(content: string): {
  toolName: string;
  args: string;
} {
  // Common format: tool_name("args") or tool_name: args
  const matchParen = content.match(/^(\w+)\(([\s\S]+)\)$/);
  const matchColon = content.match(/^(\w+):\s*([\s\S]+)$/);
  const match = matchParen ?? matchColon;
  if (match && match[1] && match[2]) {
    return { toolName: match[1], args: match[2] };
  }
  return { toolName: "tool", args: content };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";

  // System messages: centered, muted
  if (isSystem) {
    return (
      <div className="flex justify-center px-space-4 py-space-2">
        <p className="text-xs text-text-muted italic">{message.content}</p>
      </div>
    );
  }

  // Tool messages: compact, monospace, indented
  if (isTool) {
    const { toolName, args } = parseToolContent(message.content);

    return (
      <div className="group flex flex-col gap-space-1 px-space-4 py-space-1">
        <div className="ml-space-2 flex items-start gap-space-2 rounded bg-bg-elevated px-space-3 py-space-2">
          <Wrench
            size={12}
            className="mt-0.5 shrink-0 text-text-muted"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs font-medium text-accent-primary">
              {toolName}
            </span>
            <span className="ml-1 font-mono text-xs text-text-muted">
              ({args.length > 80 ? `${args.slice(0, 80)}...` : args})
            </span>
          </div>
        </div>
        <span className="ml-space-2 font-mono text-[10px] text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
          {formatTime(message.created_at)}
        </span>
      </div>
    );
  }

  // User / Assistant messages
  return (
    <div
      className={cn(
        "group flex flex-col gap-space-1 px-space-4 py-space-2",
        isUser ? "items-end" : "items-start"
      )}
    >
      {/* Agent name label for assistant messages */}
      {isAssistant && message.agent_name && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          {message.agent_name}
        </span>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-md px-space-3 py-space-2 text-sm",
          isUser
            ? "bg-accent-muted/20 text-text-primary"
            : "bg-bg-surface text-text-secondary"
        )}
      >
        {isAssistant ? (
          <div className="leading-relaxed">
            {renderMarkdown(message.content)}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>

      <span className="font-mono text-[10px] text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
        {formatTime(message.created_at)}
      </span>
    </div>
  );
}
