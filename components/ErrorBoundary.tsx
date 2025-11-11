import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  // Fix: Replaced the constructor with a public class field to initialize state.
  // This is a more modern approach that directly addresses the TypeScript errors
  // indicating that 'state' and 'props' were not recognized on the component instance.
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ivory p-4 text-center">
            <div>
                <h1 className="text-3xl font-serif font-bold text-accent-maroon mb-4">Oops! Something went wrong.</h1>
                <p className="text-lg text-text-main/80 mb-6">
                    We've encountered an unexpected error. Please try refreshing the page.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-primary-gold text-text-main font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                    Refresh Page
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
