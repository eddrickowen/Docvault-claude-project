import React from "react";
import { IC } from "./Icon";

/**
 * ErrorBoundary — catches uncaught errors and shows a friendly fallback.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-bg-app p-10 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-soft border-2 border-red-mid flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d={IC.warn} />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text-primary">Terjadi Kesalahan</h2>
          <p className="text-sm text-text-secondary text-center max-w-md">
            Aplikasi mengalami error yang tidak terduga. Coba refresh halaman.
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
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            Refresh Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
