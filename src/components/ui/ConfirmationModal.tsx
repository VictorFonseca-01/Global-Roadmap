import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";


interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
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
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-8">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className={`p-4 rounded-full ${variant === 'destructive' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
              <AlertTriangle className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-base">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <DialogFooter className="bg-slate-50 dark:bg-slate-950 p-6 flex flex-row gap-3 sm:justify-center border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 rounded-full h-12 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 rounded-full h-12 font-bold shadow-lg transition-all ${variant === 'destructive' ? 'shadow-red-500/20' : 'shadow-primary/20'}`}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
