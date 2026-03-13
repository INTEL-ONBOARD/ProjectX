import React from 'react';

interface AvatarProps {
    name: string;
    color: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeMap = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-14 h-14 text-base',
};

export const Avatar: React.FC<AvatarProps> = ({ name, color, size = 'md', className = '' }) => {
    const initials = name
        .split(' ')
        .filter((n) => n.length > 0)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';

    return (
        <div
            className={`${sizeMap[size]} rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
            style={{ backgroundColor: color }}
            title={name}
        >
            {initials}
        </div>
    );
};

interface AvatarGroupProps {
    names: string[];
    colors: string[];
    size?: 'sm' | 'md';
    max?: number;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
    names,
    colors,
    size = 'sm',
    max = 4,
}) => {
    const visibleNames = names.slice(0, max);
    const remaining = names.length - max;

    return (
        <div className="flex items-center -space-x-2">
            {visibleNames.map((name, i) => (
                <Avatar
                    key={i}
                    name={name}
                    color={colors.length > 0 ? colors[i % colors.length] : '#8B5CF6'}
                    size={size}
                    className="ring-2 ring-white"
                />
            ))}
            {remaining > 0 && (
                <div
                    className={`${size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
                        } rounded-full bg-primary-500 text-white flex items-center justify-center font-semibold ring-2 ring-white`}
                >
                    +{remaining}
                </div>
            )}
        </div>
    );
};
