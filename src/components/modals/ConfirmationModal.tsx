import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Loader2 } from 'lucide-react';
import { ConfirmationModalProps } from './modal.types';
import { getModalVariantStyles } from './modalVariants';
import { overlayVariants, contentVariants } from './modalAnimations';

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  variant = 'info',
  destructiveLevel = 'normal',
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false,
  confirmationText,
  preventCloseOnLoading = true,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll lock & Focus restoration
  useEffect(() => {
    if (open) {
      // Save previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Lock body scroll
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      // Focus management
      setTimeout(() => {
        if (confirmationText && inputRef.current) {
          inputRef.current.focus();
        } else if (cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        }
      }, 50);

      return () => {
        document.body.style.overflow = originalStyle;
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [open, confirmationText]);

  // Focus trap
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (loading && preventCloseOnLoading) {
        e.preventDefault();
        return;
      }
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      if (!modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [tabindex="0"]'
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (loading && preventCloseOnLoading) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (loading) return;
    if (confirmationText && typedConfirmation !== confirmationText) return;
    await onConfirm();
  };

  const styles = getModalVariantStyles(variant, destructiveLevel);

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return destructiveLevel === 'critical' ? (
          <AlertCircle className={styles.iconClass} />
        ) : (
          <AlertTriangle className={styles.iconClass} />
        );
      case 'warning':
        return <AlertTriangle className={styles.iconClass} />;
      case 'success':
        return <CheckCircle className={styles.iconClass} />;
      case 'info':
      default:
        return <Info className={styles.iconClass} />;
    }
  };

  const isConfirmDisabled = loading || (!!confirmationText && typedConfirmation !== confirmationText);

  // Clear typed confirmation on open/close change
  useEffect(() => {
    if (!open) {
      setTypedConfirmation('');
    }
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleBackdropClick}
          />

          {/* Modal Container */}
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            className={`relative w-full max-w-[440px] rounded-3xl border border-white/10 bg-[#070c19]/95 p-6 md:p-8 text-white focus:outline-none overflow-hidden ${styles.borderClass}`}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Glow sutil */}
            <div className={styles.glowClass} />

            {/* Header Content */}
            <div className="flex flex-col items-center text-center">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${styles.iconWrapperClass}`}>
                {getIcon()}
              </div>

              <h3 className="text-xl font-bold tracking-tight text-slate-100">
                {title}
              </h3>
              
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Text Confirmation Input */}
            {confirmationText && (
              <div className="mt-6">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Para confirmar, digite <span className="text-red-400 font-bold select-none">{confirmationText}</span> abaixo:
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 transition-all"
                  placeholder={`Digite ${confirmationText}`}
                />
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none transition-all ${styles.confirmButtonClass}`}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
