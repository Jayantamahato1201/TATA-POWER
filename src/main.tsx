import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // If it's an extension proxy error, don't crash the UI
    if (
      error &&
      (error.message.includes('tronlinkParams') ||
        error.message.includes('trap returned falsish') ||
        error.message.includes('tronWeb') ||
        error.message.includes('ethereum'))
    ) {
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (
      error &&
      (error.message.includes('tronlinkParams') ||
        error.message.includes('trap returned falsish') ||
        error.message.includes('tronWeb') ||
        error.message.includes('ethereum'))
    ) {
      // Benign extension injection, ignore
      return;
    }
    console.error('App Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070D18] text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-amber-400 mb-2">Application Interface Refresh</h2>
          <p className="text-sm text-[#94A3B8] mb-4">
            An unexpected error occurred during rendering. Click below to reload the interface.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#205CA5] hover:bg-[#1A4B86] text-white rounded font-medium text-xs transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);

