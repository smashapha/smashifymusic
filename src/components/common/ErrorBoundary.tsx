import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public props: Props;
  public state: State = {
    hasError: false
  };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-page flex items-center justify-center p-4">
          <div className="bg-bg-surface p-8 rounded-[20px] max-w-md w-full text-center border border-border-default">
            <h2 className="text-xl font-display font-bold text-white mb-4">Something went wrong</h2>
            <p className="text-text-secondary text-sm mb-6">
              We encountered an unexpected error. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-smash-orange text-white px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
            >
              Reload Page
            </button>
            {this.state.error && (
              <p className="mt-6 text-[10px] text-text-muted text-left p-3 bg-black/20 rounded-md font-mono overflow-auto max-h-32">
                {this.state.error.toString()}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
