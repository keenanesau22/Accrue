import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
          <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full">
            <h1 className="text-2xl font-fredoka font-bold text-slate-900 mb-4">Accrue System Recovery</h1>
            <p className="text-slate-600 mb-8 text-sm">An unexpected error occurred. Our forensic systems are resetting to ensure your data integrity.</p>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-lg text-sm uppercase tracking-widest hover:bg-emerald-800 transition-all"
            >
              Clear Cache & Restart
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
