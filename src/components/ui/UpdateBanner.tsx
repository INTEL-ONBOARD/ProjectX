import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAppUpdater } from '../../hooks/useAppUpdater';

const UpdateBanner: React.FC = () => {
    const { state, installUpdate, dismiss } = useAppUpdater();
    const { status, version, progress } = state;

    const visible = status === 'available' || status === 'downloading' || status === 'downloaded' || status === 'error';

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="fixed bottom-5 right-5 z-[200] w-80"
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden">
                        {/* Top accent bar */}
                        <div className={`h-1 w-full ${status === 'error' ? 'bg-red-400' : status === 'downloaded' ? 'bg-[#68B266]' : 'bg-primary-500'}`} />

                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    status === 'error' ? 'bg-red-50' :
                                    status === 'downloaded' ? 'bg-[#68B26615]' :
                                    'bg-primary-50'
                                }`}>
                                    {status === 'error' ? (
                                        <AlertTriangle size={16} className="text-red-500" />
                                    ) : status === 'downloaded' ? (
                                        <CheckCircle2 size={16} className="text-[#68B266]" />
                                    ) : status === 'downloading' ? (
                                        <Download size={16} className="text-primary-500" />
                                    ) : (
                                        <RefreshCw size={16} className="text-primary-500" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 leading-snug">
                                        {status === 'error' ? 'Update failed' :
                                         status === 'downloaded' ? `v${version} ready to install` :
                                         status === 'downloading' ? 'Downloading update…' :
                                         `Update available — v${version}`}
                                    </div>
                                    <div className="text-[11px] text-gray-400 mt-0.5">
                                        {status === 'error' ? state.errorMessage ?? 'An error occurred.' :
                                         status === 'downloaded' ? 'Restart the app to apply the update.' :
                                         status === 'downloading' ? `${progress ?? 0}% complete` :
                                         'A new version of ProjectX is available.'}
                                    </div>

                                    {/* Progress bar */}
                                    {status === 'downloading' && (
                                        <div className="mt-2 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-primary-500 rounded-full"
                                                initial={{ width: '0%' }}
                                                animate={{ width: `${progress ?? 0}%` }}
                                                transition={{ ease: 'linear', duration: 0.3 }}
                                            />
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    {(status === 'available' || status === 'downloaded') && (
                                        <div className="mt-2.5 flex items-center gap-2">
                                            {status === 'downloaded' ? (
                                                <button
                                                    onClick={installUpdate}
                                                    className="px-3 py-1.5 bg-primary-500 text-white text-xs font-semibold rounded-lg hover:bg-primary-600 transition-colors"
                                                >
                                                    Restart & install
                                                </button>
                                            ) : (
                                                <span className="text-[11px] text-gray-400">Downloading automatically…</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Dismiss */}
                                {status !== 'downloading' && (
                                    <button
                                        onClick={dismiss}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors shrink-0"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default UpdateBanner;
