interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center select-none">
      <div className="mb-4 opacity-30">{icon}</div>
      <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-sm mb-5 max-w-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
