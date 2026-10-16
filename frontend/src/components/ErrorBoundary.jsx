import React from 'react';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReturn = () => {
    window.location.href = this.props.fallbackUrl || '/exams';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 select-none font-sans">
          <div className="p-8 rounded-2xl bg-white border border-slate-200 max-w-lg w-full text-center space-y-5 shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Assessment Interface Recovery
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                An unexpected display issue occurred in the examination workspace. Your progress has been automatically saved in your browser and on the secure server.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono text-[11px] text-slate-600 overflow-auto max-h-28">
                <span className="font-semibold text-rose-600 block mb-1">Diagnostic Detail:</span>
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Examination</span>
              </button>

              <button
                type="button"
                onClick={this.handleReturn}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Assessments</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
