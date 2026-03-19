"use client";

import { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeViewerProps {
  code: string;
  language?: string;
  fileName?: string;
  className?: string;
}

/** Detect language from file extension or mime_type */
export function detectLanguage(
  fileName?: string,
  mimeType?: string
): string {
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      rb: "ruby",
      rs: "rust",
      go: "go",
      java: "java",
      kt: "kotlin",
      swift: "swift",
      css: "css",
      scss: "css",
      html: "html",
      xml: "xml",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      toml: "toml",
      md: "markdown",
      sh: "shell",
      bash: "shell",
      zsh: "shell",
      sql: "sql",
      graphql: "graphql",
      dockerfile: "docker",
      tf: "terraform",
    };
    if (ext && map[ext]) return map[ext];
  }
  if (mimeType) {
    if (mimeType.includes("javascript")) return "javascript";
    if (mimeType.includes("typescript")) return "typescript";
    if (mimeType.includes("python")) return "python";
    if (mimeType.includes("json")) return "json";
    if (mimeType.includes("html")) return "html";
    if (mimeType.includes("css")) return "css";
  }
  return "text";
}

// CSS-only syntax coloring token patterns
const TOKEN_PATTERNS: Record<string, Array<[RegExp, string]>> = {
  default: [
    // Strings (double-quoted)
    [/"(?:[^"\\]|\\.)*"/g, "text-[#ce9178]"],
    // Strings (single-quoted)
    [/'(?:[^'\\]|\\.)*'/g, "text-[#ce9178]"],
    // Template literals
    [/`(?:[^`\\]|\\.)*`/g, "text-[#ce9178]"],
    // Single-line comments
    [/\/\/.*$/gm, "text-[#6a9955]"],
    // Hash comments
    [/#.*$/gm, "text-[#6a9955]"],
    // Numbers
    [/\b\d+\.?\d*\b/g, "text-[#b5cea8]"],
    // Keywords
    [
      /\b(function|return|const|let|var|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|in|of|yield|switch|case|break|continue|do|finally|with|as|type|interface|enum|implements|extends|public|private|protected|static|readonly|abstract|override|declare|namespace|module|def|self|elif|lambda|pass|raise|except|True|False|None|fn|pub|mut|use|mod|struct|impl|trait|match|loop|move|ref|where|unsafe|dyn)\b/g,
      "text-[#569cd6]",
    ],
    // Boolean/null
    [/\b(true|false|null|undefined|nil|None)\b/g, "text-[#569cd6]"],
    // Decorators / annotations
    [/@\w+/g, "text-[#dcdcaa]"],
  ],
};

function tokenize(code: string, _language: string): string {
  const patterns = TOKEN_PATTERNS.default!;

  // Build a list of all token ranges to avoid overlapping highlights
  const tokens: Array<{ start: number; end: number; cls: string }> = [];

  for (const [regex, cls] of patterns) {
    const re = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(code)) !== null) {
      tokens.push({ start: match.index, end: match.index + match[0].length, cls });
    }
  }

  // Sort by start position, resolve overlaps (first-match wins)
  tokens.sort((a, b) => a.start - b.start);

  const filtered: typeof tokens = [];
  let lastEnd = 0;
  for (const t of tokens) {
    if (t.start >= lastEnd) {
      filtered.push(t);
      lastEnd = t.end;
    }
  }

  // Build HTML
  let result = "";
  let pos = 0;
  for (const t of filtered) {
    if (t.start > pos) {
      result += escapeHtml(code.slice(pos, t.start));
    }
    result += `<span class="${t.cls}">${escapeHtml(code.slice(t.start, t.end))}</span>`;
    pos = t.end;
  }
  if (pos < code.length) {
    result += escapeHtml(code.slice(pos));
  }

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function CodeViewer({
  code,
  language = "text",
  fileName,
  className,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const lines = code.split("\n");
  const lineNumberWidth = String(lines.length).length;

  const highlighted = useMemo(() => tokenize(code, language), [code, language]);
  const highlightedLines = highlighted.split("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-md border border-border-subtle bg-bg-base overflow-hidden",
        className
      )}
    >
      {/* Header bar */}
      {(fileName || language !== "text") && (
        <div className="flex items-center justify-between border-b border-border-subtle bg-bg-elevated px-space-3 py-space-1">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            {fileName || language}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-space-1 py-0.5 text-[10px] text-text-muted transition-colors hover:text-text-secondary hover:bg-bg-surface"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check size={10} aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy size={10} aria-hidden="true" />
                Copy
              </>
            )}
          </button>
        </div>
      )}

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="text-xs leading-5 font-mono p-space-3">
          <code>
            {highlightedLines.map((line, i) => (
              <div key={i} className="flex">
                <span
                  className="select-none text-right text-text-muted/40 pr-space-3 mr-space-3 border-r border-border-subtle/50"
                  style={{ minWidth: `${lineNumberWidth + 1}ch` }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span
                  className="flex-1 whitespace-pre"
                  dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }}
                />
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Floating copy button when no header */}
      {!fileName && language === "text" && (
        <button
          onClick={handleCopy}
          className="absolute right-space-2 top-space-2 rounded bg-bg-elevated/80 p-space-1 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-secondary"
          aria-label="Copy code"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
    </div>
  );
}
