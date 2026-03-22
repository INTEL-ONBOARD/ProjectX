import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { User } from '../../types';

interface Props {
  onClose: () => void;
  onSubmit: (member: Omit<User, 'id'>) => Promise<void> | void;
}

const InviteMemberModal: React.FC<Props> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<User['role']>('member');
  const [designation, setDesignation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), role, designation: designation.trim(), status: 'active' });
      onClose();
    } catch (err) {
      setError('Failed to add member. Please try again.');
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-primary-500" />
            <span className="font-bold text-gray-900 text-sm">Invite Member</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email *</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="e.g. priya@techcorp.com"
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Role</label>
            <select
              value={role} onChange={e => setRole(e.target.value as User['role'])}
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-primary-400 bg-white"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="member">Member</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Designation</label>
            <input
              value={designation} onChange={e => setDesignation(e.target.value)}
              placeholder="e.g. Frontend Developer"
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          >
            {loading ? 'Adding...' : 'Send Invite'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default InviteMemberModal;
