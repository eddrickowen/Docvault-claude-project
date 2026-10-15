import React from "react";
import { IC } from "./Icon";

/**
 * ErrorBoundary — catches uncaught render errors and shows a fallback UI.
 *
 * Props:
 *   name     {string}   — Label shown in the error message ("Error di halaman X")
 *   inline   {boolean}  — Compact card fallback for widget/section-level use;
 *                         full-screen fallback for page-level use (default)
 *   children {ReactNode}
 *
 * Recovery:
 *   - "Coba Lagi" resets the boundary state so React re-renders children.
 *     Works for transient errors (bad data, one-time render glitch).
 *   - "Refresh Halaman" does a hard reload for persistent crashes.
 *
 * Usage — page level (reset on navigation via key prop):
 *   <ErrorBoundary key={view} name="Purchase Orders">
 *     <POList />
 *   </ErrorBoundary>
 *
 * Usage — widget level:
 *   <ErrorBoundary name="Chat" inline>
 *     <ChatWidget />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console so devtools captures it even though it's "handled"
    console.error(`[ErrorBoundary:${this.props.name || "unknown"}]`, error, info.componentStack);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { name, inline } = this.props;
    const label = name ? `Error di ${name}` : "Terjadi Kesalahan";

    // ── Inline / widget-level fallback ───────────────────────────────────
    if (inline) {
      return (
        <div className="flex items-center gap-3 px-4 py-3 m-2 rounded-lg bg-red-soft border border-red-mid text-red text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d={IC.warn} />
          </svg>
          <span className="flex-1 font-semibold">{label}</span>
          <button
            onClick={this.reset}
            className="text-xs font-semibold underline hover:no-underline shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      );
    }

    // ── Full-page fallback ────────────────────────────────────────────────
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-app p-10 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-soft border-2 border-red-mid flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d={IC.warn} />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-text-primary">{label}</h2>
        <p className="text-sm text-text-secondary text-center max-w-md">
          Halaman ini mengalami error yang tidak terduga. Coba navigasi ke halaman lain, atau refresh.
        </p>
        <details className="mt-2 max-w-lg w-full">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-brand font-semibold">
            Detail Error
          </summary>
          <pre className="mt-2 p-3 bg-surface border border-border-default rounded-lg text-[11px] text-red overflow-auto max-h-40 font-mono">
            {this.state.error?.message}
            {"\n"}
            {this.state.error?.stack}
          </pre>
        </details>
        <div className="flex gap-3 mt-2">
          <button
            onClick={this.reset}
            className="px-5 py-2 bg-surface border border-border-strong text-text-primary rounded-lg text-sm font-semibold hover:bg-surface-alt transition-colors"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }
}
