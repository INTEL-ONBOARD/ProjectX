import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  iconClassName: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, hint, icon: Icon, iconClassName }) => (
  <motion.div
    className="rounded-xl border border-surface-200 bg-white px-4 py-4"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-gray-400">{hint}</p>}
      </div>
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
        <Icon size={18} />
      </div>
    </div>
  </motion.div>
);

export default MetricCard;
