import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, ChevronRight, CheckCircle2, AlertCircle, Lightbulb, MessageSquare } from 'lucide-react';

type IssueType = 'bug' | 'feature' | 'other';

const issueTypes: { id: IssueType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: 'bug', label: 'Bug', icon: AlertCircle, color: 'text-[#D8727D]', bg: 'bg-[#D8727D]' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-[#FFA500]', bg: 'bg-[#FFA500]' },
  { id: 'other', label: 'Other', icon: MessageSquare, color: 'text-primary-500', bg: 'bg-primary-500' },
];

const BugReportModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  // Listen for external open trigger (e.g. from Sidebar)
  React.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-bug-report', handler);
    return () => window.removeEventListener('open-bug-report', handler);
  }, []);
  const [type, setType] = useState<IssueType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const activeType = issueTypes.find(t => t.id === type) ?? issueTypes[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitted(true);
    timerRef.current = setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setTitle('');
      setDescription('');
      setType('bug');
    }, 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setSubmitted(false);
    setTitle('');
    setDescription('');
    setType('bug');
  };

  return (
    <>
      {/* Backdrop + Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 top-16 z-50 bg-black/30 backdrop-blur-[2px]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
            />

            {/* Modal card */}
            <motion.div
              className="fixed z-50 inset-0 top-16 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
                initial={{ scale: 0.94, y: 12, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.94, y: 12, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <AnimatePresence mode="wait">
                  {submitted ? (
                    /* Success state */
                    <motion.div
                      key="success"
                      className="flex flex-col items-center justify-center py-14 px-8 text-center"
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                    >
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                      >
                        <CheckCircle2 size={48} className="text-[#68B266] mb-4" />
                      </motion.div>
                      <div className="text-gray-900 font-bold text-lg mb-1">Thanks for the report!</div>
                      <div className="text-gray-400 text-sm">We'll look into it and get back to you.</div>
                    </motion.div>
                  ) : (
                    /* Form state */
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-100">
                        <div className={`w-8 h-8 rounded-xl ${activeType.bg} bg-opacity-10 flex items-center justify-center transition-colors duration-200`}>
                          <activeType.icon size={15} className={`${activeType.color} transition-colors duration-200`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 text-sm">Report an Issue</div>
                          <div className="text-[11px] text-gray-400">Help us improve the app</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClose}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {/* Body */}
                      <div className="px-6 py-5 flex flex-col gap-4">

                        {/* Issue type pills */}
                        <div>
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Issue Type</div>
                          <div className="flex gap-2">
                            {issueTypes.map(t => {
                              const active = type === t.id;
                              return (
                                <motion.button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setType(t.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                    active
                                      ? 'border-transparent text-white shadow-sm'
                                      : 'border-surface-200 text-gray-500 bg-white hover:border-surface-300 hover:text-gray-700'
                                  }`}
                                  style={active ? { backgroundColor: t.id === 'bug' ? '#D8727D' : t.id === 'feature' ? '#FFA500' : '#5030e5' } : {}}
                                  whileTap={{ scale: 0.96 }}
                                >
                                  <t.icon size={12} />
                                  {t.label}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Title */}
                        <div>
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Title</div>
                          <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Short description of the issue…"
                            required
                            className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:bg-white transition-colors"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Details <span className="normal-case font-normal text-gray-400">(optional)</span></div>
                          <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Steps to reproduce, expected vs actual behavior…"
                            rows={3}
                            className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:bg-white transition-colors resize-none"
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="px-6 pb-5 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">Your report goes directly to the team</span>
                        <motion.button
                          type="submit"
                          disabled={!title.trim()}
                          className="flex items-center gap-1.5 bg-primary-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          whileHover={{ scale: title.trim() ? 1.03 : 1 }}
                          whileTap={{ scale: title.trim() ? 0.97 : 1 }}
                        >
                          Send Report
                          <ChevronRight size={13} />
                        </motion.button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default BugReportModal;
