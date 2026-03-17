import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
          <AlertTriangle className="text-red-400 mb-4" size={48} />
          <h2 className="font-semibold text-lg mb-1">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-5 max-w-xs">{this.state.error?.message ?? 'An unexpected error occurred.'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 text-sm rounded-xl bg-primary-500 text-white hover:bg-primary-600"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
