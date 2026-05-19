import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ShieldAlert, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  destructiveLevel?: "warning" | "high" | "critical";
  confirmationText?: string;
  isLoading?: boolean;
  preventCloseOnLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  destructiveLevel = "high",
  confirmationText,
  isLoading = false,
  preventCloseOnLoading = true,
}: ConfirmationModalProps) {
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Limpa o input de confirmação quando o modal abre ou fecha
  useEffect(() => {
    if (isOpen) {
      setTypedConfirmation("");
      // Dar foco inicial ao botão Cancelar para evitar exclusões acidentais no ENTER rápido
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (confirmationText && typedConfirmation !== confirmationText) return;
    if (isLoading) return;
    await onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  const isConfirmationInvalid = confirmationText ? typedConfirmation !== confirmationText : false;
  const isConfirmDisabled = isLoading || isConfirmationInvalid;

  // Tratar submissão via atalho ENTER no input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isConfirmDisabled) {
      e.preventDefault();
      handleConfirm();
    }
  };

  // Níveis de design destrutivo ou de segurança
  const getAlertStyles = () => {
    if (variant === "default") {
      return {
        iconContainer: "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
        icon: <Sparkles className="h-8 w-8 text-primary animate-pulse" />,
        accentColor: "border-primary/20 focus-visible:ring-primary shadow-primary/20 bg-primary hover:bg-primary/95",
        accentGlow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",
      };
    }

    switch (destructiveLevel) {
      case "warning":
        return {
          iconContainer: "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
          icon: <AlertTriangle className="h-8 w-8 text-amber-500" />,
          accentColor: "border-amber-500/20 focus-visible:ring-amber-500 bg-amber-500 hover:bg-amber-600 text-slate-950",
          accentGlow: "shadow-[0_0_20px_rgba(245,158,11,0.25)]",
        };
      case "critical":
        return {
          iconContainer: "bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse",
          icon: <ShieldAlert className="h-8 w-8 text-purple-500" />,
          accentColor: "border-purple-500/20 focus-visible:ring-purple-500 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white",
          accentGlow: "shadow-[0_0_25px_rgba(239,68,68,0.4)] border border-red-500/30",
        };
      case "high":
      default:
        return {
          iconContainer: "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          accentColor: "border-red-500/20 focus-visible:ring-red-500 bg-red-500 hover:bg-red-600 text-white",
          accentGlow: "shadow-[0_0_20px_rgba(239,68,68,0.25)]",
        };
    }
  };

  const design = getAlertStyles();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (preventCloseOnLoading && isLoading) return;
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        onPointerDownOutside={(e) => {
          if (preventCloseOnLoading && isLoading) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (preventCloseOnLoading && isLoading) e.preventDefault();
        }}
        className="sm:max-w-[440px] rounded-[2rem] border border-white/10 shadow-2xl p-0 overflow-hidden bg-[#081225]/95 backdrop-blur-xl transition-all duration-200 shadow-[0_0_60px_rgba(59,130,246,0.12)] text-white"
      >
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.20, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex flex-col"
            >
              <div className="p-8 flex-1">
                <DialogHeader className="flex flex-col items-center text-center space-y-5">
                  <div className={`p-4 rounded-3xl transition-transform ${design.iconContainer}`}>
                    {design.icon}
                  </div>
                  <DialogTitle className="text-2xl font-black tracking-tight text-white">{title}</DialogTitle>
                  <DialogDescription className="text-slate-400 text-base leading-relaxed">
                    {description}
                  </DialogDescription>
                </DialogHeader>

                {/* Exibição de input de texto caso confirmação textual seja necessária */}
                {confirmationText && (
                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-400 text-center">
                      Digite exatamente <span className="font-black bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{confirmationText}</span> para confirmar
                    </p>
                    <Input
                      type="text"
                      disabled={isLoading}
                      value={typedConfirmation}
                      onChange={(e) => setTypedConfirmation(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={confirmationText}
                      className="w-full h-12 bg-slate-950/40 border-white/10 rounded-2xl text-center font-bold text-white tracking-widest uppercase placeholder:text-slate-600 focus:border-red-500/40 focus:ring-1 focus:ring-red-500/30 transition-all text-base"
                    />
                  </div>
                )}
              </div>

              <div className="bg-slate-950/50 p-6 flex flex-row gap-3 sm:justify-center border-t border-white/5">
                <Button
                  ref={cancelButtonRef}
                  variant="ghost"
                  disabled={isLoading}
                  onClick={onClose}
                  className="flex-1 rounded-full h-12 font-bold bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all text-sm"
                >
                  {cancelLabel}
                </Button>
                <Button
                  ref={confirmButtonRef}
                  disabled={isConfirmDisabled}
                  onClick={handleConfirm}
                  className={`flex-1 rounded-full h-12 font-bold shadow-lg text-sm transition-all flex items-center justify-center ${design.accentColor} ${!isConfirmDisabled ? design.accentGlow : "opacity-40"}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Aguarde...
                    </>
                  ) : (
                    confirmLabel
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
