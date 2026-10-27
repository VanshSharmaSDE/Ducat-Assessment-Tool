import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  X
} from 'lucide-react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState(null);
  const resolveRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Auto-focus the primary action button when modal opens
  useEffect(() => {
    if (modalState) {
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [modalState]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!modalState) return;
      if (e.key === 'Escape') {
        handleClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState]);

  const handleClose = useCallback((result = false) => {
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
    setModalState(null);
  }, []);

  const showAlert = useCallback((optionsOrMessage, typeOverride = 'info') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (typeof optionsOrMessage === 'string') {
        const type = typeOverride || 'info';
        let defaultTitle = 'Notice';
        if (type === 'success') defaultTitle = 'Success';
        else if (type === 'error') defaultTitle = 'Error';
        else if (type === 'warning') defaultTitle = 'Warning';

        setModalState({
          isConfirm: false,
          title: defaultTitle,
          message: optionsOrMessage,
          type,
          confirmText: 'OK',
        });
      } else {
        const {
          title,
          message,
          type = 'info',
          confirmText = 'OK',
        } = optionsOrMessage || {};

        let fallbackTitle = 'Notice';
        if (type === 'success') fallbackTitle = 'Success';
        else if (type === 'error') fallbackTitle = 'Error';
        else if (type === 'warning') fallbackTitle = 'Warning';

        setModalState({
          isConfirm: false,
          title: title || fallbackTitle,
          message: message || '',
          type,
          confirmText,
        });
      }
    });
  }, []);

  // Handle global custom events for showing modals anywhere in the app
  useEffect(() => {
    const handleGlobalAlert = (e) => {
      if (e?.detail) {
        showAlert(e.detail);
      }
    };
    window.addEventListener('app:show-alert', handleGlobalAlert);
    return () => window.removeEventListener('app:show-alert', handleGlobalAlert);
  }, [showAlert]);

  const showConfirm = useCallback((optionsOrMessage, optionsOverride = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (typeof optionsOrMessage === 'string') {
        const isDanger = optionsOverride.isDanger ?? false;
        setModalState({
          isConfirm: true,
          title: optionsOverride.title || (isDanger ? 'Delete Confirmation' : 'Confirm Action'),
          message: optionsOrMessage,
          type: isDanger ? 'danger' : (optionsOverride.type || 'warning'),
          confirmText: optionsOverride.confirmText || (isDanger ? 'Delete' : 'Confirm'),
          cancelText: optionsOverride.cancelText || 'Cancel',
          isDanger,
        });
      } else {
        const {
          title,
          message,
          type,
          confirmText,
          cancelText = 'Cancel',
          isDanger = false,
        } = optionsOrMessage || {};

        setModalState({
          isConfirm: true,
          title: title || (isDanger ? 'Delete Confirmation' : 'Confirm Action'),
          message: message || '',
          type: isDanger ? 'danger' : (type || 'warning'),
          confirmText: confirmText || (isDanger ? 'Delete' : 'Confirm'),
          cancelText,
          isDanger,
        });
      }
    });
  }, []);

  const renderIcon = () => {
    if (!modalState) return null;
    const { type, isDanger } = modalState;

    if (isDanger || type === 'danger') {
      return (
        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
          <Trash2 className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'error') {
      return (
        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'success') {
      return (
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'warning') {
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
        <Info className="w-4 h-4" />
      </div>
    );
  };

  const getConfirmButtonClasses = () => {
    if (!modalState) return '';
    const { isDanger, type } = modalState;
    // Red button for danger / delete / error
    if (isDanger || type === 'danger' || type === 'error') {
      return 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm';
    }
    // Green button for confirm, success, info, and standard actions
    return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm';
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modalState && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => handleClose(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm sm:max-w-md w-full p-5 shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-150 relative text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header: Icon + Title + Close Button */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {renderIcon()}
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight truncate">
                  {modalState.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Message */}
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-line py-1">
              {modalState.message}
            </div>

            {/* Actions: Cancel (if confirm) + Red/Green Action Button */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              {modalState.isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {modalState.cancelText || 'Cancel'}
                </button>
              )}
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => handleClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${getConfirmButtonClasses()}`}
              >
                {modalState.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

export function showGlobalAlert(optionsOrMessage, type = 'info') {
  if (typeof optionsOrMessage === 'string') {
    window.dispatchEvent(
      new CustomEvent('app:show-alert', { detail: { message: optionsOrMessage, type } })
    );
  } else {
    window.dispatchEvent(new CustomEvent('app:show-alert', { detail: optionsOrMessage }));
  }
}
