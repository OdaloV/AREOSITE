import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AREOSITE Mission Control Subsystem Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] bg-mars-950 flex flex-col items-center justify-center p-6 text-slate-200 font-mono">
          <div className="max-w-lg w-full p-6 rounded bg-mars-900 border border-mars-red shadow-2xl text-center">
            <AlertOctagon className="w-10 h-10 text-mars-red-bright mx-auto mb-2" />
            <h2 className="text-mars-red-bright font-bold text-base mb-2">
              {this.props.fallbackTitle || 'MISSION CONTROL TELEMETRY NOTICE'}
            </h2>
            <div className="p-3 bg-slate-950 rounded border border-slate-800 text-left text-xs mb-4 max-h-48 overflow-y-auto">
              <p className="text-amber-400 font-bold mb-1">
                {this.state.error?.name || 'Notice'}: {this.state.error?.message || 'Rendering paused'}
              </p>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">{this.state.error.stack}</pre>
              )}
            </div>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded bg-mars-red hover:bg-mars-red-bright text-white text-xs font-semibold flex items-center justify-center gap-1.5 mx-auto transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RELOAD HUD</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
