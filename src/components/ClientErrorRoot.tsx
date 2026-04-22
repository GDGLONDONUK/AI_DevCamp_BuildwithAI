"use client";

import { usePathname } from "next/navigation";
import { Component, type ErrorInfo, type ReactNode, useEffect } from "react";
import {
  installGlobalErrorListeners,
  reportClientError,
} from "@/lib/clientErrorLogger";

class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportClientError({
      source: "react",
      message: error.message || "React render error",
      name: error.name,
      stack: `${error.stack || ""}\n${info.componentStack || ""}`.slice(0, 10_000),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center px-4 bg-gray-950">
          <div className="max-w-md text-center border border-red-500/30 rounded-2xl p-8 bg-red-950/30">
            <p className="text-lg font-bold text-red-200 mb-2">Something went wrong</p>
            <p className="text-sm text-gray-400 mb-6">
              The error was reported automatically. Try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-white/10 text-white font-mono text-sm hover:bg-white/15"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Registers global error / rejection listeners and wraps the app in a React error boundary.
 */
export default function ClientErrorRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    installGlobalErrorListeners();
  }, []);

  return <RouteErrorBoundary key={pathname}>{children}</RouteErrorBoundary>;
}
