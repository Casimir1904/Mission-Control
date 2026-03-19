"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Lightweight markdown renderer — no external library.
 * Supports: headings, bold, italic, inline code, code blocks,
 * links, unordered/ordered lists, and horizontal rules.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className={cn("markdown-content text-sm text-text-primary leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  let result = escapeHtml(text);

  // Inline code (must be before bold/italic to avoid conflict)
  result = result.replace(/`([^`]+)`/g, '<code class="rounded bg-bg-elevated px-1 py-0.5 font-mono text-xs text-accent-primary">$1</code>');

  // Bold + italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  result = result.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Links [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-primary underline hover:text-accent-hover">$1</a>'
  );

  // Autolinks (bare URLs)
  result = result.replace(
    /(?<!\w)(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-accent-primary underline hover:text-accent-hover">$1</a>'
  );

  return result;
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const output: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeLines: string[] = [];
  let inList: "ul" | "ol" | null = null;

  function closeList() {
    if (inList) {
      output.push(inList === "ul" ? "</ul>" : "</ol>");
      inList = null;
    }
  }

  for (const line of lines) {
    // Fenced code blocks
    if (line.trimStart().startsWith("```")) {
      if (!inCodeBlock) {
        closeList();
        inCodeBlock = true;
        codeBlockLang = line.trimStart().slice(3).trim();
        codeLines = [];
      } else {
        const langLabel = codeBlockLang || "code";
        output.push(
          `<div class="my-2 rounded-md border border-border-subtle bg-bg-base overflow-hidden">`,
          `<div class="flex items-center border-b border-border-subtle bg-bg-elevated px-3 py-1"><span class="text-[10px] font-mono text-text-muted uppercase tracking-wider">${escapeHtml(langLabel)}</span></div>`,
          `<pre class="overflow-x-auto p-3 text-xs leading-5 font-mono"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
          `</div>`
        );
        inCodeBlock = false;
        codeBlockLang = "";
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      closeList();
      output.push("");
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      closeList();
      output.push('<hr class="my-3 border-border-subtle" />');
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1]!.length;
      const text = renderInline(headingMatch[2]!);
      const sizes: Record<number, string> = {
        1: "text-lg font-bold mt-4 mb-2",
        2: "text-base font-semibold mt-3 mb-2",
        3: "text-sm font-semibold mt-2 mb-1",
        4: "text-sm font-medium mt-2 mb-1",
        5: "text-xs font-medium mt-1 mb-1",
        6: "text-xs font-medium mt-1 mb-1",
      };
      output.push(`<h${level} class="${sizes[level]} text-text-primary">${text}</h${level}>`);
      continue;
    }

    // Unordered list items
    const ulMatch = line.match(/^(\s*)[*\-+]\s+(.*)/);
    if (ulMatch) {
      if (inList !== "ul") {
        closeList();
        inList = "ul";
        output.push('<ul class="list-disc list-inside space-y-0.5 ml-1">');
      }
      output.push(`<li class="text-text-secondary">${renderInline(ulMatch[2]!)}</li>`);
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (olMatch) {
      if (inList !== "ol") {
        closeList();
        inList = "ol";
        output.push('<ol class="list-decimal list-inside space-y-0.5 ml-1">');
      }
      output.push(`<li class="text-text-secondary">${renderInline(olMatch[2]!)}</li>`);
      continue;
    }

    // Blockquote
    const bqMatch = line.match(/^>\s?(.*)/);
    if (bqMatch) {
      closeList();
      output.push(
        `<blockquote class="border-l-2 border-border-strong pl-3 my-1 text-text-secondary italic">${renderInline(bqMatch[1]!)}</blockquote>`
      );
      continue;
    }

    // Normal paragraph
    closeList();
    output.push(`<p class="mb-1">${renderInline(line)}</p>`);
  }

  // Close any open code block
  if (inCodeBlock) {
    output.push(
      `<pre class="overflow-x-auto rounded-md border border-border-subtle bg-bg-base p-3 text-xs leading-5 font-mono my-2"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`
    );
  }

  closeList();
  return output.join("\n");
}
