import { ConfirmationModal as UpgradedModal } from '../modals/ConfirmationModal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  destructiveLevel?: 'normal' | 'critical';
  confirmationText?: string;
  isLoading?: boolean;
  preventCloseOnLoading?: boolean;
  disablePortal?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  destructiveLevel = 'normal',
  confirmationText,
  isLoading = false,
  preventCloseOnLoading = true,
  disablePortal = false,
}: ConfirmationModalProps) {
  // Map "danger" variant to "destructive" for the new modal
  const mappedVariant = variant === 'danger' ? 'destructive' : variant;

  return (
    <UpgradedModal
      open={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      confirmText={confirmLabel}
      cancelText={cancelLabel}
      variant={mappedVariant}
      destructiveLevel={destructiveLevel}
      confirmationText={confirmationText}
      loading={isLoading}
      preventCloseOnLoading={preventCloseOnLoading}
      disablePortal={disablePortal}
    />
  );
}
