import React from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, actions, meta }) => (
  <motion.div
    className="flex items-center justify-between"
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
  >
    <div className="min-w-0">
      <h1 className="text-[32px] font-bold leading-tight tracking-tight text-gray-900">{title}</h1>
      {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
      {meta && <div className="flex items-center gap-2 mt-1">{meta}</div>}
    </div>
    {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
  </motion.div>
);

export default PageHeader;
