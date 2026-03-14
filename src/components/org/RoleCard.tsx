import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock, Trash2 } from 'lucide-react';
import { RoleDoc } from '../../context/RolesContext';
import { RolePerms } from '../../context/RolePermsContext';
import { PROJECT_COLORS } from '../../data/mockData';

interface AuthUserRow { id: string; name: string; email: string; role: string; }

interface Props {
    role: RoleDoc;
    isAdmin: boolean;           // true = this is the locked admin card
    expanded: boolean;
    onToggle: () => void;
    authUsers: AuthUserRow[];
    perms: RolePerms[];
    totalRoutes: number;
    getMemberColor: (id: string) => string;
    onRename: (appId: string, newName: string) => Promise<void>;
    onColorChange: (appId: string, color: string) => Promise<void>;
    onDelete: (appId: string, name: string) => Promise<void>;
}

export const RoleCard: React.FC<Props> = ({
    role, isAdmin, expanded, onToggle, authUsers, perms, totalRoutes,
    getMemberColor, onRename, onColorChange, onDelete,
}) => {
    const [nameValue, setNameValue] = useState(role.name);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setNameValue(role.name); }, [role.name]);

    const members = authUsers.filter(u => u.role === role.name);
    const allowedRoutes = perms.find(p => p.role === role.name)?.allowedRoutes ?? ['/settings'];
    const coveragePct = totalRoutes > 0 ? (allowedRoutes.length / totalRoutes) * 100 : 0;

    const handleNameBlur = async () => {
        const trimmed = nameValue.trim();
        if (!trimmed || trimmed === role.name) { setNameValue(role.name); return; }
        try { await onRename(role.appId, trimmed); }
        catch { setNameValue(role.name); }
    };

    const handleColorClick = async (color: string) => {
        try { await onColorChange(role.appId, color); }
        catch { /* error handled by parent */ }
    };

    const handleDelete = async () => {
        try { await onDelete(role.appId, role.name); }
        catch { setConfirmDelete(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            {/* Collapsed header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-50 transition-colors text-left"
            >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: role.color }} />
                <span className="flex-1 font-semibold text-gray-900 text-sm capitalize">{role.name}</span>
                {isAdmin && <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 rounded-full bg-surface-100 border border-surface-200 flex items-center gap-1"><Lock size={9} /> System role</span>}
                <span className="text-xs text-gray-400 shrink-0">{members.length} user{members.length !== 1 ? 's' : ''}</span>
                {/* Coverage bar */}
                <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${coveragePct}%`, background: role.color }} />
                </div>
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} className="text-gray-400" />
                </motion.div>
            </button>

            {/* Expanded body */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="px-5 pb-5 pt-1 border-t border-surface-100 flex flex-col gap-4">
                            {isAdmin ? (
                                <p className="text-xs text-gray-400 italic">Admin has full access and cannot be modified.</p>
                            ) : (
                                <>
                                    {/* Name */}
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Role Name</label>
                                        <input
                                            ref={nameRef}
                                            value={nameValue}
                                            onChange={e => setNameValue(e.target.value)}
                                            onBlur={handleNameBlur}
                                            onKeyDown={e => { if (e.key === 'Enter') nameRef.current?.blur(); if (e.key === 'Escape') { setNameValue(role.name); nameRef.current?.blur(); } }}
                                            className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                                        />
                                    </div>
                                    {/* Color */}
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Color</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {PROJECT_COLORS.map(c => (
                                                <button
                                                    key={c} type="button"
                                                    onClick={() => handleColorClick(c)}
                                                    className={`w-7 h-7 rounded-full transition-all ${role.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Members */}
                            {members.length > 0 && (
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Members ({members.length})</label>
                                    <div className="flex flex-wrap gap-2">
                                        {members.map(m => (
                                            <div key={m.id} className="flex items-center gap-1.5 bg-surface-50 rounded-full px-2.5 py-1">
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: getMemberColor(m.id) }}>{m.name.charAt(0).toUpperCase()}</div>
                                                <span className="text-xs text-gray-700 font-medium">{m.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Delete */}
                            {!isAdmin && (
                                <div className="pt-1 border-t border-surface-100">
                                    {confirmDelete ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 flex-1">Delete role "{role.name}"?</span>
                                            <button onClick={handleDelete} className="text-xs font-bold text-red-500 hover:text-red-700 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">Confirm</button>
                                            <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 transition-colors">Cancel</button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDelete(true)}
                                            disabled={members.length > 0}
                                            title={members.length > 0 ? 'Reassign all users first' : undefined}
                                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${members.length > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
                                        >
                                            <Trash2 size={12} /> Delete Role
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
