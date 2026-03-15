import React, { useState, useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Bell, Palette, Shield, CreditCard,
  Check, Clock, Moon, Sun, Monitor,
  Smartphone, Mail, Eye, EyeOff, AlertTriangle,
  Download, Trash2, Briefcase,
  Link, X,
  Lock, Info, RefreshCw, CheckCircle2,
  LogOut, AtSign, Layers, BarChart2, MessageSquare, Key,
  Edit3, Save, Globe, ChevronRight,
} from 'lucide-react';
import { useAppUpdater } from '../hooks/useAppUpdater';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AppContext } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useMembersContext } from '../context/MembersContext';
import { useProjects } from '../context/ProjectContext';


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
  themeMode: 'light' | 'dark' | 'system';
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

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile',       label: 'Profile',       Icon: User       },
  { id: 'notifications', label: 'Notifications', Icon: Bell       },
  { id: 'appearance',    label: 'Appearance',    Icon: Palette    },
  { id: 'security',      label: 'Security',      Icon: Shield     },
  { id: 'billing',       label: 'Billing',       Icon: CreditCard },
  { id: 'about',         label: 'About',         Icon: Info       },
] as const;

// ── SettingCard ───────────────────────────────────────────────────────────────

const SettingCard: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, children, action, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-surface-200 p-6 ${className}`}>
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
            : 'bg-white focus:ring-2 focus:ring-[#5030E5]/20 focus:border-[#5030E5]'
          }`}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
      )}
    </div>
  </div>
);

const ACCENT_COLORS = [
  { hex: '#5030E5', label: 'Violet' },
  { hex: '#0EA5E9', label: 'Sky' },
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#EF4444', label: 'Rose' },
  { hex: '#8B5CF6', label: 'Purple' },
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
          <Edit3 size={12} className="text-gray-400" />
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
      { id: 'billing',    label: 'Billing',    icon: CreditCard },
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

  const userColor = '#5030E5';

  const [activeSection, setActiveSection] = useState('profile');
  const { state: updateState, checkForUpdate, installUpdate } = useAppUpdater();

  // Profile
  const [nameValue,     setNameValue]     = useState(() => currentUser?.name        || '');
  const [emailValue,    setEmailValue]    = useState(() => currentUser?.email       || '');
  const [locationValue, setLocationValue] = useState(() => currentUser?.location   || '');
  const [roleValue,     setRoleValue]     = useState(() => currentUser?.designation || '');

  // Sync profile fields when currentUser loads (it may be null on first render)
  useEffect(() => {
    if (!currentUser) return;
    setNameValue(prev => prev || currentUser.name || '');
    setEmailValue(prev => prev || currentUser.email || '');
    setLocationValue(prev => prev || currentUser.location || '');
    setRoleValue(prev => prev || currentUser.designation || '');
  }, [currentUser?.id]);

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

  // Appearance — persisted to MongoDB (in-memory fallback in mock mode)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(theme === 'dark' ? 'dark' : 'light');
  const [accentColor, setAccentColor] = useState('#5030E5');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [compactMode, setCompactMode] = useState(false);
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
        setFontSize(prefs.fontSize);
        setCompactMode(prefs.compactMode);
      })
      .catch((err: unknown) => console.error('[SettingsPage] Failed to load appearance prefs:', err));
  }, [currentUser?.id]);

  // Security
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const strength = calcStrength(passwords.next);


  // Save feedback
  const [saved, setSaved] = useState(false);


  const saveAppearance = (patch: Partial<AppearPrefs>) => {
    if (currentUser?.id) {
      const current: AppearPrefs & { userId: string } = {
        userId: currentUser.id, themeMode, accentColor, fontSize, compactMode, ...patch,
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

  const handleSave = async () => {
    if (currentUser?.id) {
      try {
        const newName = nameValue.trim() || currentUser.name;
        await updateMember(currentUser.id, {
          name: newName,
          email: emailValue.trim() || currentUser.email,
          location: locationValue.trim() || undefined,
          designation: roleValue.trim() || undefined,
        });
        authApi().updateName(currentUser.id, newName)
          .catch((err: unknown) => console.error('[SettingsPage] Failed to sync auth name:', err));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        showToast('Profile saved!', 'success');
      } catch {
        showToast('Failed to save profile.', 'error');
      }
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
        <div className="flex items-center gap-1 bg-surface-50 rounded-2xl p-1 border border-surface-200 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                ${activeSection === tab.id
                  ? 'bg-[#5030E5] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                }`}
            >
              <tab.Icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ══ Profile ══ */}
            {activeSection === 'profile' && (
              <motion.div key="profile"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Card 1 — Identity */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <SettingCard
                    title="Profile"
                    description="Your personal information and public profile"
                    action={<SavedBadge id="profile" />}
                  >
                    <div className="grid grid-cols-[auto_1fr] gap-6">
                      {/* Left: avatar */}
                      <div className="flex flex-col items-center gap-2">
                        <Avatar name={nameValue} color="#5030E5" size="xl" />
                        <span className="text-xs font-semibold text-gray-900 text-center max-w-[80px] truncate">{nameValue}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5030E523] text-[#5030E5] font-semibold">
                          {authUser?.role ?? 'Member'}
                        </span>
                      </div>

                      {/* Right: fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <InputField
                          label="Display Name"
                          value={nameValue}
                          onChange={setNameValue}
                          onBlur={() => { handleSave(); flashSaved('profile'); }}
                          placeholder="Your name"
                        />
                        <InputField
                          label="Email"
                          value={emailValue}
                          onChange={setEmailValue}
                          onBlur={() => { handleSave(); flashSaved('profile'); }}
                          placeholder="you@example.com"
                        />
                        <InputField
                          label="Location"
                          value={locationValue}
                          onChange={setLocationValue}
                          onBlur={() => { handleSave(); flashSaved('profile'); }}
                          placeholder="City, Country"
                        />
                        <InputField
                          label="Designation"
                          value={roleValue}
                          onChange={setRoleValue}
                          onBlur={() => { handleSave(); flashSaved('profile'); }}
                          placeholder="e.g. Senior Engineer"
                        />
                      </div>
                    </div>

                    {/* Share Profile button */}
                    <div className="pt-4 mt-4 border-t border-surface-100">
                      <button
                        onClick={handleShareProfile}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-200 text-gray-500 hover:bg-surface-50 transition-colors"
                      >
                        <Link size={12} /> Share Profile
                      </button>
                    </div>

                    {/* Sign Out footer row */}
                    <div className="flex items-center justify-between pt-3 mt-1">
                      <span className="text-xs text-gray-400">Signed in as {authUser?.email}</span>
                      <button
                        onClick={() => logout()}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#D8727D] hover:text-[#c05a65] transition-colors"
                      >
                        <LogOut size={13} /> Sign Out
                      </button>
                    </div>
                  </SettingCard>
                </motion.div>

                {/* Card 2 — Stats */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <SettingCard title="Activity" description="Your contribution statistics">
                    <div className="grid grid-cols-3 gap-3">
                      {stats.map(s => (
                        <div key={s.label} className="flex-1 bg-surface-50 rounded-xl p-4 text-center border border-surface-200">
                          <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </SettingCard>
                </motion.div>
              </motion.div>
            )}

            {/* ══ Notifications ══ */}
            {activeSection === 'notifications' && (
              <motion.div key="notifications"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Card 1 — Delivery Channels */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <SettingCard
                    title="Delivery Channels"
                    description="Choose how you want to receive notifications"
                    action={<SavedBadge id="notif" />}
                  >
                    {([
                      { icon: Mail,          label: 'Email Notifications', description: authUser?.email ?? 'Your email address', key: 'emailNotifs' },
                      { icon: Smartphone,    label: 'Push Notifications',  description: 'Desktop & mobile alerts',               key: 'pushNotifs'  },
                      { icon: MessageSquare, label: 'SMS Notifications',   description: 'Text message alerts',                    key: 'smsNotifs'   },
                      { icon: Clock,         label: 'Quiet Hours',         description: 'Mute notifications 10 PM \u2013 8 AM',        key: 'quietHours'  },
                    ] as { icon: React.ElementType; label: string; description: string; key: keyof NotifPrefs }[]).map(row => (
                      <div key={row.key} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-center">
                            <row.icon size={14} className="text-gray-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{row.label}</div>
                            <div className="text-xs text-gray-400">{row.description}</div>
                          </div>
                        </div>
                        <Toggle on={notifications[row.key]} onChange={() => { toggleNotif(row.key); flashSaved('notif'); }} />
                      </div>
                    ))}
                  </SettingCard>
                </motion.div>

                {/* Card 2 — Activity Events */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <SettingCard
                    title="Activity Events"
                    description="Select which events trigger a notification"
                    action={<SavedBadge id="notif" />}
                  >
                    {([
                      { icon: CheckCircle2, label: 'Task Updates',    description: 'When tasks are assigned or updated', key: 'taskUpdates'    },
                      { icon: AtSign,       label: 'Team Mentions',   description: 'When someone @mentions you',         key: 'teamMentions'   },
                      { icon: Layers,       label: 'Project Updates', description: 'New projects and milestones',        key: 'projectUpdates' },
                      { icon: Shield,       label: 'Security Alerts', description: 'Login attempts and changes',         key: 'securityAlerts' },
                      { icon: BarChart2,    label: 'Weekly Digest',   description: 'Summary email every Monday',         key: 'weeklyDigest'   },
                    ] as { icon: React.ElementType; label: string; description: string; key: keyof NotifPrefs }[]).map(row => (
                      <div key={row.key} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-center">
                            <row.icon size={14} className="text-gray-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{row.label}</div>
                            <div className="text-xs text-gray-400">{row.description}</div>
                          </div>
                        </div>
                        <Toggle on={notifications[row.key]} onChange={() => { toggleNotif(row.key); flashSaved('notif'); }} />
                      </div>
                    ))}
                  </SettingCard>
                </motion.div>
              </motion.div>
            )}

            {/* ══ Appearance ══ */}
            {activeSection === 'appearance' && (
              <motion.div key="appearance"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Card 1 — Theme */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <SettingCard
                    title="Theme"
                    description="Choose your preferred color scheme"
                    action={<SavedBadge id="appear" />}
                  >
                    <div className="flex gap-3">
                      {([
                        { id: 'light',  label: 'Light',  Icon: Sun     },
                        { id: 'dark',   label: 'Dark',   Icon: Moon    },
                        { id: 'system', label: 'System', Icon: Monitor },
                      ] as { id: 'light'|'dark'|'system'; label: string; Icon: React.ElementType }[]).map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setThemeMode(t.id);
                            setAppTheme(t.id === 'dark' ? 'dark' : 'light');
                            saveAppearance({ themeMode: t.id });
                            flashSaved('appear');
                          }}
                          className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                            ${themeMode === t.id
                              ? 'border-[#5030E5] bg-[#5030E510]'
                              : 'border-surface-200 hover:border-surface-300'
                            }`}
                        >
                          <t.Icon size={20} className={themeMode === t.id ? 'text-[#5030E5]' : 'text-gray-400'} />
                          <span className={`text-xs font-medium ${themeMode === t.id ? 'text-[#5030E5]' : 'text-gray-500'}`}>
                            {t.label}
                          </span>
                          {themeMode === t.id && <Check size={12} className="text-[#5030E5]" />}
                        </button>
                      ))}
                    </div>
                  </SettingCard>
                </motion.div>

                {/* Card 2 — Accent Color */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <SettingCard title="Accent Color" description="Personalize your interface color" action={<SavedBadge id="appear" />}>
                    <div className="flex items-center gap-3">
                      {ACCENT_COLORS.map(c => (
                        <button
                          key={c.hex}
                          title={c.label}
                          onClick={() => {
                            setAccentColor(c.hex);
                            saveAppearance({ accentColor: c.hex });
                            flashSaved('appear');
                          }}
                          className={`w-7 h-7 rounded-full transition-all ${accentColor === c.hex ? 'ring-2 ring-offset-2' : 'opacity-70 hover:opacity-100'}`}
                          style={{ background: c.hex, ...(accentColor === c.hex ? { ringColor: c.hex } : {}) }}
                        />
                      ))}
                    </div>
                  </SettingCard>
                </motion.div>

                {/* Card 3 — Display */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
                  <SettingCard title="Display" description="Text size and layout density" action={<SavedBadge id="appear" />}>
                    {/* Font size */}
                    <div className="flex items-center justify-between py-3 border-b border-surface-100">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Font Size</div>
                        <div className="text-xs text-gray-400">Adjust interface text size</div>
                      </div>
                      <div className="flex items-center gap-1 bg-surface-50 rounded-xl p-1 border border-surface-200">
                        {(['sm', 'md', 'lg'] as const).map((s, i) => (
                          <button
                            key={s}
                            onClick={() => { setFontSize(s); saveAppearance({ fontSize: s }); flashSaved('appear'); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${fontSize === s ? 'bg-[#5030E5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                          >
                            {['S', 'M', 'L'][i]}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Compact mode */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-center">
                          <Layers size={14} className="text-gray-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Compact Mode</div>
                          <div className="text-xs text-gray-400">Reduce spacing for denser layout</div>
                        </div>
                      </div>
                      <Toggle on={compactMode} onChange={() => { setCompactMode(p => { const next = !p; saveAppearance({ compactMode: next }); flashSaved('appear'); return next; })} } />
                    </div>
                  </SettingCard>
                </motion.div>
              </motion.div>
            )}

            {/* ══ Security ══ */}
            {activeSection === 'security' && (
              <motion.div key="security"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Card 1 — Change Password */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <SettingCard title="Change Password" description="Update your account password">
                    <div className="flex flex-col gap-4">
                      <InputField
                        label="Current Password"
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
                        <InputField
                          label="New Password"
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
                          <div className="mt-1.5">
                            <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ width: `${(strength.score / 4) * 100}%`, background: strength.color }}
                                layout
                              />
                            </div>
                            <span className="text-xs mt-0.5 block" style={{ color: strength.color }}>{strength.label}</span>
                          </div>
                        )}
                      </div>
                      <InputField
                        label="Confirm New Password"
                        type={showPassword['confirm'] ? 'text' : 'password'}
                        value={passwords.confirm}
                        onChange={v => setPasswords(p => ({ ...p, confirm: v }))}
                        suffix={
                          <button onClick={() => setShowPassword(p => ({ ...p, confirm: !p['confirm'] }))} className="text-gray-400 hover:text-gray-600">
                            {showPassword['confirm'] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        }
                      />
                      <button
                        onClick={handleUpdatePassword}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#5030E5] hover:bg-[#4020C5] transition-colors"
                      >
                        Update Password
                      </button>
                    </div>
                  </SettingCard>
                </motion.div>

                {/* Card 2 — 2FA placeholder */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <SettingCard title="Two-Factor Authentication" description="Add an extra layer of security to your account">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-center">
                          <Lock size={14} className="text-gray-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Authenticator App</div>
                          <div className="text-xs text-gray-400">Use an app like Google Authenticator</div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">Coming Soon</span>
                    </div>
                  </SettingCard>
                </motion.div>

                {/* Card 3 — Sessions placeholder */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
                  <SettingCard title="Sessions & Login History" description="Manage your active sessions">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-center">
                          <Key size={14} className="text-gray-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Active Sessions</div>
                          <div className="text-xs text-gray-400">View and revoke active sessions</div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">Coming Soon</span>
                    </div>
                  </SettingCard>
                </motion.div>
              </motion.div>
            )}

            {/* ══ Billing ══ */}
            {activeSection === 'billing' && (
              <motion.div key="billing"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Card 1 — Current Plan banner */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <div className="rounded-2xl p-6 bg-gradient-to-r from-[#5030E5] to-[#7C3AED] text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Current Plan</div>
                        <div className="text-2xl font-bold">Free Plan</div>
                        <div className="text-sm opacity-75 mt-1">Basic features for personal use</div>
                      </div>
                      <button className="px-4 py-2 rounded-xl border border-white/40 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                        Upgrade
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Card 2 — Plan comparison */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <SettingCard title="Plans" description="Choose the plan that's right for you">
                    <div className="grid grid-cols-3 gap-4">
                      {([
                        { name: 'Free', price: '$0/mo', features: ['Up to 3 projects', '5 team members', 'Basic analytics'], cta: 'Current Plan', active: true, highlight: false },
                        { name: 'Pro', price: '$12/mo', features: ['Unlimited projects', '25 team members', 'Advanced analytics'], cta: 'Upgrade to Pro', active: false, highlight: true },
                        { name: 'Enterprise', price: 'Custom', features: ['Unlimited everything', 'SSO & SAML', 'Dedicated support'], cta: 'Contact Us', active: false, highlight: false },
                      ]).map(plan => (
                        <div key={plan.name} className={`relative rounded-xl p-4 border-2 ${plan.highlight ? 'border-[#5030E5] bg-[#5030E508]' : 'border-surface-200'}`}>
                          {plan.highlight && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5030E5] text-white">Popular</span>
                          )}
                          <div className={`text-sm font-bold mb-1 ${plan.highlight ? 'text-[#5030E5]' : 'text-gray-900'}`}>{plan.name}</div>
                          <div className="text-xl font-bold text-gray-900 mb-3">{plan.price}</div>
                          <ul className="space-y-1.5 mb-4">
                            {plan.features.map(f => (
                              <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                                <Check size={11} className="text-[#68B266] shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                          <button className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                            plan.active ? 'bg-surface-100 text-gray-400 cursor-default' :
                            plan.highlight ? 'bg-[#5030E5] text-white hover:bg-[#4020C5]' :
                            'border border-surface-200 text-gray-600 hover:bg-surface-50'
                          }`}>
                            {plan.cta}
                          </button>
                        </div>
                      ))}
                    </div>
                  </SettingCard>
                </motion.div>

                {/* Card 3 — Usage meters */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
                  <SettingCard title="Usage" description="Your current resource consumption">
                    <div className="flex flex-col gap-4">
                      {([
                        { label: 'Storage',   used: 2.1,  total: 5,   unit: 'GB',  pct: 42 },
                        { label: 'API Calls', used: 1240, total: 5000, unit: '/mo', pct: 25 },
                        { label: 'Members',   used: members.length, total: 5, unit: 'seats', pct: Math.min(100, Math.round((members.length / 5) * 100)) },
                      ]).map(m => (
                        <div key={m.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-700">{m.label}</span>
                            <span className="text-xs text-gray-400">{m.used} / {m.total} {m.unit}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-[#5030E5]"
                              initial={{ width: 0 }}
                              animate={{ width: `${m.pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SettingCard>
                </motion.div>

                {/* Danger zone */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }}>
                  <div className="bg-white rounded-2xl border border-surface-200 p-6">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">Danger Zone</h3>
                    <p className="text-xs text-gray-500 mb-4">These actions are irreversible. Proceed with caution.</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-[#D8727D20]">
                      <button
                        onClick={handleExportData}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-surface-200 text-gray-600 hover:bg-surface-50 transition-colors"
                      >
                        <Download size={14} /> Export Data
                      </button>
                      {!confirmDelete ? (
                        <button
                          onClick={handleDeleteAccount}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[#D8727D] text-[#D8727D] hover:bg-[#D8727D08] transition-colors"
                        >
                          <Trash2 size={14} /> Delete Account
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Are you sure?</span>
                          <button
                            onClick={() => { setConfirmDelete(false); showToast('Account deletion is disabled in this version.', 'info'); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#D8727D] text-[#D8727D] hover:bg-[#D8727D08] transition-colors"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-surface-200 text-gray-500 hover:bg-surface-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ══ About ══ */}
            {activeSection === 'about' && (
              <motion.div key="about"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Card 1 — App identity */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
                  <SettingCard title="App Info">
                    <div className="flex flex-col items-center py-4 gap-3">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold bg-gradient-to-br from-[#5030E5] to-[#7C3AED]">
                        PX
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">Project X</div>
                        <div className="text-sm text-gray-500 mt-0.5">Version {updateState.appVersion ?? '\u2014'}</div>
                        <div className="text-xs text-gray-400 mt-1">Built with Electron + React</div>
                      </div>
                    </div>
                  </SettingCard>
                </motion.div>

                {/* Card 2 — Software updates */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <SettingCard title="Software Updates" description="Keep your app up to date">
                    <div className="flex flex-col gap-4">
                      {/* Status row */}
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-200">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          updateState.status === 'downloaded' ? 'bg-[#83C29D33]' :
                          updateState.status === 'available' ? 'bg-[#5030E510]' :
                          updateState.status === 'error' ? 'bg-[#D8727D15]' :
                          'bg-surface-100'
                        }`}>
                          {updateState.status === 'error' ? <AlertTriangle size={14} className="text-[#D8727D]" /> :
                           updateState.status === 'downloaded' ? <CheckCircle2 size={14} className="text-[#68B266]" /> :
                           updateState.status === 'downloading' ? <RefreshCw size={14} className="text-[#5030E5] animate-spin" /> :
                           <CheckCircle2 size={14} className="text-gray-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {updateState.status === 'idle' && 'Up to date'}
                            {updateState.status === 'checking' && 'Checking for updates\u2026'}
                            {updateState.status === 'not-available' && 'Already on the latest version'}
                            {updateState.status === 'available' && `Update available: v${updateState.version}`}
                            {updateState.status === 'downloading' && 'Downloading update\u2026'}
                            {updateState.status === 'downloaded' && `Update ready: v${updateState.version}`}
                            {updateState.status === 'error' && 'Update check failed'}
                          </div>
                          <div className="text-xs text-gray-400">{updateState.errorMessage ?? ''}</div>
                        </div>
                      </div>

                      {/* Download progress */}
                      {updateState.status === 'downloading' && updateState.progress != null && (
                        <div>
                          <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-[#5030E5]"
                              animate={{ width: `${updateState.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 mt-1">{Math.round(updateState.progress)}%</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-3">
                        {(updateState.status === 'idle' || updateState.status === 'error' || updateState.status === 'not-available') && (
                          <button
                            onClick={checkForUpdate}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-surface-200 text-gray-600 hover:bg-surface-50 transition-colors"
                          >
                            <RefreshCw size={14} /> Check for Updates
                          </button>
                        )}
                        {updateState.status === 'downloaded' && (
                          <button
                            onClick={installUpdate}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#5030E5] text-white hover:bg-[#4020C5] transition-colors"
                          >
                            <Download size={14} /> Install & Restart
                          </button>
                        )}
                      </div>
                    </div>
                  </SettingCard>
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
