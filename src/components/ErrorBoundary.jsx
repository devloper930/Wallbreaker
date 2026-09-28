import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#161512] text-white flex flex-col items-center justify-center p-6 select-none">
          <div className="w-full max-w-md bg-[#21201d] border border-red-500/40 rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-500/60 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Something went wrong</h2>
              <p className="text-xs text-[#9e9c98]">
                An unexpected interface error occurred. You can safely return to the home lobby.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#181715] border border-[#3c3934] rounded-xl text-left overflow-auto max-h-36">
                <p className="text-xs font-mono text-red-400 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#81b64c] hover:bg-[#95c85d] text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#2b2926] hover:bg-[#3c3934] border border-[#3c3934] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
