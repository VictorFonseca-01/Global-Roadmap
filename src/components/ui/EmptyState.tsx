import { type LucideIcon } from "lucide-react";
import { Button } from "./button";
import { motion } from "framer-motion";


interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800"
    >
      <div className="p-6 bg-white dark:bg-slate-950 rounded-full shadow-xl mb-6">
        <Icon className="h-12 w-12 text-primary" />
      </div>
      <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="rounded-full px-10 h-12 text-lg shadow-lg hover:shadow-primary/20 transition-all font-bold"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
