import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Background layers */
        "bg-base": "var(--bg-base)",
        "bg-surface": "var(--bg-surface)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-overlay": "var(--bg-overlay)",

        /* Borders */
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "border-strong": "var(--border-strong)",

        /* Text */
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",

        /* Status (semantic — same in both themes) */
        "status-healthy": "var(--status-healthy)",
        "status-warning": "var(--status-warning)",
        "status-critical": "var(--status-critical)",
        "status-info": "var(--status-info)",
        "status-neutral": "var(--status-neutral)",

        /* Accent */
        "accent-primary": "var(--accent-primary)",
        "accent-hover": "var(--accent-hover)",
        "accent-muted": "var(--accent-muted)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "Fira Code",
          "SF Mono",
          "monospace",
        ],
      },
      spacing: {
        "space-1": "4px",
        "space-2": "8px",
        "space-3": "12px",
        "space-4": "16px",
        "space-5": "20px",
        "space-6": "24px",
        "space-8": "32px",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["2rem", { lineHeight: "2.5rem" }],
      },
      borderRadius: {
        md: "6px",
      },
      keyframes: {
        "skeleton-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-bottom": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "dialog-overlay-show": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "dialog-overlay-hide": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "dialog-content-show": {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.96)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "dialog-content-hide": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, -48%) scale(0.96)" },
        },
        "select-content-show": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "select-content-hide": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.96)" },
        },
        "slide-in-top": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "skeleton-pulse": "skeleton-pulse 1.5s ease-in-out infinite",
        "slide-in-right": "slide-in-right 200ms ease-out",
        "slide-in-bottom": "slide-in-bottom 200ms ease-out",
        "slide-in-top": "slide-in-top 200ms ease-out",
        "fade-in-scale": "fade-in-scale 150ms ease-out",
        "dialog-overlay-show": "dialog-overlay-show 150ms ease-out",
        "dialog-overlay-hide": "dialog-overlay-hide 150ms ease-in",
        "dialog-content-show": "dialog-content-show 200ms ease-out",
        "dialog-content-hide": "dialog-content-hide 150ms ease-in",
        "select-content-show": "select-content-show 150ms ease-out",
        "select-content-hide": "select-content-hide 100ms ease-in",
        "pulse-dot": "pulse-dot 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
