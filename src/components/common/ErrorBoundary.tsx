import React, { ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
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
        <div className="min-h-screen bg-smash-black flex flex-col items-center justify-center text-center px-4">
          <AlertCircle size={64} className="text-smash-red mb-6" />
          <h1 className="text-4xl font-black font-display italic tracking-tighter text-white mb-4">Something went wrong</h1>
          <p className="text-smash-gray font-medium max-w-md mb-8">
            {this.state.error?.message || "An unexpected error occurred. Our team has been notified."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-full hover:bg-smash-orange hover:text-white transition-all shadow-xl active:scale-95"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
