export interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  variant?: 'destructive' | 'warning' | 'info' | 'success';
  destructiveLevel?: 'normal' | 'critical';
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  confirmationText?: string; // e.g. "RESETAR"
  preventCloseOnLoading?: boolean;
  disablePortal?: boolean;
}
