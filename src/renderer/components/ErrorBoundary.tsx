import { Component, type ErrorInfo, type ReactNode } from "react";

import log from "@renderer/utils/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    log.error("[ErrorBoundary] Uncaught render error:", error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <svg
            className="w-7 h-7 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2 tracking-tight">
          Something went wrong
        </h2>
        <p className="text-xs text-[var(--text-muted)] mb-1 max-w-sm leading-relaxed">
          An unexpected error occurred while rendering this page.
        </p>
        {this.state.error?.message && (
          <p className="text-[10px] font-mono text-red-500/70 mb-6 max-w-md break-all leading-relaxed">
            {this.state.error.message}
          </p>
        )}
        <button
          onClick={this.handleReset}
          className="px-8 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase glass-btn glass-btn-primary transition-all hover:scale-[1.02] active:scale-95"
        >
          Try Again
        </button>
      </div>
    );
  }
}
