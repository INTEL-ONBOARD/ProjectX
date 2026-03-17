import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Paperclip, Send, Download, Trash2 } from 'lucide-react';
import { Task, Comment, Attachment } from '../../types';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import { useMembersContext } from '../../context/MembersContext';
import { useAuth } from '../../context/AuthContext';

const dbApi = () => (window as any).electronAPI.db;

function fmtSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

interface TaskModalProps {
    task: Task | null;
    onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
    const { members, getMemberColor } = useMembersContext();
    const { user: authUser } = useAuth() ?? { user: null };
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    useEffect(() => {
        if (!task) return;
        setLoadingComments(true);
        dbApi().getComments(task.id).then((data: any) => {
            setComments(data as Comment[]);
            setLoadingComments(false);
        });
    }, [task?.id]);

    useEffect(() => {
        if (!task) return;
        dbApi().getAttachments(task.id).then((data: any) => setAttachments(data as Attachment[]));
    }, [task?.id]);

    useEffect(() => {
        if (!task) return;
        const eApi = (window as any).electronAPI;
        const unsubComment = eApi.onCommentChanged((_: unknown, payload: { op: string; doc?: any; id?: string }) => {
            const { op, doc, id } = payload;
            if (op === 'insert' && doc?.taskId === task.id) {
                setComments(prev => prev.some(c => c.id === doc.id) ? prev : [...prev, doc as Comment]);
            } else if (op === 'delete' && id) {
                setComments(prev => prev.filter(c => c.id !== id));
            }
        });
        const unsubAttachment = eApi.onAttachmentChanged((_: unknown, payload: { op: string; doc?: any; id?: string }) => {
            const { op, doc, id } = payload;
            if (op === 'insert' && doc?.taskId === task.id) {
                setAttachments(prev => prev.some(a => a.id === doc.id) ? prev : [...prev, doc as Attachment]);
            } else if (op === 'delete' && id) {
                setAttachments(prev => prev.filter(a => a.id !== id));
            }
        });
        return () => { unsubComment(); unsubAttachment(); };
    }, [task?.id]);

    const assigneeNames = task?.assignees.map(
        (id) => members.find((m) => m.id === id)?.name ?? 'Unknown'
    ) ?? [];
    const assigneeColors = task?.assignees.map(id => getMemberColor(id)) ?? [];

    const handleAddComment = async () => {
        if (!comment.trim() || !task || !authUser) return;
        const newComment = await dbApi().addComment({
            taskId: task.id,
            authorId: authUser.id,
            authorName: authUser.name,
            text: comment.trim(),
        }) as Comment;
        setComments(prev => [...prev, newComment]);
        setComment('');
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
                        className="bg-surface-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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
                                        task.priority === 'medium' ? 'bg-purple-100 text-purple-700' :
                                            'bg-green-100 text-green-700'
                                    }`}>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                                <span className={`ml-2 text-xs font-semibold px-2.5 py-1 rounded-md ${task.taskType === 'issue' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {task.taskType === 'issue' ? 'Issue' : 'Task'}
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
                                    <span className="text-sm font-semibold text-gray-700">{attachments.length} files</span>
                                </div>
                            </div>

                            {/* Attachments section */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                        <Paperclip size={15} /> Attachments ({attachments.length})
                                    </h3>
                                    <button
                                        onClick={async () => {
                                            const added = await dbApi().pickAttachments(task!.id) as Attachment[];
                                            setAttachments(prev => [...prev, ...added]);
                                        }}
                                        className="text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors"
                                    >
                                        + Attach File
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {attachments.map(a => (
                                        <div key={a.id} className="flex items-center gap-2 p-2 bg-surface-50 rounded-lg border border-surface-200">
                                            <Paperclip size={13} className="text-gray-400 shrink-0" />
                                            <span className="flex-1 text-xs text-gray-700 truncate font-medium">{a.name}</span>
                                            <span className="text-[10px] text-gray-400">{fmtSize(a.size)}</span>
                                            <button onClick={() => dbApi().openAttachment(a.filePath)} className="text-gray-400 hover:text-primary-500 transition-colors">
                                                <Download size={13} />
                                            </button>
                                            <button onClick={async () => { await dbApi().deleteAttachment(a.id); setAttachments(prev => prev.filter(x => x.id !== a.id)); }} className="text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Comments section */}
                            <div className="mt-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <MessageCircle size={18} />
                                    Comments ({comments.length})
                                </h3>

                                <div className="space-y-4 mb-6 max-h-48 overflow-y-auto">
                                    {loadingComments ? (
                                        <p className="text-xs text-gray-400">Loading...</p>
                                    ) : comments.map((c) => (
                                        <div key={c.id} className="flex gap-3">
                                            <Avatar name={c.authorName} color="#5030E5" size="sm" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-900 text-sm">{c.authorName}</p>
                                                    <p className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</p>
                                                </div>
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
