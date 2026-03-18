import React, { useState, useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Bell, Palette, Shield,
  Check, Clock, Moon, Sun, Monitor, Coffee,
  Smartphone, Mail, Eye, EyeOff, AlertTriangle,
  Download, Trash2,
  Link,
  Lock, Info, RefreshCw, CheckCircle2,
  LogOut, AtSign, Layers, BarChart2, MessageSquare,
  Users, HardDrive, Zap,
} from 'lucide-react';
import { useAppUpdater } from '../hooks/useAppUpdater';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AppContext } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useMembersContext } from '../context/MembersContext';
import { useProjects } from '../context/ProjectContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';


// ── IPC bridge ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = () => window as any;
const notifPrefsApi  = () => win().electronAPI.notifPrefs  as { get: (uid: string) => Promise<NotifPrefs | null>; set: (p: NotifPrefs & { userId: string }) => Promise<void> };
const appearApi      = () => win().electronAPI.appearancePrefs as { get: (uid: string) => Promise<AppearPrefs | null>; set: (p: AppearPrefs & { userId: string }) => Promise<void> };
const authApi        = () => win().electronAPI.auth as { updateName: (userId: string, newName: string) => Promise<void> };

// ── Notification defaults ────────────────────────────────────────────────────

const defaultNotifications: NotifPrefs = {
  taskUpdates: true, teamMentions: true, weeklyDigest: false,
  emailNotifs: true, pushNotifs: true, smsNotifs: false,
  projectUpdates: true, securityAlerts: true, quietHours: true,
};

type NotifPrefs = {
  taskUpdates: boolean; teamMentions: boolean; weeklyDigest: boolean;
  emailNotifs: boolean; pushNotifs: boolean; smsNotifs: boolean;
  projectUpdates: boolean; securityAlerts: boolean; quietHours: boolean;
};

type AppearPrefs = {
  themeMode: 'light' | 'dark' | 'coffee' | 'system';
  accentColor: string;
  fontSize: 'sm' | 'md' | 'lg';
  compactMode: boolean;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const Toggle: React.FC<{ on: boolean; onChange?: () => void }> = ({ on, onChange }) => (
  <button
    onClick={onChange}
    className={`relative focus:outline-none transition-all duration-200 rounded-full ${on ? 'bg-primary-500' : 'bg-surface-300'}`}
    style={{ width: 40, height: 22 }}
  >
    <div className={`w-4 h-4 bg-white rounded-full absolute top-[3px] transition-all duration-200 ${on ? 'right-[3px]' : 'left-[3px]'}`} />
  </button>
);


// ── Password strength ────────────────────────────────────────────────────────

function calcStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '#E0E0E0' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score: 1, label: 'Weak', color: '#D8727D' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#FFA500' };
  if (score === 3) return { score: 3, label: 'Good', color: '#30C5E5' };
  return { score: Math.min(score, 4), label: 'Strong', color: '#68B266' };
}

// ── SettingCard ───────────────────────────────────────────────────────────────

const SettingCard: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, children, action, className = '' }) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm ring-1 ring-surface-100 ${className}`}>
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

// ── InputField ────────────────────────────────────────────────────────────────

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
  suffix?: React.ReactNode;
}> = ({ label, value, onChange, onBlur, placeholder, readOnly, type = 'text', suffix }) => (
  <div>
    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-gray-900
          placeholder:text-gray-300 outline-none transition-all
          ${suffix ? 'pr-10' : ''}
          ${readOnly
            ? 'bg-surface-50 text-gray-400 cursor-not-allowed'
            : 'bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
          }`}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
      )}
    </div>
  </div>
);

const ACCENT_COLORS = [
  { hex: '#EF4444', label: 'Red' },
  { hex: '#F59E0B', label: 'Orange' },
  { hex: '#5030E5', label: 'Purple' },
  { hex: '#10B981', label: 'Green' },
  { hex: '#0EA5E9', label: 'Blue' },
  { hex: '#8B5CF6', label: 'Violet' },
];

// ── Section header ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="px-6 py-4 border-b border-surface-100">
    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
  </div>
);

// ── Field row ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  editable?: boolean;
  onSave?: (v: string) => void;
}

const FieldRow: React.FC<FieldRowProps> = ({ icon: Icon, label, value, editable, onSave }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => { setDraft(value); }, [value]);
  return (
    <div className="flex items-center gap-4 px-6 py-3.5 border-b border-surface-50 last:border-0 group hover:bg-surface-50 transition-colors">
      <Icon size={15} className="text-gray-400 shrink-0" />
      <span className="text-xs text-gray-400 w-28 shrink-0">{label}</span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onSave?.(draft); setEditing(false); }}
          onKeyDown={e => { if (e.key === 'Enter') { onSave?.(draft); setEditing(false); } if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
          className="flex-1 text-sm text-gray-700 bg-transparent border-b border-primary-300 focus:outline-none"
        />
      ) : (
        <span className="flex-1 text-sm text-gray-700">{value || '—'}</span>
      )}
      {editable && !editing && (
        <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-200">
          <Check size={12} className="text-gray-400" />
        </button>
      )}
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

// ── Nav groups for sidebar ────────────────────────────────────────────────────

const navGroups = [
  {
    label: 'Account',
    items: [
      { id: 'profile',       label: 'Profile',       icon: User    },
      { id: 'notifications', label: 'Notifications', icon: Bell    },
      { id: 'security',      label: 'Security',      icon: Shield  },
    ],
  },
  {
    label: 'App',
    items: [
      { id: 'appearance', label: 'Appearance', icon: Palette    },
      // { id: 'billing',    label: 'Billing',    icon: CreditCard },
      { id: 'about',      label: 'About',      icon: Info       },
    ],
  },
];

const SettingsPage: React.FC = () => {
  const { currentUser, theme, setTheme: setAppTheme } = useContext(AppContext);
  const { user: authUser, logout, updatePassword } = useAuth();
  const { updateMember, members } = useMembersContext();
  const { projects, allTasks } = useProjects();


  const { showToast } = useToast();

  const userColor = 'var(--color-primary-500, #5030E5)';

  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'appearance' | 'data' | 'about'>('account');
  const [confirmClear, setConfirmClear] = useState(false);
  const { state: updateState, checkForUpdate, installUpdate } = useAppUpdater();

  // Full member record from MembersContext — contains phone, department, bio, joinedAt
  // that AppContext.User does not carry.
  const fullMember = members.find(m => m.id === (currentUser?.id ?? authUser?.id));

  // Profile
  const [nameValue,       setNameValue]       = useState('');
  const [emailValue,      setEmailValue]      = useState('');
  const [locationValue,   setLocationValue]   = useState('');
  const [roleValue,       setRoleValue]       = useState('');
  const [phoneValue,      setPhoneValue]      = useState('');
  const [departmentValue, setDepartmentValue] = useState('');
  const [bioValue,        setBioValue]        = useState('');

  // Sync profile fields whenever the full member record loads or changes
  useEffect(() => {
    const src = fullMember ?? currentUser;
    if (!src) return;
    setNameValue(src.name || '');
    setEmailValue(src.email || '');
    setLocationValue(src.location || '');
    setRoleValue(src.designation || '');
    setPhoneValue((src as any).phone || '');
    setDepartmentValue((src as any).department || '');
    setBioValue((src as any).bio || '');
  }, [fullMember?.id, fullMember?.phone, fullMember?.department, fullMember?.bio, fullMember?.location, fullMember?.designation, currentUser?.id]);

  // Notifications — persisted to MongoDB (localStorage fallback in mock mode)
  const [notifications, setNotifications] = useState<NotifPrefs>(defaultNotifications);
  const notifLoaded = useRef(false);

  useEffect(() => {
    if (notifLoaded.current || !currentUser?.id) return;
    notifLoaded.current = true;
    notifPrefsApi().get(currentUser.id)
      .then(prefs => { if (prefs) setNotifications({ ...defaultNotifications, ...prefs }); })
      .catch((err: unknown) => console.error('[SettingsPage] Failed to load notif prefs:', err));
  }, [currentUser?.id]);

  // Appearance helpers — apply settings directly to the DOM
  const ACCENT_PALETTES: Record<string, Record<string, string>> = {
    '#5030E5': { 50:'#F0EDFF',100:'#E0DBFE',200:'#C2B7FD',300:'#A393FC',400:'#856FFB',500:'#5030E5',600:'#4024C4',700:'#301BA3',800:'#201182',900:'#100861' },
    '#0EA5E9': { 50:'#E0F4FD',100:'#BAE7FB',200:'#7DD4F8',300:'#39BFF4',400:'#0DB1E8',500:'#0EA5E9',600:'#0385C7',700:'#0267A0',800:'#044F7B',900:'#023B59' },
    '#10B981': { 50:'#D1FAF0',100:'#A5F3DC',200:'#6EE7C0',300:'#34D3A4',400:'#10C98E',500:'#10B981',600:'#059669',700:'#047857',800:'#065F46',900:'#064E3B' },
    '#F59E0B': { 50:'#FFFBEB',100:'#FEF3C7',200:'#FDE68A',300:'#FCD34D',400:'#FBBF24',500:'#F59E0B',600:'#D97706',700:'#B45309',800:'#92400E',900:'#78350F' },
    '#EF4444': { 50:'#FEF2F2',100:'#FEE2E2',200:'#FECACA',300:'#FCA5A5',400:'#F87171',500:'#EF4444',600:'#DC2626',700:'#B91C1C',800:'#991B1B',900:'#7F1D1D' },
    '#8B5CF6': { 50:'#F5F3FF',100:'#EDE9FE',200:'#DDD6FE',300:'#C4B5FD',400:'#A78BFA',500:'#8B5CF6',600:'#7C3AED',700:'#6D28D9',800:'#5B21B6',900:'#4C1D95' },
  };
  const applyAccentColor = (hex: string) => {
    const palette = ACCENT_PALETTES[hex];
    if (!palette) return;
    const root = document.documentElement;
    Object.entries(palette).forEach(([shade, value]) => {
      root.style.setProperty(`--color-primary-${shade}`, value);
    });
  };

  // Appearance — persisted to MongoDB (in-memory fallback in mock mode)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'coffee' | 'system'>(theme === 'coffee' ? 'coffee' : theme === 'dark' ? 'dark' : 'light');
  const [accentColor, setAccentColor] = useState('#5030E5');
  const [timezoneValue] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const appearLoaded = useRef(false);

  useEffect(() => {
    if (appearLoaded.current || !currentUser?.id) return;
    appearLoaded.current = true;
    appearApi().get(currentUser.id)
      .then(prefs => {
        if (!prefs) return;
        setThemeMode(prefs.themeMode);
        setAccentColor(prefs.accentColor);
        applyAccentColor(prefs.accentColor);
      })
      .catch((err: unknown) => console.error('[SettingsPage] Failed to load appearance prefs:', err));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time sync for notification and appearance prefs
  useEffect(() => {
    if (!currentUser?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;
    const unsubNotif = electronAPI.onNotifPrefChanged?.((_: unknown, payload: { doc?: NotifPrefs & { userId: string } }) => {
      if (payload.doc?.userId === currentUser.id) {
        setNotifications(prev => ({ ...prev, ...payload.doc }));
      }
    });
    const unsubAppear = electronAPI.onAppearancePrefChanged?.((_: unknown, payload: { doc?: AppearPrefs & { userId: string } }) => {
      if (payload.doc?.userId === currentUser.id) {
        if (payload.doc.themeMode) setThemeMode(payload.doc.themeMode);
        if (payload.doc.accentColor) { setAccentColor(payload.doc.accentColor); applyAccentColor(payload.doc.accentColor); }
      }
    });
    return () => { unsubNotif?.(); unsubAppear?.(); };
  }, [currentUser?.id]);

  // Security
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const strength = calcStrength(passwords.next);

  // System behavior
  const [runOnStartup,    setRunOnStartup]    = useState(true);
  const [runInBackground, setRunInBackground] = useState(true);
  const [systemNotifs,    setSystemNotifs]    = useState(true);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    if (!api) return;
    api.getLoginItemSettings?.()
      .then((s: { openAtLogin: boolean }) => {
        // If never set before (null/undefined treated as false by Electron), default to true and enable it
        if (!s || typeof s.openAtLogin !== 'boolean') {
          setRunOnStartup(true);
          api.setOpenAtLogin?.(true).catch(() => {});
        } else {
          setRunOnStartup(s.openAtLogin);
        }
      }).catch(() => {});
    api.getBackgroundMode?.()
      .then((v: boolean | null | undefined) => {
        if (v === null || v === undefined) {
          setRunInBackground(true);
          api.setBackgroundMode?.(true).catch(() => {});
        } else {
          setRunInBackground(v);
        }
      }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!currentUser?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    api?.getSystemNotifsEnabled?.(currentUser.id)
      .then((v: boolean | null | undefined) => {
        if (v === null || v === undefined) {
          setSystemNotifs(true);
          api?.setSystemNotifsEnabled?.(currentUser.id, true).catch(() => {});
        } else {
          setSystemNotifs(v);
        }
      }).catch(() => {});
  }, [currentUser?.id]);

  const toggleRunOnStartup = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    const next = !runOnStartup;
    setRunOnStartup(next);
    api?.setOpenAtLogin?.(next).catch(() => {});
  };

  const toggleRunInBackground = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    const next = !runInBackground;
    setRunInBackground(next);
    api?.setBackgroundMode?.(next).catch(() => {});
  };

  const toggleSystemNotifs = () => {
    if (!currentUser?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    const next = !systemNotifs;
    setSystemNotifs(next);
    api?.setSystemNotifsEnabled?.(currentUser.id, next).catch(() => {});
  };


  // Save feedback
  const [saved, setSaved] = useState(false);


  const saveAppearance = (patch: Partial<AppearPrefs>) => {
    if (currentUser?.id) {
      const current: AppearPrefs & { userId: string } = {
        userId: currentUser.id, themeMode, accentColor, fontSize: 'md', compactMode: false, ...patch,
      };
      appearApi().set(current)
        .catch((err: unknown) => console.error('[SettingsPage] Failed to save appearance prefs:', err));
    }
  };

  const toggleNotif = (key: keyof NotifPrefs) => {
    setNotifications(p => {
      const updated = { ...p, [key]: !p[key] };
      if (currentUser?.id) {
        notifPrefsApi().set({ userId: currentUser.id, ...updated })
          .catch((err: unknown) => console.error('[SettingsPage] Failed to save notif prefs:', err));
      }
      return updated;
    });
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (currentUser?.id) {
        const newName = nameValue.trim() || currentUser.name;
        await updateMember(currentUser.id, {
          name: newName,
          email: emailValue.trim() || currentUser.email,
          location: locationValue.trim() || undefined,
          designation: roleValue.trim() || undefined,
          phone: phoneValue.trim() || undefined,
          department: departmentValue.trim() || undefined,
          bio: bioValue.trim() || undefined,
        });
        await authApi().updateName(currentUser.id, newName);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        showToast('Profile saved!', 'success');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      showToast('Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleUpdatePassword = async () => {
    if (!passwords.current) { showToast('Please enter your current password.', 'error'); return; }
    if (passwords.next.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return; }
    if (passwords.next !== passwords.confirm) { showToast('New passwords do not match.', 'error'); return; }
    try {
      await updatePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      showToast('Password updated successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update password.', 'error');
    }
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}${window.location.pathname}#/members`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Profile link copied to clipboard!', 'success'));
    } else {
      showToast(`Share: ${url}`, 'info');
    }
  };

  const handleExportData = () => {
    showToast('Use Tasks → Export to download your task data as CSV.', 'info');
  };

  const handleDeleteAccount = () => {
    setConfirmDelete(true);
  };

  const isAdmin = authUser?.role === 'admin';

  const stats = [
    { label: 'Projects', value: projects.length, icon: Layers, bg: '#EDE9FE', color: '#7C3AED' },
    { label: 'Tasks', value: allTasks.filter(t => t.assignees?.includes(currentUser?.id ?? '')).length, icon: Check, bg: '#DCFCE7', color: '#16A34A' },
    { label: 'Team', value: members.length, icon: User, bg: '#DBEAFE', color: '#2563EB' },
  ];

  // ── Auto-save feedback ──────────────────────────────────────────────────────
  const [savedField, setSavedField] = React.useState<string | null>(null);
  const flashSaved = (key: string) => {
    setSavedField(key);
    setTimeout(() => setSavedField(null), 2000);
  };

  // SavedBadge — defined here (inside component) to close over savedField
  const SavedBadge = ({ id }: { id: string }) => (
    <AnimatePresence>
      {savedField === id && (
        <motion.span
          className="flex items-center gap-1 text-xs font-medium text-[#68B266]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          <CheckCircle2 size={12} /> Saved
        </motion.span>
      )}
    </AnimatePresence>
  );


  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden bg-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-5 shrink-0">
        <PageHeader
          eyebrow="Home / Settings"
          title="Settings"
          description="Manage your account and preferences"
        />
      </div>

      {/* ── Tab bar ── */}
      <div className="px-8 shrink-0">
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg-muted)' }}>
          {(['account', 'notifications', 'appearance', 'data', 'about'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === tab ? { background: 'var(--bg-card)' } : undefined}
            >
              {tab === 'data' ? 'Data & Privacy' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div>
          <AnimatePresence mode="wait">

            {/* ══ Account (profile + password) ══ */}
            {activeTab === 'account' && (
              <motion.div key="profile"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-[1fr_280px] gap-4 items-start"
              >
                {/* Card 1 — Identity hero */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-surface-100">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">Profile</h3>
                        <div className="flex items-center gap-3">
                          <SavedBadge id="profile" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-5">Your personal information and public profile</p>
                      <div className="grid grid-cols-[auto_1fr] gap-6">
                        {/* Left: avatar */}
                        <div className="flex flex-col items-center gap-2 pt-1">
                          <div className="rounded-full p-[2.5px] bg-gradient-to-br from-primary-500 to-primary-700">
                            <div className="rounded-full p-[2px] bg-white">
                              <Avatar name={nameValue} color="var(--color-primary-500, #5030E5)" size="xl" />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-900 text-center max-w-[80px] truncate">{nameValue.split(' ')[0]}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-600 font-bold">
                            {authUser?.role ?? 'Member'}
                          </span>
                        </div>
                        {/* Right: fields */}
                        <div className="grid grid-cols-2 gap-4">
                          <InputField label="Display Name" value={nameValue} onChange={setNameValue}
                            onBlur={() => { handleSave(); flashSaved('profile'); }} placeholder="Your name" />
                          <InputField label="Email" value={emailValue} onChange={setEmailValue}
                            onBlur={() => { handleSave(); flashSaved('profile'); }} placeholder="you@example.com" />
                          <InputField label="Phone" value={phoneValue} onChange={setPhoneValue}
                            onBlur={() => { handleSave(); flashSaved('profile'); }} placeholder="+1 234 567 890" />
                          <InputField label="Location" value={locationValue} onChange={setLocationValue}
                            onBlur={() => { handleSave(); flashSaved('profile'); }} placeholder="City, Country" />
                          <InputField label="Designation" value={roleValue} onChange={setRoleValue}
                            onBlur={() => { handleSave(); flashSaved('profile'); }} placeholder="e.g. Senior Engineer" />
                          <InputField label="Department" value={departmentValue} onChange={setDepartmentValue}
                            onBlur={() => { handleSave(); flashSaved('profile'); }} placeholder="e.g. Engineering" />
                          {/* Bio — full width */}
                          <div className="col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Bio</label>
                            <textarea
                              value={bioValue}
                              onChange={e => setBioValue(e.target.value)}
                              onBlur={() => { handleSave(); flashSaved('profile'); }}
                              placeholder="Short bio..."
                              rows={3}
                              className="w-full text-sm rounded-lg px-3 py-2 border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none transition-all"
                              style={{ color: 'var(--text-primary)' }}
                            />
                          </div>
                          {/* Read-only: Member ID + Joined */}
                          <InputField label="Member ID" value={fullMember?.id ?? currentUser?.id ?? '—'} onChange={() => {}} readOnly />
                          <InputField label="Joined" value={fullMember?.joinedAt ? new Date(fullMember.joinedAt).toLocaleDateString() : '—'} onChange={() => {}} readOnly />
                        </div>
                      </div>
                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 mt-5 border-t border-surface-100">
                        <button onClick={handleShareProfile}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-200 text-gray-500 hover:bg-surface-50 transition-colors">
                          <Link size={12} /> Share Profile
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">Signed in as {authUser?.email}</span>
                          <button onClick={() => logout()}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#D8727D] hover:text-[#c05a65] transition-colors">
                            <LogOut size={13} /> Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Card 2 — Activity stats */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-surface-100">
                    <div className="px-6 pt-5 pb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">Activity</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Your contribution statistics</p>
                    </div>
                    <div className="flex flex-col divide-y divide-surface-100">
                      {[
                        { label: 'Projects', value: stats[0].value, icon: Layers,       bg: 'rgba(124,58,237,0.12)', color: '#A78BFA' },
                        { label: 'Tasks',    value: stats[1].value, icon: CheckCircle2, bg: 'rgba(34,197,94,0.12)',  color: '#4ADE80' },
                        { label: 'Team',     value: stats[2].value, icon: Users,        bg: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center gap-4 px-6 py-4">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                            <s.icon size={16} style={{ color: s.color }} />
                          </div>
                          <div>
                            <div className="text-xl font-extrabold tracking-tight text-gray-900 leading-none">{s.value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

              </motion.div>
            )}

            {/* ══ Notifications ══ */}
            {activeTab === 'notifications' && (
              <motion.div key="notifications"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-4 items-start"
              >
                {/* Card 1 — Delivery Channels */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-surface-100">
                    {/* Blur overlay */}
                    <div className="absolute inset-0 z-10 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none" style={{ backdropFilter: 'blur(3px)', background: 'color-mix(in srgb, var(--bg-card) 75%, transparent)' }}>
                      <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center">
                        <Bell size={16} className="text-primary-500" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Coming Soon</span>
                      <span className="text-xs text-gray-400">This feature will be available soon</span>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary-500/10">
                          <Bell size={16} className="text-primary-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">Delivery Channels</h3>
                          <p className="text-xs text-gray-500">Choose how you want to receive notifications</p>
                        </div>
                      </div>
                      <SavedBadge id="notif" />
                    </div>
                    <div className="px-6 py-2">
                      {([
                        { icon: Mail,          label: 'Email Notifications', description: authUser?.email ?? 'Your email address', key: 'emailNotifs' as const, bg: 'rgba(59,130,246,0.12)',  color: '#60A5FA' },
                        { icon: Smartphone,    label: 'Push Notifications',  description: 'Desktop & mobile alerts',               key: 'pushNotifs'  as const, bg: 'rgba(34,197,94,0.12)',   color: '#4ADE80' },
                        { icon: MessageSquare, label: 'SMS Notifications',   description: 'Text message alerts',                    key: 'smsNotifs'   as const, bg: 'rgba(245,158,11,0.12)',  color: '#FBBF24' },
                        { icon: Clock,         label: 'Quiet Hours',         description: 'Mute notifications 10 PM – 8 AM',        key: 'quietHours'  as const, bg: 'rgba(124,58,237,0.12)', color: '#A78BFA' },
                      ] as { icon: React.ElementType; label: string; description: string; key: keyof NotifPrefs; bg: string; color: string }[]).map(row => (
                        <div key={row.key} className="flex items-center justify-between py-3.5 border-b border-surface-100 last:border-0 hover:bg-surface-50 -mx-6 px-6 transition-colors rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: row.bg }}>
                              <row.icon size={14} style={{ color: row.color }} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{row.label}</div>
                              <div className="text-xs text-gray-400">{row.description}</div>
                            </div>
                          </div>
                          <Toggle on={notifications[row.key]} onChange={() => { toggleNotif(row.key); flashSaved('notif'); }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Card 2 — Activity Events */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-surface-100">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">Activity Events</h3>
                        <p className="text-xs text-gray-500">Select which events trigger a notification</p>
                      </div>
                      <SavedBadge id="notif" />
                    </div>
                    <div className="px-6 py-2">
                      {([
                        { icon: CheckCircle2, label: 'Task Updates',    description: 'When tasks are assigned or updated', key: 'taskUpdates'    as const, bg: 'rgba(34,197,94,0.12)',   color: '#4ADE80' },
                        { icon: AtSign,       label: 'Team Mentions',   description: 'When someone @mentions you',         key: 'teamMentions'   as const, bg: 'rgba(59,130,246,0.12)',  color: '#60A5FA' },
                        { icon: Layers,       label: 'Project Updates', description: 'New projects and milestones',        key: 'projectUpdates' as const, bg: 'rgba(124,58,237,0.12)', color: '#A78BFA' },
                        { icon: Shield,       label: 'Security Alerts', description: 'Login attempts and changes',         key: 'securityAlerts' as const, bg: 'rgba(220,38,38,0.12)',  color: '#F87171' },
                        { icon: BarChart2,    label: 'Weekly Digest',   description: 'Summary email every Monday',         key: 'weeklyDigest'   as const, bg: 'rgba(245,158,11,0.12)', color: '#FBBF24' },
                      ] as { icon: React.ElementType; label: string; description: string; key: keyof NotifPrefs; bg: string; color: string }[]).map(row => (
                        <div key={row.key} className="flex items-center justify-between py-3.5 border-b border-surface-100 last:border-0 hover:bg-surface-50 -mx-6 px-6 transition-colors rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: row.bg }}>
                              <row.icon size={14} style={{ color: row.color }} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{row.label}</div>
                              <div className="text-xs text-gray-400">{row.description}</div>
                            </div>
                          </div>
                          <Toggle on={notifications[row.key]} onChange={() => { toggleNotif(row.key); flashSaved('notif'); }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ══ Appearance ══ */}
            {activeTab === 'appearance' && (
              <motion.div key="appearance"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-4 items-stretch"
              >
                {/* Card 1 — Theme */}
                <motion.div className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-surface-100 h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">Theme</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Choose your preferred color scheme</p>
                      </div>
                      <SavedBadge id="appear" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { id: 'light' as const,  label: 'Light',  Icon: Sun,     preview: (
                          <div className="w-full h-16 rounded-xl bg-white border border-surface-200 flex flex-col p-2 gap-1.5">
                            <div className="h-1.5 bg-surface-300 rounded w-3/4" />
                            <div className="h-1.5 bg-surface-200 rounded w-1/2" />
                            <div className="mt-auto flex gap-1.5">
                              <div className="h-2 w-5 bg-primary-500 rounded opacity-40" />
                              <div className="h-2 flex-1 bg-surface-200 rounded" />
                            </div>
                          </div>
                        )},
                        { id: 'dark' as const,   label: 'Dark',   Icon: Moon,    preview: (
                          <div className="w-full h-16 rounded-xl bg-gray-900 flex flex-col p-2 gap-1.5">
                            <div className="h-1.5 bg-gray-600 rounded w-3/4" />
                            <div className="h-1.5 bg-gray-700 rounded w-1/2" />
                            <div className="mt-auto flex gap-1.5">
                              <div className="h-2 w-5 bg-primary-500 rounded opacity-60" />
                              <div className="h-2 flex-1 bg-gray-700 rounded" />
                            </div>
                          </div>
                        )},
                        { id: 'coffee' as const, label: 'Dark Coffee', Icon: Coffee, preview: (
                          <div className="w-full h-16 rounded-xl flex flex-col p-2 gap-1.5" style={{ background: '#160D08' }}>
                            <div className="h-1.5 rounded w-3/4" style={{ background: '#5C3A26' }} />
                            <div className="h-1.5 rounded w-1/2" style={{ background: '#4A2E1E' }} />
                            <div className="mt-auto flex gap-1.5">
                              <div className="h-2 w-5 bg-primary-500 rounded opacity-70" />
                              <div className="h-2 flex-1 rounded" style={{ background: '#3A2318' }} />
                            </div>
                          </div>
                        )},
                        { id: 'system' as const, label: 'System', Icon: Monitor, preview: (
                          <div className="w-full h-16 rounded-xl overflow-hidden flex border border-surface-200">
                            <div className="w-1/2 bg-white flex flex-col p-2 gap-1.5">
                              <div className="h-1.5 bg-surface-300 rounded" />
                              <div className="h-1.5 bg-surface-200 rounded w-2/3" />
                            </div>
                            <div className="w-1/2 bg-gray-900 flex flex-col p-2 gap-1.5">
                              <div className="h-1.5 bg-gray-600 rounded" />
                              <div className="h-1.5 bg-gray-700 rounded w-2/3" />
                            </div>
                          </div>
                        )},
                      ]).map(t => (
                        <button key={t.id}
                          onClick={() => {
                            setThemeMode(t.id);
                            if (t.id === 'system') {
                              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                              setAppTheme(prefersDark ? 'dark' : 'light');
                            } else {
                              setAppTheme(t.id as 'light' | 'dark' | 'coffee');
                            }
                            saveAppearance({ themeMode: t.id });
                            flashSaved('appear');
                          }}
                          className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                            themeMode === t.id
                              ? 'border-primary-500 bg-primary-500/5 ring-2 ring-primary-500/20'
                              : 'border-surface-200 hover:border-surface-300'
                          }`}
                        >
                          {t.preview}
                          <div className="flex items-center justify-between px-0.5">
                            <div className="flex items-center gap-1.5">
                              <t.Icon size={12} className={themeMode === t.id ? 'text-primary-500' : 'text-gray-400'} />
                              <span className={`text-xs font-semibold ${themeMode === t.id ? 'text-primary-500' : 'text-gray-500'}`}>{t.label}</span>
                            </div>
                            {themeMode === t.id && (
                              <div className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                                <Check size={9} className="text-white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Card 2 — Accent Color */}
                <motion.div className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-surface-100 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">Accent Color</h3>
                          <p className="text-xs text-gray-500 mt-0.5">Personalize your interface color</p>
                        </div>
                        <SavedBadge id="appear" />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {ACCENT_COLORS.map(c => (
                          <button key={c.hex} title={c.label}
                            onClick={() => { setAccentColor(c.hex); applyAccentColor(c.hex); saveAppearance({ accentColor: c.hex }); flashSaved('appear'); }}
                            className={`w-8 h-8 rounded-full transition-all relative ${accentColor === c.hex ? 'ring-2 ring-offset-2' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}
                            style={{ background: c.hex, ...(accentColor === c.hex ? { ringColor: c.hex } : {}) }}
                          >
                            {accentColor === c.hex && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <Check size={12} className="text-white" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        ))}
                        <span className="ml-1 text-xs font-medium text-gray-500">
                          {ACCENT_COLORS.find(c => c.hex === accentColor)?.label ?? ''}
                        </span>
                      </div>
                      <div className="mt-auto pt-5 border-t border-surface-100">
                        <p className="text-xs text-gray-400 leading-relaxed">
                          The selected color is applied across buttons, active states, badges, and highlights throughout the interface.
                        </p>
                      </div>
                    </div>
                  </motion.div>
              </motion.div>
            )}

            {/* ══ Data & Privacy (password + system behavior + sessions) ══ */}
            {activeTab === 'data' && (
              <motion.div key="security"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-4 items-start"
              >
                {/* Card 1 — Change Password */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-surface-100">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FEE2E2]">
                        <Lock size={18} className="text-[#D8727D]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">Change Password</h3>
                        <p className="text-xs text-gray-500">Update your account password</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <InputField label="Current Password"
                        type={showPassword['current'] ? 'text' : 'password'}
                        value={passwords.current}
                        onChange={v => setPasswords(p => ({ ...p, current: v }))}
                        suffix={
                          <button onClick={() => setShowPassword(p => ({ ...p, current: !p['current'] }))} className="text-gray-400 hover:text-gray-600">
                            {showPassword['current'] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        }
                      />
                      <div>
                        <InputField label="New Password"
                          type={showPassword['next'] ? 'text' : 'password'}
                          value={passwords.next}
                          onChange={v => setPasswords(p => ({ ...p, next: v }))}
                          suffix={
                            <button onClick={() => setShowPassword(p => ({ ...p, next: !p['next'] }))} className="text-gray-400 hover:text-gray-600">
                              {showPassword['next'] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          }
                        />
                        {passwords.next && (
                          <div className="mt-2">
                            <div className="flex gap-1 mb-1">
                              {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
                                  style={{ background: i <= strength.score ? strength.color : 'var(--border-default)' }} />
                              ))}
                            </div>
                            <span className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</span>
                          </div>
                        )}
                      </div>
                      <InputField label="Confirm New Password"
                        type={showPassword['confirm'] ? 'text' : 'password'}
                        value={passwords.confirm}
                        onChange={v => setPasswords(p => ({ ...p, confirm: v }))}
                        suffix={
                          <button onClick={() => setShowPassword(p => ({ ...p, confirm: !p['confirm'] }))} className="text-gray-400 hover:text-gray-600">
                            {showPassword['confirm'] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        }
                      />
                      <motion.button onClick={handleUpdatePassword}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors"
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      >
                        Update Password
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Right column: System Behavior + Sessions */}
                <div className="flex flex-col gap-4">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-surface-100">
                      <div className="px-6 py-4 border-b border-surface-100">
                        <h3 className="font-semibold text-gray-900 text-sm">System Behavior</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Control how the app runs on your system</p>
                      </div>
                      <div className="px-6 py-2">
                        <div className="flex items-center justify-between py-3.5 border-b border-surface-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#EDE9FE]">
                              <Zap size={14} className="text-[#7C3AED]" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">Run on Startup</div>
                              <div className="text-xs text-gray-400">Launch automatically when you log in</div>
                            </div>
                          </div>
                          <Toggle on={runOnStartup} onChange={toggleRunOnStartup} />
                        </div>
                        <div className="flex items-center justify-between py-3.5 border-b border-surface-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#DBEAFE]">
                              <HardDrive size={14} className="text-[#2563EB]" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">Run in Background</div>
                              <div className="text-xs text-gray-400">Keep running in the tray when window is closed</div>
                            </div>
                          </div>
                          <Toggle on={runInBackground} onChange={toggleRunInBackground} />
                        </div>
                        <div className="flex items-center justify-between py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#DCFCE7]">
                              <Bell size={14} className="text-[#16A34A]" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">System Notifications</div>
                              <div className="text-xs text-gray-400">Show OS alerts for messages and task updates</div>
                            </div>
                          </div>
                          <Toggle on={systemNotifs} onChange={toggleSystemNotifs} />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-surface-100">
                      <div className="px-6 py-4 border-b border-surface-100">
                        <h3 className="font-semibold text-gray-900 text-sm">Sessions & Login History</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Manage your active sessions</p>
                      </div>
                      <div className="px-6 py-2">
                        <div className="flex items-center justify-between py-3.5 border-b border-surface-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#DBEAFE]">
                              <Monitor size={14} className="text-[#2563EB]" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">This device</div>
                              <div className="text-xs text-gray-400">Current session</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">Active now</span>
                        </div>
                        <div className="text-xs text-gray-400 text-center py-4">
                          Full login history is not available in this version.
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Danger Zone — full width row */}
                <motion.div className="col-span-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }}>
                  <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-surface-100">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FEE2E2] shrink-0">
                        <AlertTriangle size={14} className="text-[#D8727D]" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">Danger Zone</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 ml-[42px]">These actions are irreversible. Proceed with caution.</p>
                    <div className="flex gap-2">
                      <button onClick={handleExportData}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-50 text-gray-600 hover:bg-surface-100 transition-colors">
                        <Download size={14} /> Export Data
                      </button>
                      <button onClick={() => setConfirmClear(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#FEE2E2] text-[#D8727D] hover:bg-[#fdd] transition-colors">
                        <Trash2 size={14} /> Delete Account
                      </button>
                    </div>
                  </div>
                </motion.div>

              </motion.div>
            )}

            <ConfirmDialog
              open={confirmClear}
              title="Delete Account"
              message="This will permanently delete your account and all local data. This cannot be undone."
              confirmLabel="Delete"
              danger
              onConfirm={() => { setConfirmClear(false); showToast('Account deletion is disabled in this version.', 'info'); }}
              onCancel={() => setConfirmClear(false)}
            />

            {/* ══ Billing (hidden — no tab mapping) ══ */}
            {false && (
              <motion.div key="billing"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Banner */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <div className="rounded-2xl p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white overflow-hidden relative">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-widest opacity-70">Current Plan</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">Free</span>
                        </div>
                        <div className="text-2xl font-extrabold tracking-tight">Free Plan</div>
                        <div className="text-sm opacity-60 mt-0.5">No expiration · Free forever</div>
                      </div>
                      <button className="px-4 py-2 rounded-xl border border-white/40 text-sm font-semibold hover:bg-white/10 transition-colors">
                        Upgrade →
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Plans */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-surface-100">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">Plans</h3>
                    <p className="text-xs text-gray-500 mb-4">Choose the plan that's right for you</p>
                    <div className="grid grid-cols-3 gap-4">
                      {([
                        { name: 'Free',       price: '$0/mo',  features: ['Up to 3 projects', '5 team members', 'Basic analytics'],     cta: 'Current Plan', active: true,  accentBar: 'bg-surface-200',                                        shadow: '' },
                        { name: 'Pro',        price: '$12/mo', features: ['Unlimited projects', '25 team members', 'Advanced analytics'], cta: 'Upgrade to Pro', active: false, accentBar: 'bg-gradient-to-r from-primary-500 to-primary-700',       shadow: 'shadow-[0_4px_24px_rgba(80,48,229,0.15)]' },
                        { name: 'Enterprise', price: 'Custom', features: ['Unlimited everything', 'SSO & SAML', 'Dedicated support'],     cta: 'Contact Us',   active: false, accentBar: 'bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]',       shadow: '' },
                      ]).map((plan, i) => (
                        <div key={plan.name} className={`relative rounded-xl border-2 overflow-hidden ${i === 1 ? 'border-primary-500' : 'border-surface-200'} ${plan.shadow}`}>
                          {i === 1 && <span className="absolute -top-px left-1/2 -translate-x-1/2 text-[9px] font-bold px-2.5 py-0.5 rounded-b-lg bg-primary-500 text-white">Popular</span>}
                          <div className={`h-1 w-full ${plan.accentBar}`} />
                          <div className="p-4 pt-5">
                            <div className={`text-sm font-bold mb-0.5 ${i === 1 ? 'text-primary-500' : 'text-gray-900'}`}>{plan.name}</div>
                            <div className="text-xl font-extrabold text-gray-900 tracking-tight mb-3">{plan.price}</div>
                            <ul className="space-y-2 mb-4">
                              {plan.features.map(f => (
                                <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                                  <Check size={11} className="text-[#68B266] shrink-0" /> {f}
                                </li>
                              ))}
                            </ul>
                            <button className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                              plan.active ? 'bg-surface-100 text-gray-400 cursor-default' :
                              i === 1 ? 'bg-primary-500 text-white hover:bg-primary-600' :
                              'border border-surface-200 text-gray-600 hover:bg-surface-50'
                            }`}>{plan.cta}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Row 2 — Usage + Danger Zone side-by-side */}
                <div className="grid grid-cols-2 gap-4 items-start">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-surface-100">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">Usage</h3>
                      <p className="text-xs text-gray-500 mb-4">Your current resource consumption</p>
                      <div className="flex flex-col gap-4">
                        {([
                          { label: 'Storage',   used: 2.1,            total: 5,    unit: 'GB',    pct: 42,  icon: HardDrive, bg: 'rgba(59,130,246,0.12)',  color: '#60A5FA' },
                          { label: 'API Calls', used: 1240,           total: 5000, unit: '/mo',   pct: 25,  icon: Zap,       bg: 'rgba(245,158,11,0.12)', color: '#FBBF24' },
                          { label: 'Members',   used: members.length, total: 5,    unit: 'seats', pct: Math.min(100, Math.round((members.length / 5) * 100)), icon: Users, bg: 'rgba(124,58,237,0.12)', color: '#A78BFA' },
                        ] as { label: string; used: number; total: number; unit: string; pct: number; icon: React.ElementType; bg: string; color: string }[]).map(m => (
                          <div key={m.label} className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: m.bg }}>
                              <m.icon size={14} style={{ color: m.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-gray-700">{m.label}</span>
                                <span className="text-xs text-gray-400">{m.used} / {m.total} {m.unit} <span className="font-semibold text-gray-600">({m.pct}%)</span></span>
                              </div>
                              <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                                <motion.div className="h-full rounded-full" style={{ background: m.color }}
                                  initial={{ width: 0 }} animate={{ width: `${m.pct}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }}>
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-surface-100">
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FEE2E2] shrink-0">
                          <AlertTriangle size={14} className="text-[#D8727D]" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm">Danger Zone</h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-4 ml-[42px]">These actions are irreversible. Proceed with caution.</p>
                      <div className="flex flex-col gap-2">
                        <button onClick={handleExportData}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-50 text-gray-600 hover:bg-surface-100 transition-colors w-full">
                          <Download size={14} /> Export Data
                        </button>
                        {!confirmDelete ? (
                          <button onClick={handleDeleteAccount}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#FEE2E2] text-[#D8727D] hover:bg-[#fdd] transition-colors w-full">
                            <Trash2 size={14} /> Delete Account
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-gray-500 px-1">Are you sure? This cannot be undone.</p>
                            <div className="flex gap-2">
                              <button onClick={() => { setConfirmDelete(false); showToast('Account deletion is disabled in this version.', 'info'); }}
                                className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#D8727D] text-white hover:bg-[#c05a65] transition-colors">
                                Yes, delete
                              </button>
                              <button onClick={() => setConfirmDelete(false)}
                                className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-100 text-gray-600 hover:bg-surface-200 transition-colors">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ══ About ══ */}
            {activeTab === 'about' && (
              <motion.div key="about"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-4 items-start"
              >
                {/* App Info hero */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-surface-100">
                    <div className="p-6 flex items-center gap-5">
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold bg-gradient-to-br from-primary-500 to-primary-700 shrink-0 shadow-lg">
                        PM
                      </div>
                      <div>
                        <div className="text-xl font-extrabold text-gray-900 tracking-tight">Project M</div>
                        <div className="text-sm text-gray-500 mt-0.5">Version {updateState.appVersion ?? '—'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Developed and published by GitBase</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Software Updates */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-surface-100">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">Software Updates</h3>
                    <p className="text-xs text-gray-500 mb-4">Keep your app up to date</p>
                    <div className="flex flex-col gap-4">
                      {/* Status row */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          updateState.status === 'downloaded'    ? 'bg-[#DCFCE7]' :
                          updateState.status === 'available' || updateState.status === 'downloading' ? 'bg-[#DBEAFE]' :
                          updateState.status === 'error'         ? 'bg-[#FEE2E2]' :
                          updateState.status === 'checking'      ? 'bg-[#EDE9FE]' :
                          'bg-[#DCFCE7]'
                        }`}>
                          {updateState.status === 'error'       ? <AlertTriangle size={18} className="text-[#D8727D]" /> :
                           updateState.status === 'downloaded'  ? <CheckCircle2 size={18} className="text-[#16A34A]" /> :
                           updateState.status === 'downloading' ? <RefreshCw size={18} className="text-[#2563EB] animate-spin" /> :
                           updateState.status === 'checking'    ? <RefreshCw size={18} className="text-[#7C3AED] animate-spin" /> :
                           updateState.status === 'available'   ? <Download size={18} className="text-[#2563EB]" /> :
                           <CheckCircle2 size={18} className="text-[#16A34A]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900">
                            {updateState.status === 'idle'          && 'Up to date'}
                            {updateState.status === 'checking'      && 'Checking for updates…'}
                            {updateState.status === 'not-available' && 'Already on the latest version'}
                            {updateState.status === 'available'     && `Update available: v${updateState.version}`}
                            {updateState.status === 'downloading'   && 'Downloading update…'}
                            {updateState.status === 'downloaded'    && `Update ready: v${updateState.version}`}
                            {updateState.status === 'error'         && 'Update check failed'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{updateState.errorMessage ?? `Current version: ${updateState.appVersion ?? '—'}`}</div>
                        </div>
                      </div>

                      {/* Download progress */}
                      {updateState.status === 'downloading' && updateState.progress != null && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-gray-500">Downloading…</span>
                            <span className="text-xs font-semibold text-gray-700">{Math.round(updateState.progress!)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                            <motion.div className="h-full rounded-full bg-[#2563EB]"
                              animate={{ width: `${updateState.progress}%` }}
                              transition={{ duration: 0.3 }} />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 flex-wrap">
                        {/* Check / Checking button */}
                        {(updateState.status === 'idle' || updateState.status === 'error' || updateState.status === 'not-available' || updateState.status === 'checking') && (
                          <motion.button onClick={updateState.status === 'checking' ? undefined : checkForUpdate}
                            disabled={updateState.status === 'checking'}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-surface-200 text-gray-600 hover:bg-surface-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            whileHover={updateState.status !== 'checking' ? { scale: 1.02 } : {}}
                            whileTap={updateState.status !== 'checking' ? { scale: 0.97 } : {}}
                          >
                            <RefreshCw size={14} className={updateState.status === 'checking' ? 'animate-spin' : ''} />
                            {updateState.status === 'checking' ? 'Checking…' : 'Check for Updates'}
                          </motion.button>
                        )}
{/* Install button once download is complete */}
                        {updateState.status === 'downloaded' && (
                          <motion.button onClick={installUpdate}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <Download size={14} /> Install & Restart
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
