import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Pencil,
    Link2,
    UserPlus,
    SlidersHorizontal,
    Calendar,
    Share2,
    LayoutGrid,
    List,
} from 'lucide-react';
import { teamMembers, memberColors } from '../../data/mockData';
import { Avatar, AvatarGroup } from '../ui/Avatar';

interface ProjectHeaderProps {
    projectName?: string;
    projectId?: string;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ projectName }) => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const handleEditName = () => {
        const name = window.prompt('Rename project:', projectName);
        if (name?.trim()) window.alert(`Project renamed to "${name.trim()}". (Persist via backend once integrated.)`);
    };

    const handleCopyLink = () => {
        const url = window.location.href;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => window.alert('Project link copied to clipboard!'));
        } else {
            window.alert(`Project link: ${url}`);
        }
    };

    return (
        <motion.div
            className="px-8 pt-6 pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
        >
            {/* Title row */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <motion.h1
                        className="text-[42px] font-bold text-gray-900 tracking-tight leading-none"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        {projectName}
                    </motion.h1>
                    <div className="flex items-center gap-1.5 mt-2">
                        <motion.button
                            onClick={handleEditName}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <Pencil size={16} />
                        </motion.button>
                        <motion.button
                            onClick={handleCopyLink}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <Link2 size={16} />
                        </motion.button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <motion.button
                        onClick={() => navigate('/members')}
                        className="flex items-center gap-2 px-4 py-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors text-sm font-semibold"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <UserPlus size={18} />
                        Invite
                    </motion.button>
                    <AvatarGroup
                        names={teamMembers.map((m) => m.name)}
                        colors={memberColors}
                        size="md"
                        max={4}
                    />
                </div>
            </div>

            {/* Filter row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <motion.button
                        onClick={() => window.alert('Filter by assignee, priority, or date — coming soon.')}
                        className="flex items-center gap-2 px-4 py-2 border border-surface-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-surface-100 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <SlidersHorizontal size={16} />
                        Filter
                    </motion.button>
                    <motion.button
                        onClick={() => window.alert('Jump to today\'s tasks — coming soon.')}
                        className="flex items-center gap-2 px-4 py-2 border border-surface-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-surface-100 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Calendar size={16} />
                        Today
                    </motion.button>
                </div>

                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={handleCopyLink}
                        className="flex items-center gap-2 px-4 py-2 border border-surface-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-surface-100 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Share2 size={16} />
                        Share
                    </motion.button>
                    <div className="flex items-center bg-surface-100 rounded-lg p-1">
                        <motion.button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <LayoutGrid size={16} />
                        </motion.button>
                        <motion.button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <List size={16} />
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ProjectHeader;
