export interface VariantStyles {
  iconWrapperClass: string;
  iconClass: string;
  borderClass: string;
  confirmButtonClass: string;
  glowClass: string;
}

export const getModalVariantStyles = (
  variant: 'destructive' | 'warning' | 'info' | 'success' = 'info',
  destructiveLevel: 'normal' | 'critical' = 'normal'
): VariantStyles => {
  switch (variant) {
    case 'destructive':
      if (destructiveLevel === 'critical') {
        return {
          iconWrapperClass: 'bg-red-950/40 border border-purple-500/30 text-red-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] animate-pulse',
          iconClass: 'h-6 w-6 text-red-400',
          borderClass: 'border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15),0_0_50px_rgba(168,85,247,0.15)]',
          confirmButtonClass: 'bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white shadow-lg shadow-red-500/20 focus:ring-purple-500 border border-purple-500/20',
          glowClass: 'absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-r from-red-500 to-purple-600 opacity-20 blur-[40px] pointer-events-none'
        };
      }
      return {
        iconWrapperClass: 'bg-red-950/30 border border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
        iconClass: 'h-6 w-6 text-red-500',
        borderClass: 'border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]',
        confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
        glowClass: 'absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-red-500 opacity-15 blur-[40px] pointer-events-none'
      };

    case 'warning':
      return {
        iconWrapperClass: 'bg-amber-950/30 border border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
        iconClass: 'h-6 w-6 text-amber-500',
        borderClass: 'border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.1)]',
        confirmButtonClass: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
        glowClass: 'absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500 opacity-15 blur-[40px] pointer-events-none'
      };

    case 'success':
      return {
        iconWrapperClass: 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        iconClass: 'h-6 w-6 text-emerald-500',
        borderClass: 'border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]',
        confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
        glowClass: 'absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500 opacity-15 blur-[40px] pointer-events-none'
      };

    case 'info':
    default:
      return {
        iconWrapperClass: 'bg-blue-950/30 border border-blue-500/20 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
        iconClass: 'h-6 w-6 text-blue-500',
        borderClass: 'border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]',
        confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
        glowClass: 'absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-blue-500 opacity-15 blur-[40px] pointer-events-none'
      };
  }
};
