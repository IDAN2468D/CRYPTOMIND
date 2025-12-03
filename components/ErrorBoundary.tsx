import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Using React.Component explicitly ensures proper type inference for props and state
export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200 p-6 text-center">
          <div className="bg-rose-500/10 p-4 rounded-full mb-4 border border-rose-500/20">
             <ShieldAlert size={48} className="text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white">System Critical Error</h1>
          <p className="text-slate-400 mb-6 max-w-md">
            The neural link encountered an unexpected anomaly. 
            <br/>
            <span className="text-xs font-mono text-rose-300 mt-2 block bg-black/30 p-2 rounded">
                {this.state.error?.message}
            </span>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-violet-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25"
          >
            <RefreshCw size={18} />
            Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}