import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Paperclip, Send } from 'lucide-react';
import { Task } from '../../types';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import { useMembersContext } from '../../context/MembersContext';

interface TaskModalProps {
    task: Task | null;
    onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
    const { members, getMemberColor } = useMembersContext();
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState<{ id: string; userId: string; author: string; text: string }[]>([]);

    const assigneeNames = task?.assignees.map(
        (id) => members.find((m) => m.id === id)?.name ?? 'Unknown'
    ) ?? [];
    const assigneeColors = task?.assignees.map(id => getMemberColor(id)) ?? [];

    const handleAddComment = () => {
        if (comment.trim()) {
            setComments([
                ...comments,
                { id: String(comments.length + 1), userId: 'u1', author: 'You', text: comment },
            ]);
            setComment('');
        }
    };

    return (
        <AnimatePresence>
            {task && (
                <motion.div
                    className="fixed inset-0 top-16 bg-black/50 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-surface-200">
                            <div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${task.priority === 'low' ? 'bg-amber-100 text-amber-700' :
                                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                            'bg-green-100 text-green-700'
                                    }`}>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                            </div>
                            <motion.button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                                whileHover={{ scale: 1.1 }}
                            >
                                <X size={24} />
                            </motion.button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h2>
                            <p className="text-gray-600 mb-6">{task.description}</p>

                            {/* Meta info */}
                            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-surface-50 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500 font-semibold mb-1">ASSIGNEES</p>
                                    <AvatarGroup names={assigneeNames} colors={assigneeColors} size="sm" max={3} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-semibold mb-1">STATUS</p>
                                    <span className="text-sm font-semibold text-gray-700">{task.status}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-semibold mb-1">COMMENTS</p>
                                    <span className="text-sm font-semibold text-gray-700">{task.comments}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-semibold mb-1">ATTACHMENTS</p>
                                    <span className="text-sm font-semibold text-gray-700">{task.files} files</span>
                                </div>
                            </div>

                            {/* Comments section */}
                            <div className="mt-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <MessageCircle size={18} />
                                    Comments ({comments.length})
                                </h3>

                                <div className="space-y-4 mb-6 max-h-48 overflow-y-auto">
                                    {comments.map((c) => (
                                        <div key={c.id} className="flex gap-3">
                                            <Avatar name={c.author} color="#5030E5" size="sm" />
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">{c.author}</p>
                                                <p className="text-gray-700 text-sm">{c.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Comment input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add a comment..."
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                        className="flex-1 px-4 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <motion.button
                                        onClick={handleAddComment}
                                        className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <Send size={18} />
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TaskModal;
