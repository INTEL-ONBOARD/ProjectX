import React, { useState, useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, User, Bell, Palette, Shield, CreditCard, Key, LogOut,
  Camera, Check, Globe, Clock, Moon, Sun, Monitor,
  Smartphone, Mail, Eye, EyeOff, AlertTriangle,
  Download, Trash2, Edit3, MapPin, Briefcase,
  Link, Zap, Star, TrendingUp, Activity, X,
  Lock, ChevronRight, Info, RefreshCw, CheckCircle2,
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

const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between px-5 py-3.5 border-b border-surface-100">
    <div>
      <h2 className="font-bold text-gray-900 text-sm">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

interface FieldRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  editable?: boolean;
  onSave?: (val: string) => void;
}

const FieldRow: React.FC<FieldRowProps> = ({ icon: Icon, label, value, editable, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    if (draft.trim()) onSave?.(draft.trim());
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100 last:border-0 group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
          <Icon size={13} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
          {editing ? (
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
              className="text-sm font-semibold text-gray-900 border-b-2 border-primary-400 focus:outline-none bg-transparent w-full"
              autoFocus
            />
          ) : (
            <div className="text-sm font-semibold text-gray-900 truncate">{value}</div>
          )}
        </div>
      </div>
      {editable && (
        editing ? (
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <button onClick={commit} className="w-6 h-6 rounded-md bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors">
              <Check size={11} />
            </button>
            <button onClick={cancel} className="w-6 h-6 rounded-md bg-surface-200 text-gray-500 flex items-center justify-center hover:bg-surface-300 transition-colors">
              <X size={11} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-400 hover:text-primary-600 p-1 rounded-lg hover:bg-primary-50 ml-2 shrink-0"
          >
            <Edit3 size={13} />
          </button>
        )
      )}
    </div>
  );
};

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

// ── Nav ──────────────────────────────────────────────────────────────────────

const navGroups = [
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'security', label: 'Security', icon: Shield },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'billing', label: 'Billing', icon: CreditCard },
      { id: 'about', label: 'About', icon: Info },
    ],
  },
];

const ACCENT_COLORS = [
  { hex: '#5030E5', label: 'Violet' },
  { hex: '#0EA5E9', label: 'Sky' },
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#EF4444', label: 'Rose' },
  { hex: '#8B5CF6', label: 'Purple' },
];

// ── Main component ───────────────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const { currentUser, theme, setTheme: setAppTheme } = useContext(AppContext);
  const { logout, updatePassword } = useAuth();
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
  const [timezoneValue, setTimezoneValue] = useState('');
  const [roleValue,     setRoleValue]     = useState(() => currentUser?.designation || '');

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

  const stats = [
    { label: 'Tasks Done', value: String(currentUser ? allTasks.filter(t => t.status === 'done' && t.assignees?.includes(currentUser.id)).length : 0), icon: Check, color: '#68B266', bg: 'bg-[#83C29D20]' },
    { label: 'Projects', value: String(projects.length), icon: Briefcase, color: '#5030E5', bg: 'bg-primary-50' },
    { label: 'Tasks Total', value: String(currentUser ? allTasks.filter(t => t.assignees?.includes(currentUser.id)).length : 0), icon: Zap, color: '#FFA500', bg: 'bg-[#FFA50020]' },
    { label: 'In Progress', value: String(currentUser ? allTasks.filter(t => t.status === 'in-progress' && t.assignees?.includes(currentUser.id)).length : 0), icon: Star, color: '#30C5E5', bg: 'bg-[#30C5E520]' },
  ];


  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex flex-col h-full bg-white">
        <div className="pt-8 pb-5 shrink-0">
          <PageHeader
            eyebrow="Home / Settings"
            title="Settings"
            description="Manage your account and preferences"
            actions={
              <motion.button
                onClick={handleSave}
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${saved ? 'bg-[#68B266] text-white' : 'bg-primary-500 text-white hover:bg-primary-600'}`}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
              </motion.button>
            }
          />
        </div>

        <div className="flex gap-6 flex-1 min-h-0 pb-6 overflow-hidden bg-white">
          {/* ── Left nav ── */}
          <motion.div
            className="w-52 shrink-0 overflow-y-auto"
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              {/* User mini-card */}
              <div className="p-4 border-b border-surface-100">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar name={nameValue} color={userColor} size="md" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#68B266] border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{nameValue.split(' ')[0]}</div>
                    <div className="text-[10px] text-gray-400">Admin</div>
                  </div>
                </div>
              </div>

              {/* Nav groups */}
              <div className="p-2">
                {navGroups.map((group, gi) => (
                  <div key={group.label}>
                    {gi > 0 && <hr className="border-surface-100 mx-1 my-1" />}
                    <div className="px-2 pt-3 pb-1">
                      <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{group.label}</span>
                    </div>
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all overflow-hidden ${
                            isActive ? 'bg-primary-50/70 text-primary-600 font-semibold' : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700'
                          }`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4/5 bg-primary-500 rounded-r-full" />
                          )}
                          <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Sign out */}
              <div className="p-2 border-t border-surface-100">
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#D8727D] hover:bg-[#D8727D08] transition-all"
                >
                  <LogOut size={16} strokeWidth={1.8} />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 overflow-y-auto bg-white">
            <AnimatePresence mode="wait">

              {/* ══ Profile ══ */}
              {activeSection === 'profile' && (
                <motion.div key="profile" className="flex flex-col gap-4 bg-white pb-4"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}>

                  {/* Hero card */}
                  <div className="rounded-2xl overflow-hidden border border-surface-200" style={{ background: '#fff' }}>
                    {/* Banner */}
                    <div className="relative h-36 overflow-hidden" style={{
                      background: 'linear-gradient(120deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
                    }}>
                      {/* Mesh orbs */}
                      <div className="absolute inset-0" style={{
                        backgroundImage: `
                          radial-gradient(ellipse 60% 80% at 10% 50%, rgba(80,48,229,0.55) 0%, transparent 70%),
                          radial-gradient(ellipse 40% 60% at 80% 20%, rgba(219,39,119,0.45) 0%, transparent 65%),
                          radial-gradient(ellipse 35% 55% at 95% 85%, rgba(245,158,11,0.35) 0%, transparent 60%)
                        `,
                      }} />
                      {/* Fine grid overlay */}
                      <div className="absolute inset-0 opacity-[0.07]" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                      }} />
                      {/* Diagonal accent line */}
                      <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.15) 40px, rgba(255,255,255,0.15) 41px)',
                      }} />
                      <button
                        onClick={() => showToast('Cover photo upload is not available in this version.', 'info')}
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 text-white/80 hover:text-white text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.18)' }}
                      >
                        <Camera size={11} /> Change cover
                      </button>
                    </div>

                    {/* Content area */}
                    <div className="px-6 pb-5">
                      {/* Avatar row */}
                      <div className="flex items-end justify-between" style={{ marginTop: -28 }}>
                        <div className="relative">
                          <div className="rounded-full p-[3px]" style={{
                            background: 'linear-gradient(135deg, #5030E5, #DB2777, #F59E0B)',
                          }}>
                            <div className="rounded-full p-[2px] bg-white">
                              <Avatar name={nameValue} color={userColor} size="xl" />
                            </div>
                          </div>
                          <button
                            onClick={() => showToast('Avatar upload is not available in this version.', 'info')}
                            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white border-2 border-white transition-all hover:scale-110"
                            style={{ background: '#5030E5' }}
                          >
                            <Camera size={10} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pb-1">
                          <span className="text-[11px] font-bold px-3 py-1 rounded-full text-white" style={{
                            background: 'linear-gradient(135deg, #5030E5 0%, #7C3AED 100%)',
                            letterSpacing: '0.04em',
                          }}>ADMIN</span>
                          <button
                            onClick={handleShareProfile}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-gray-700 px-3 py-1 rounded-full border border-surface-200 hover:border-surface-300 transition-all"
                          >
                            <Link size={10} /> Share profile
                          </button>
                        </div>
                      </div>

                      {/* Name + meta + stats */}
                      <div className="mt-3 flex items-end justify-between gap-6">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-none">{nameValue}</h2>
                          <div className="flex items-center gap-4 mt-1.5">
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Briefcase size={10} className="text-gray-300" /> {roleValue}
                            </span>
                            <span className="w-px h-3 bg-surface-200" />
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <MapPin size={10} className="text-gray-300" /> {locationValue}
                            </span>
                          </div>
                        </div>

                        {/* Stat pills */}
                        <div className="flex items-center gap-4 shrink-0">
                          {stats.map((s) => {
                            const Icon = s.icon;
                            return (
                              <div key={s.label} className="flex items-center gap-1.5">
                                <Icon size={13} style={{ color: s.color }} strokeWidth={2.2} />
                                <span className="text-sm font-bold text-gray-900">{s.value}</span>
                                <span className="text-xs text-gray-400">{s.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Two-column: personal info + activity */}
                  <div className="grid grid-cols-[1fr_auto] gap-4">
                    {/* Personal info */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                      <SectionHeader
                        title="Personal Information"
                        subtitle="Hover over a field and click the pencil to edit"
                        action={
                          <button
                            onClick={() => showToast('Click the pencil icon on any field to edit it', 'info')}
                            className="text-xs text-primary-500 font-semibold hover:text-primary-700 flex items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-lg"
                          >
                            <Edit3 size={11} /> Edit all
                          </button>
                        }
                      />
                      <FieldRow icon={User} label="Full Name" value={nameValue} editable onSave={setNameValue} />
                      <FieldRow icon={Mail} label="Email" value={emailValue} editable onSave={setEmailValue} />
                      <FieldRow icon={MapPin} label="Location" value={locationValue} editable onSave={setLocationValue} />
                      <FieldRow icon={Clock} label="Timezone" value={timezoneValue} editable onSave={setTimezoneValue} />
                      <FieldRow icon={Briefcase} label="Role" value={roleValue} editable onSave={setRoleValue} />
                      <FieldRow icon={Globe} label="Member since" value="—" />
                    </div>

                    {/* Activity */}
                    <div className="bg-white rounded-2xl overflow-hidden w-52 border border-surface-200">
                      <SectionHeader title="Activity" subtitle="This month" />
                      <div className="px-4 py-3 flex flex-col gap-3">
                        {(() => {
                          const myDone = currentUser ? allTasks.filter(t => t.status === 'done' && t.assignees?.includes(currentUser.id)).length : 0;
                          const myAll = currentUser ? allTasks.filter(t => t.assignees?.includes(currentUser.id)).length : 0;
                          const myInProg = currentUser ? allTasks.filter(t => t.status === 'in-progress' && t.assignees?.includes(currentUser.id)).length : 0;
                          return [
                            { label: 'Tasks completed', value: myDone, max: Math.max(myAll, 1), color: '#68B266', icon: TrendingUp },
                            { label: 'Tasks assigned', value: myAll, max: Math.max(allTasks.length, 1), color: '#5030E5', icon: Activity },
                            { label: 'In progress', value: myInProg, max: Math.max(myAll, 1), color: '#30C5E5', icon: Zap },
                          ];
                        })().map(item => {
                          const Icon = item.icon;
                          const pct = Math.round((item.value / item.max) * 100);
                          return (
                            <div key={item.label} className="flex flex-col gap-1.5 p-3 bg-gradient-to-br from-surface-50 to-surface-100 rounded-xl border border-surface-100">
                              <div className="flex items-center justify-between">
                                <Icon size={12} style={{ color: item.color }} />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] text-gray-300 font-mono">{pct}%</span>
                                  <span className="text-xs font-bold text-gray-900">{item.value}</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: item.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.7, delay: 0.2 }}
                                />
                              </div>
                              <div className="text-[10px] text-gray-400 leading-tight">{item.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </motion.div>
              )}

              {/* ══ Notifications ══ */}
              {activeSection === 'notifications' && (
                <motion.div key="notifications" className="flex flex-col gap-4 bg-white pb-4"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}>

                  {/* Delivery channels */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                    <SectionHeader title="Delivery Channels" subtitle="How you want to receive alerts" />
                    <div className="px-5 py-1">
                      {[
                        { key: 'emailNotifs' as const, icon: Mail,       label: 'Email',        sub: emailValue },
                        { key: 'pushNotifs'  as const, icon: Bell,       label: 'Push',         sub: 'Browser & desktop' },
                        { key: 'smsNotifs'   as const, icon: Smartphone, label: 'SMS',          sub: 'Critical alerts only' },
                      ].map(row => {
                        const Icon = row.icon;
                        return (
                          <div key={row.key} className="flex items-center justify-between py-3.5 border-b border-surface-50 last:border-0">
                            <div className="flex items-center gap-3">
                              <Icon size={15} className={notifications[row.key] ? 'text-primary-400' : 'text-gray-300'} />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{row.label}</div>
                                <div className="text-[11px] text-gray-400">{row.sub}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <Toggle on={notifications[row.key]} onChange={() => toggleNotif(row.key)} />
                            </div>
                          </div>
                        );
                      })}

                      {/* Quiet Hours */}
                      <div className="flex items-center justify-between py-3.5">
                        <div className="flex items-center gap-3">
                          <Moon size={15} className={notifications.quietHours ? 'text-primary-400' : 'text-gray-300'} />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Quiet Hours</div>
                            <div className="text-[11px] text-gray-400">
                              {notifications.quietHours ? '10:00 PM – 8:00 AM' : 'All day'}
                            </div>
                          </div>
                        </div>
                        <Toggle on={notifications.quietHours} onChange={() => toggleNotif('quietHours')} />
                      </div>
                    </div>
                  </div>

                  {/* Activity Events */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                    <SectionHeader title="Activity Events" subtitle="Choose which events trigger notifications" />
                    <div className="px-5 py-2">
                      {[
                        { key: 'taskUpdates'    as const, label: 'Task updates',    sub: 'When tasks are created, updated or completed' },
                        { key: 'teamMentions'   as const, label: 'Team mentions',   sub: 'When someone @mentions you' },
                        { key: 'projectUpdates' as const, label: 'Project updates', sub: 'New milestones and project changes' },
                        { key: 'securityAlerts' as const, label: 'Security alerts', sub: 'New logins and suspicious activity' },
                        { key: 'weeklyDigest'   as const, label: 'Weekly digest',   sub: 'Summary email every Monday morning' },
                      ].map(row => (
                        <div key={row.key} className="flex items-center justify-between py-3.5 border-b border-surface-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full transition-colors ${notifications[row.key] ? 'bg-[#68B266]' : 'bg-surface-300'}`} />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{row.label}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{row.sub}</div>
                            </div>
                          </div>
                          <Toggle on={notifications[row.key]} onChange={() => toggleNotif(row.key)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ══ Appearance ══ */}
              {activeSection === 'appearance' && (
                <motion.div key="appearance" className="flex flex-col gap-4 bg-white pb-4"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}>

                  {/* Theme selector */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                    <SectionHeader title="Theme" subtitle="Select the interface appearance" />
                    <div className="px-6 py-5 grid grid-cols-3 gap-4">
                      {[
                        { id: 'light', label: 'Light', icon: Sun, preview: (
                          <div className="w-full h-20 rounded-xl bg-white border border-surface-200 flex flex-col p-2.5 gap-1.5">
                            <div className="h-1.5 bg-surface-300 rounded w-3/4" />
                            <div className="h-1.5 bg-surface-200 rounded w-1/2" />
                            <div className="mt-auto flex gap-1.5">
                              <div className="h-2.5 w-6 bg-primary-200 rounded" />
                              <div className="h-2.5 flex-1 bg-surface-200 rounded" />
                            </div>
                          </div>
                        )},
                        { id: 'dark', label: 'Dark', icon: Moon, preview: (
                          <div className="w-full h-20 rounded-xl bg-gray-900 flex flex-col p-2.5 gap-1.5">
                            <div className="h-1.5 bg-gray-600 rounded w-3/4" />
                            <div className="h-1.5 bg-gray-700 rounded w-1/2" />
                            <div className="mt-auto flex gap-1.5">
                              <div className="h-2.5 w-6 bg-primary-400 rounded" />
                              <div className="h-2.5 flex-1 bg-gray-700 rounded" />
                            </div>
                          </div>
                        )},
                        { id: 'system', label: 'System', icon: Monitor, preview: (
                          <div className="w-full h-20 rounded-xl overflow-hidden flex">
                            <div className="w-1/2 bg-white flex flex-col p-2.5 gap-1.5">
                              <div className="h-1.5 bg-surface-300 rounded" />
                              <div className="h-1.5 bg-surface-200 rounded w-2/3" />
                            </div>
                            <div className="w-1/2 bg-gray-900 flex flex-col p-2.5 gap-1.5">
                              <div className="h-1.5 bg-gray-600 rounded" />
                              <div className="h-1.5 bg-gray-700 rounded w-2/3" />
                            </div>
                          </div>
                        )},
                      ].map(opt => {
                        const Icon = opt.icon;
                        const active = themeMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => { const m = opt.id as typeof themeMode; setThemeMode(m); if (m !== 'system') setAppTheme(m); saveAppearance({ themeMode: m }); }}
                            className={`rounded-xl p-3 flex flex-col gap-2.5 border-2 transition-all ${
                              active
                                ? 'border-primary-400 bg-primary-50 shadow-[0_0_0_3px_rgba(80,48,229,0.12)]'
                                : 'border-surface-200 hover:border-surface-300 bg-surface-50'
                            }`}
                          >
                            {opt.preview}
                            <div className="flex items-center justify-center gap-1.5">
                              <Icon size={12} className={active ? 'text-primary-600' : 'text-gray-400'} />
                              <span className={`text-xs font-semibold ${active ? 'text-primary-600' : 'text-gray-500'}`}>{opt.label}</span>
                              {active && (
                                <span className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                  <Check size={10} className="text-white" />
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                    <SectionHeader title="Accent Color" subtitle="Applies to buttons, links and highlights" />
                    <div className="px-6 py-5 flex items-center gap-4">
                      {ACCENT_COLORS.map(c => (
                        <button
                          key={c.hex}
                          onClick={() => { setAccentColor(c.hex); saveAppearance({ accentColor: c.hex }); }}
                          title={c.label}
                          className="relative w-9 h-9 rounded-full transition-transform hover:scale-110 focus:outline-none"
                          style={{ backgroundColor: c.hex }}
                        >
                          {accentColor === c.hex && (
                            <>
                              <span className="absolute inset-0 flex items-center justify-center">
                                <Check size={14} className="text-white" strokeWidth={3} />
                              </span>
                              <span
                                className="absolute -inset-1.5 rounded-full border-2"
                                style={{ borderColor: c.hex + '66' }}
                              />
                            </>
                          )}
                        </button>
                      ))}
                      <div className="ml-2 text-xs text-gray-400">
                        {ACCENT_COLORS.find(c => c.hex === accentColor)?.label ?? 'Custom'}
                      </div>
                    </div>
                  </div>

                  {/* Display Preferences */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                    <SectionHeader title="Display Preferences" subtitle="Customize how content is shown" />

                    {/* Font Size */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Font Size</div>
                        <div className="text-xs text-gray-400 mt-0.5">Interface text size</div>
                      </div>
                      <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
                        {(['sm', 'md', 'lg'] as const).map(size => (
                          <button
                            key={size}
                            onClick={() => { setFontSize(size); saveAppearance({ fontSize: size }); }}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              fontSize === size
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Compact Mode */}
                    <div className="flex items-center justify-between px-6 py-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Compact Mode</div>
                        <div className="text-xs text-gray-400 mt-0.5">Reduce spacing in lists and cards</div>
                      </div>
                      <Toggle on={compactMode} onChange={() => { setCompactMode(c => { saveAppearance({ compactMode: !c }); return !c; }); }} />
                    </div>
                  </div>

                  {/* Localization */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                    <SectionHeader title="Localization" subtitle="Regional preferences" />
                    {[
                      { label: 'Language', value: 'English (US)', icon: Globe },
                      { label: 'Timezone', value: timezoneValue, icon: Clock },
                      { label: 'Date format', value: 'DD/MM/YYYY', icon: Clock },
                    ].map(row => {
                      const Icon = row.icon;
                      return (
                        <button
                          key={row.label}
                          onClick={() => showToast(`${row.label} changes are saved locally.`, 'info')}
                          className="w-full flex items-center justify-between px-6 py-4 border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center">
                              <Icon size={14} className="text-gray-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{row.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{row.value}</span>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ══ Security ══ */}
              {activeSection === 'security' && (
                <motion.div key="security" className="grid grid-cols-[1fr_auto] gap-4 items-start bg-white pb-4"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}>

                  {/* Left — Password */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                    <SectionHeader title="Change Password" subtitle="Update your login password" />
                    <div className="px-5 py-4 flex flex-col gap-3">
                      {(
                        [
                          { key: 'current', label: 'Current password', icon: Lock },
                          { key: 'next',    label: 'New password',     icon: Key },
                          { key: 'confirm', label: 'Confirm new password', icon: Check },
                        ] as { key: 'current' | 'next' | 'confirm'; label: string; icon: React.ElementType }[]
                      ).map(({ key, label, icon: FieldIcon }) => (
                        <div key={key}>
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
                            <span className="w-5 h-5 rounded-md bg-surface-100 flex items-center justify-center">
                              <FieldIcon size={10} className="text-gray-400" />
                            </span>
                            {label}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword[key] ? 'text' : 'password'}
                              value={passwords[key]}
                              onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                              placeholder="••••••••"
                              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all bg-surface-50 focus:bg-white pr-10"
                            />
                            <button
                              onClick={() => setShowPassword(p => ({ ...p, [key]: !p[key] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      ))}

                      {passwords.next && (
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-2">
                            <span className="font-semibold text-gray-400">Password strength</span>
                            <span className="font-semibold" style={{ color: strength.color }}>{strength.label}</span>
                          </div>
                          <div className="flex gap-1 mb-1.5">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
                                style={{ backgroundColor: i <= strength.score ? strength.color : '#E0E0E0' }} />
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {strength.score < 3 ? 'Add symbols and numbers to strengthen your password' : 'Your password looks strong!'}
                          </p>
                        </div>
                      )}

                      <motion.button
                        onClick={handleUpdatePassword}
                        className="bg-primary-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors"
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      >
                        Update Password
                      </motion.button>
                    </div>
                  </div>

                  {/* Right — 2FA + Sessions + Login History */}
                  <div className="flex flex-col gap-4 w-64">
                    {/* 2FA */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                      <SectionHeader title="Two-Factor Auth" subtitle="Account protection" />
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#83C29D20] flex items-center justify-center shrink-0">
                            <Key size={14} className="text-[#68B266]" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-900">Authenticator app</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              <span className="text-[10px] text-gray-400 font-medium">Not set up</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => showToast('Two-factor authentication is not available in this version.', 'info')}
                          className="text-[10px] font-semibold text-primary-500 hover:text-primary-700 bg-primary-50 px-2.5 py-1.5 rounded-lg shrink-0"
                        >
                          Manage
                        </button>
                      </div>
                    </div>

                    {/* Active Sessions */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                        <div>
                          <div className="text-xs font-bold text-gray-900">Active Sessions</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Logged-in devices</div>
                        </div>
                      </div>
                      <div className="px-4 py-4 text-center text-xs text-gray-400">Session tracking is not available in this version.</div>
                    </div>

                    {/* Login History */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                      <SectionHeader title="Login History" subtitle="Recent account access" />
                      <div className="px-4 py-4 text-center text-xs text-gray-400">Login history is not available in this version.</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ══ Billing ══ */}
              {activeSection === 'billing' && (
                <motion.div key="billing" className="flex flex-col gap-4 bg-white pb-4"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}>

                  <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
                    <SectionHeader title="Current Plan" subtitle="Manage your subscription" />

                    {/* Active plan banner */}
                    <div className="mx-5 my-4 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-primary-400 font-bold uppercase tracking-wider mb-0.5">Active Plan</div>
                        <div className="font-bold text-gray-900 text-base">Free Plan</div>
                        <div className="text-xs text-gray-400 mt-0.5">Up to 3 projects · 5 GB storage · 3 members</div>
                      </div>
                      <motion.button
                        onClick={() => showToast('Pro plan coming soon. Contact sales@projectm.io.', 'info')}
                        className="bg-gradient-to-r from-primary-500 to-primary-400 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shrink-0"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      >
                        Upgrade to Pro →
                      </motion.button>
                    </div>

                    {/* Plans grid */}
                    <div className="px-5 pb-4 grid grid-cols-3 gap-3">
                      {[
                        { name: 'Free',       price: '$0',     period: '/month', features: ['3 projects', '5 GB storage', '3 members', 'Basic analytics'],      current: true,  accent: null },
                        { name: 'Pro',        price: '$12',    period: '/month', features: ['Unlimited projects', '50 GB storage', '25 members', 'Advanced analytics'], current: false, accent: 'primary' },
                        { name: 'Enterprise', price: 'Custom', period: '',       features: ['Unlimited everything', '500 GB storage', 'SSO + audit log', 'Dedicated support'], current: false, accent: 'amber' },
                      ].map(plan => (
                        <div
                          key={plan.name}
                          className={`rounded-xl overflow-hidden border-2 ${
                            plan.current
                              ? 'border-primary-300 bg-primary-50 shadow-[0_0_0_2px_rgba(80,48,229,0.15),0_4px_20px_rgba(80,48,229,0.08)]'
                              : 'border-surface-200 hover:border-surface-300 transition-colors'
                          }`}
                        >
                          {plan.accent === 'primary' && <div className="h-1 bg-gradient-to-r from-primary-500 to-primary-300" />}
                          {plan.accent === 'amber'   && <div className="h-1 bg-gradient-to-r from-[#F59E0B] to-[#FCD34D]" />}
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-bold text-gray-900 text-sm">{plan.name}</div>
                                <div className="flex items-baseline gap-0.5 mt-1">
                                  <span className={`text-xl font-extrabold ${plan.current ? 'text-primary-600' : 'text-gray-800'}`}>{plan.price}</span>
                                  {plan.period && <span className="text-xs text-gray-400">{plan.period}</span>}
                                </div>
                              </div>
                              {plan.current && <span className="text-[9px] bg-primary-500 text-white px-1.5 py-0.5 rounded-full font-bold">Current</span>}
                            </div>
                            <div className="flex flex-col gap-2 mb-4">
                              {plan.features.map(f => (
                                <div key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Check size={10} className={plan.current ? 'text-primary-500' : 'text-gray-400'} />
                                  {f}
                                </div>
                              ))}
                            </div>
                            {plan.current
                              ? <div className="text-center text-xs font-semibold text-primary-400 bg-primary-50 border border-primary-200 py-2 rounded-lg">Current Plan</div>
                              : plan.name === 'Pro'
                              ? (
                                <motion.button
                                  onClick={() => showToast('Pro plan coming soon. Contact sales@projectm.io.', 'info')}
                                  className="w-full bg-gradient-to-r from-primary-500 to-primary-400 text-white text-xs font-bold py-2 rounded-lg hover:opacity-90 transition-opacity"
                                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                                >
                                  Upgrade →
                                </motion.button>
                              )
                              : (
                                <button
                                  onClick={() => showToast('Contact sales@projectm.io for pricing', 'info')}
                                  className="w-full bg-surface-100 text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-surface-200 transition-colors"
                                >
                                  Contact Sales
                                </button>
                              )
                            }
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Usage meters */}
                    <div className="px-5 pb-5 border-t border-surface-100 pt-5">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Usage This Month</div>
                      <div className="flex flex-col gap-4">
                        {[
                          { label: 'Storage',   used: 2.3,  max: 5,     unit: 'GB',    color: '#5030E5', pct: 46  },
                          { label: 'API Calls', used: 4200, max: 10000, unit: 'calls', color: '#30C5E5', pct: 42  },
                          { label: 'Members',   used: members.length, max: 3, unit: '', color: '#FFA500', pct: Math.min(100, Math.round((members.length / 3) * 100)) },
                        ].map(meter => (
                          <div key={meter.label}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-semibold text-gray-700">{meter.label}</span>
                              <span className="text-gray-400">
                                {meter.used}{meter.unit ? ' ' + meter.unit : ''} <span className="text-gray-300">of</span> {meter.max}{meter.unit ? ' ' + meter.unit : ''}
                              </span>
                            </div>
                            <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: meter.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${meter.pct}%` }}
                                transition={{ duration: 0.7, delay: 0.2 }}
                              />
                            </div>
                            {meter.pct >= 100 && (
                              <div className="text-[10px] text-[#D8727D] mt-1 font-medium">Limit reached — upgrade for more</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-white rounded-2xl overflow-hidden border border-[#D8727D22]">
                    <div className="px-5 py-4 border-b border-[#D8727D22] flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#D8727D15] flex items-center justify-center">
                        <AlertTriangle size={13} className="text-[#D8727D]" />
                      </div>
                      <div>
                        <h2 className="font-bold text-[#D8727D] text-sm">Danger Zone</h2>
                        <p className="text-[10px] text-[#D8727D80]">These actions are permanent and cannot be undone</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-100">
                          <Download size={14} className="text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Export all data</div>
                          <div className="text-xs text-gray-400 mt-0.5">Download a full copy of your workspace data</div>
                        </div>
                      </div>
                      <button onClick={handleExportData} className="text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors text-gray-600 bg-surface-100 hover:bg-surface-200">
                        Export
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#D8727D15]">
                          <Trash2 size={14} className="text-[#D8727D]" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Delete account</div>
                          <div className="text-xs text-gray-400 mt-0.5">Permanently delete your account and all data</div>
                        </div>
                      </div>
                      {confirmDelete ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500">Are you sure?</span>
                          <button onClick={() => { showToast('Account deleted.', 'info'); setConfirmDelete(false); logout(); }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50">Yes</button>
                          <button onClick={() => setConfirmDelete(false)}
                            className="text-[10px] font-bold text-gray-500 px-1.5 py-0.5 rounded bg-gray-100">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={handleDeleteAccount} className="text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors text-[#D8727D] bg-[#D8727D0A] hover:bg-[#D8727D18] border border-[#D8727D33]">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}


              {/* ══ About ══ */}
              {activeSection === 'about' && (
                <motion.div key="about" className="flex flex-col gap-4 bg-white pb-4"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}>

                  {/* App identity card */}
                  <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-primary-500 via-[#8B5CF6] to-[#0EA5E9]" />
                    <div className="p-6 flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-[#8B5CF6] flex items-center justify-center shadow-lg shrink-0">
                        <span className="text-white font-bold text-2xl tracking-tight">P</span>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">ProjectX</div>
                        <div className="text-sm text-gray-400 mt-0.5">
                          Version {updateState.appVersion ?? '1.0.0'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Project planning for high-performance teams</div>
                      </div>
                    </div>
                  </div>

                  {/* Update status */}
                  <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
                    <SectionHeader title="Software Update" subtitle="Keep ProjectX up to date" />
                    <div className="px-6 py-5">
                      {/* Status row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            updateState.status === 'downloaded' ? 'bg-[#68B26615]' :
                            updateState.status === 'error'      ? 'bg-red-50' :
                            'bg-primary-50'
                          }`}>
                            {updateState.status === 'downloaded' ? (
                              <CheckCircle2 size={16} className="text-[#68B266]" />
                            ) : updateState.status === 'error' ? (
                              <AlertTriangle size={16} className="text-red-500" />
                            ) : (
                              <RefreshCw size={16} className={`text-primary-500 ${updateState.status === 'checking' || updateState.status === 'downloading' ? 'animate-spin' : ''}`} />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">
                              {updateState.status === 'idle'          && 'Up to date'}
                              {updateState.status === 'checking'      && 'Checking for updates…'}
                              {updateState.status === 'not-available' && 'Already on the latest version'}
                              {updateState.status === 'available'     && `v${updateState.version} available — downloading…`}
                              {updateState.status === 'downloading'   && `Downloading… ${updateState.progress ?? 0}%`}
                              {updateState.status === 'downloaded'    && `v${updateState.version} ready to install`}
                              {updateState.status === 'error'         && 'Update check failed'}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {updateState.status === 'error'
                                ? updateState.errorMessage ?? 'An error occurred.'
                                : `Current version: ${updateState.appVersion ?? '1.0.0'}`}
                            </div>
                          </div>
                        </div>

                        {/* Action button */}
                        {updateState.status === 'downloaded' ? (
                          <button
                            onClick={installUpdate}
                            className="px-4 py-2 bg-primary-500 text-white text-xs font-semibold rounded-xl hover:bg-primary-600 transition-colors"
                          >
                            Restart & install
                          </button>
                        ) : (
                          <button
                            onClick={checkForUpdate}
                            disabled={updateState.status === 'checking' || updateState.status === 'downloading'}
                            className="px-4 py-2 bg-surface-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-surface-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Check for updates
                          </button>
                        )}
                      </div>

                      {/* Progress bar */}
                      {(updateState.status === 'downloading' || updateState.status === 'available') && (
                        <div className="mt-4 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary-500 rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: `${updateState.progress ?? 0}%` }}
                            transition={{ ease: 'linear', duration: 0.3 }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
