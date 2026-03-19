import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, CheckCircle, AlertCircle, Calendar, LogIn, LogOut, Coffee, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays as dateFnsAddDays } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AppContext, AttendanceRecord } from '../context/AppContext';
import { useMembersContext } from '../context/MembersContext';
import { useAuth } from '../context/AuthContext';
import { downloadCsv } from '../utils/exportCsv';

function addDays(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const dy = String(date.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
}

const TODAY_DATE = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(); // local "YYYY-MM-DD"

const TodaySessionCard: React.FC = () => {
  const { currentUser, attendanceRecords, setAttendanceRecord } = useContext(AppContext);
  const [now, setNow] = React.useState(Date.now());
  const [saving, setSaving] = React.useState(false);

  if (!currentUser) return null;

  const todayRecord = attendanceRecords.find(
    r => r.userId === currentUser.id && r.date === TODAY_DATE
  ) ?? null;

  // ── Derive state ────────────────────────────────────────────────────────────
  type SessionState = 'NOT_STARTED' | 'WORKING' | 'ON_BREAK' | 'DONE';
  const state: SessionState = (() => {
    if (!todayRecord?.checkIn) return 'NOT_STARTED';
    if (todayRecord.checkOut) return 'DONE';
    const sessions = todayRecord.breakSessions ?? [];
    if (sessions.length > 0 && sessions[sessions.length - 1].end === null) return 'ON_BREAK';
    return 'WORKING';
  })();

  // ── Timer ───────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (state !== 'WORKING' && state !== 'ON_BREAK') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state]);

  // ── Time math ───────────────────────────────────────────────────────────────
  const fmt = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const hh = Math.floor(s / 3600).toString().padStart(2, '0');
    const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const checkInMs = todayRecord?.checkIn ? new Date(todayRecord.checkIn).getTime() : 0;
  const closedBreakMs = Math.max(0, (todayRecord?.breakSessions ?? [])
    .filter(b => b.end)
    .reduce((sum, b) => sum + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0));
  const openBreakSession = state === 'ON_BREAK'
    ? (() => { const s = todayRecord?.breakSessions ?? []; return s.length ? s[s.length - 1] : null; })() ?? null
    : null;
  const openBreakMs = openBreakSession
    ? Math.max(0, now - new Date(openBreakSession.start).getTime())
    : 0;
  const workMs = state === 'NOT_STARTED' ? 0
    : state === 'DONE'
      ? Math.max(0, new Date(todayRecord!.checkOut!).getTime() - checkInMs - closedBreakMs)
      : Math.max(0, now - checkInMs - closedBreakMs - openBreakMs);

  // ── Summary row helpers ─────────────────────────────────────────────────────
  const fmtTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const breakMinutes = Math.round(closedBreakMs / 60000);

  // ── Badge config ────────────────────────────────────────────────────────────
  const badgeCfg: Record<SessionState, { label: string; bg: string; text: string }> = {
    NOT_STARTED: { label: 'Not Started', bg: 'bg-gray-100',    text: 'text-gray-500'   },
    WORKING:     { label: 'Working',     bg: 'bg-[#83C29D33]', text: 'text-[#68B266]'  },
    ON_BREAK:    { label: 'On Break',    bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]'  },
    DONE:        { label: 'Done',        bg: 'bg-[#E0E7EF]',   text: 'text-[#6B7FA3]'  },
  };
  const badge = badgeCfg[state];

  // ── Action handlers ─────────────────────────────────────────────────────────
  const act = async (fn: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    try { await fn(); } finally { setSaving(false); }
  };

  const handlePunchIn = () => act(async () => {
    const existing = attendanceRecords.find(r => r.userId === currentUser.id && r.date === TODAY_DATE);
    const { id: _id, ...existingRest } = existing ?? { id: '' };
    await setAttendanceRecord({
      ...existingRest,
      userId: currentUser.id,
      date: TODAY_DATE,
      status: 'present',
      checkIn: new Date().toISOString(),
      breakSessions: [],
    });
  });

  const handleBreakOut = () => act(async () => {
    const { id: _id, ...rec } = todayRecord!;
    await setAttendanceRecord({
      ...rec,
      breakSessions: [...(rec.breakSessions ?? []), { start: new Date().toISOString(), end: null }],
    });
  });

  const handleBreakIn = () => act(async () => {
    const { id: _id, ...rec } = todayRecord!;
    const sessions = [...(rec.breakSessions ?? [])];
    sessions[sessions.length - 1] = { ...sessions[sessions.length - 1], end: new Date().toISOString() };
    await setAttendanceRecord({ ...rec, breakSessions: sessions });
  });

  const handlePunchOut = () => act(async () => {
    const { id: _id, ...rec } = todayRecord!;
    const sessions = [...(rec.breakSessions ?? [])];
    if (sessions.length > 0 && !sessions[sessions.length - 1].end) {
      sessions[sessions.length - 1] = { ...sessions[sessions.length - 1], end: new Date().toISOString() };
    }
    await setAttendanceRecord({ ...rec, checkOut: new Date().toISOString(), breakSessions: sessions });
  });

  return (
    <motion.div
      className="bg-white rounded-2xl border border-surface-200 p-4"
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">Today's Session</h3>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {/* Timer area */}
      <div className="text-center mb-4">
        <div className="text-3xl font-mono font-bold text-gray-900 tracking-tight">
          {fmt(workMs)}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {state === 'DONE' ? 'Total Work Time' : 'Net Work Time'}
        </div>

        {state === 'ON_BREAK' && (
          <div className="mt-2">
            <div className="text-lg font-mono font-semibold text-[#D58D49]">
              {fmt(openBreakMs)}
            </div>
            <div className="text-xs text-[#D58D49]">On Break</div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {state === 'NOT_STARTED' && (
        <button
          onClick={handlePunchIn}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #68B266 0%, #4CAF50 100%)' }}
        >
          <LogIn size={15} /> Punch In
        </button>
      )}

      {state === 'WORKING' && (
        <div className="flex gap-2">
          <button
            onClick={handleBreakOut}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[#D58D49] text-[#D58D49] flex items-center justify-center gap-2 hover:bg-[#DFA87415] transition-colors disabled:opacity-60"
          >
            <Coffee size={15} /> Take Break
          </button>
          <button
            onClick={handlePunchOut}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[#D8727D] text-[#D8727D] flex items-center justify-center gap-2 hover:bg-[#D8727D15] transition-colors disabled:opacity-60"
          >
            <LogOut size={15} /> Punch Out
          </button>
        </div>
      )}

      {state === 'ON_BREAK' && (
        <button
          onClick={handleBreakIn}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: '#D58D49' }}
        >
          <Coffee size={15} /> Break Out
        </button>
      )}

      {/* Summary row */}
      <div className="flex justify-between mt-4 pt-3 border-t border-surface-100 text-xs text-gray-500">
        <span>In: <span className="font-semibold text-gray-800">{fmtTime(todayRecord?.checkIn)}</span></span>
        <span>Break: <span className="font-semibold text-gray-800">{breakMinutes}m</span></span>
        <span>Out: <span className="font-semibold text-gray-800">{fmtTime(todayRecord?.checkOut)}</span></span>
      </div>
    </motion.div>
  );
};

const AttendancePage: React.FC = () => {
    const { attendanceRecords, selectedWeekStart, setSelectedWeekStart, currentUser, deleteAttendanceRecord } = useContext(AppContext);
    const { members: allMembers, getMemberColor } = useMembersContext();

    const isAdmin = currentUser?.role === 'admin';
    const members = isAdmin
        ? allMembers
        : allMembers.filter(m => m.id === currentUser?.id);

    const weekStart = new Date(selectedWeekStart + 'T00:00:00');
    const handlePrevWeek = () => setSelectedWeekStart(addDays(selectedWeekStart, -7));
    const handleNextWeek = () => setSelectedWeekStart(addDays(selectedWeekStart, 7));
    const isCurrentWeek = format(weekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const WEEK_DATES = [0, 1, 2, 3, 4].map(i => addDays(selectedWeekStart, i));
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const rateStyles: Record<string, { bg: string; text: string }> = {
        '100%': { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]' },
        '80%':  { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]' },
        '60%':  { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]' },
        '40%':  { bg: 'bg-[#F8D7DA33]', text: 'text-[#D8727D]' },
        '20%':  { bg: 'bg-[#F8D7DA33]', text: 'text-[#D8727D]' },
        '0%':   { bg: 'bg-[#F8D7DA33]', text: 'text-[#D8727D]' },
    };

    // Per-member, per-date status lookup
    function getMemberStatus(userId: string, date: string): AttendanceRecord['status'] | undefined {
        return attendanceRecords.find(r => r.userId === userId && r.date === date)?.status;
    }

    function isPresent(status: AttendanceRecord['status'] | undefined): boolean {
        return status === 'present' || status === 'wfh';
    }

    // Metrics
    const totalPresent = members.reduce((sum, m) =>
        sum + WEEK_DATES.filter(d => isPresent(getMemberStatus(m.id, d))).length, 0);
    const totalAbsent = members.reduce((sum, m) =>
        sum + WEEK_DATES.filter(d => getMemberStatus(m.id, d) === 'absent').length, 0);
    const perfectCount = members.filter(m => {
        const statuses = WEEK_DATES.map(d => getMemberStatus(m.id, d));
        const hasAnyRecord = statuses.some(s => s !== undefined);
        return hasAnyRecord && statuses.every(s => isPresent(s));
    }).length;
    const dailyPresent = WEEK_DATES.map(date =>
        members.filter(m => isPresent(getMemberStatus(m.id, date))).length
    );

    const daysWithData = WEEK_DATES.filter(date =>
        members.some(m => getMemberStatus(m.id, date) !== undefined)
    ).length;

    const avgRate = members.length > 0 && daysWithData > 0
      ? Math.round((totalPresent / (members.length * Math.max(daysWithData, 1))) * 100)
      : 0;
    const hasAbsenceCount = members.filter(m =>
        WEEK_DATES.some(d => getMemberStatus(m.id, d) === 'absent')
    ).length;

    const metrics = [
        { label: 'Team Avg Rate', value: `${avgRate}%`, trend: `${daysWithData} day${daysWithData !== 1 ? 's' : ''} tracked`, trendUp: true, color: '', accent: true, icon: TrendingUp, barPct: avgRate },
        { label: 'Perfect Attendance', value: String(perfectCount), trend: '100% rate', trendUp: true, color: '#68B266', accent: false, icon: CheckCircle, barPct: members.length > 0 ? (perfectCount / members.length) * 100 : 0 },
        { label: 'Has Absence', value: String(hasAbsenceCount), trend: 'This week', trendUp: false, color: '#D58D49', accent: false, icon: AlertCircle, barPct: members.length > 0 ? (hasAbsenceCount / members.length) * 100 : 0 },
        { label: 'Days Tracked', value: String(daysWithData), trend: 'Mon–Fri', trendUp: true, color: '#30C5E5', accent: false, icon: Calendar, barPct: (daysWithData / 5) * 100 },
    ];

    const handleExport = () => {
        const header = ['Member', 'Date', 'Status'];
        const rows = attendanceRecords.map(r => {
            const memberName = members.find(m => m.id === r.userId)?.name ?? r.userId;
            return [memberName, r.date, r.status];
        });
        downloadCsv('attendance.csv', [header, ...rows]);
    };

    return (
  <motion.div
    className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="flex flex-col h-full">
      <div className="pt-8 pb-5 shrink-0">
        <PageHeader
          eyebrow="Home / Attendance"
          title="Attendance"
          description="Weekly overview"
          actions={null}
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-5 mb-4 shrink-0">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-2xl p-5 ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent ? 'bg-white/15' : ''}`} style={!m.accent ? { background: m.color + '20' } : {}}>
                  <Icon size={16} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                </div>
                <span className={`text-xs font-semibold ${m.accent ? 'text-white/70' : m.trendUp ? 'text-[#68B266]' : 'text-[#D8727D]'}`}>{m.trend}</span>
              </div>
              <div className={`text-3xl font-extrabold tracking-tight ${m.accent ? 'text-white' : ''}`} style={!m.accent ? { color: m.color } : {}}>{m.value}</div>
              <div className={`text-xs mt-1 ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
              <div className={`mt-3 h-1 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-surface-200'}`}>
                <div className="h-full rounded-full" style={{ width: `${m.barPct}%`, background: m.accent ? 'rgba(255,255,255,0.6)' : m.color }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_300px] gap-5 flex-1 min-h-0 pb-6">
        {/* Main: Attendance table */}
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">Weekly Attendance</h2>
            <div className="flex items-center gap-2">
              <button onClick={handlePrevWeek} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors text-gray-500">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium w-44 text-center text-gray-700">
                {format(weekStart, 'MMM d')} – {format(dateFnsAddDays(weekStart, 6), 'MMM d, yyyy')}
              </span>
              <button
                onClick={handleNextWeek}
                disabled={isCurrentWeek}
                className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">Member</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">Role</th>
                {days.map(d => (
                  <th key={d} className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{d}</th>
                ))}
                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">Rate</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, i) => {
                const color = getMemberColor(member.id);
                const dayStatuses = WEEK_DATES.map(date => getMemberStatus(member.id, date));
                const presentCount = dayStatuses.filter(isPresent).length;
                const rate = `${Math.round((presentCount / Math.max(daysWithData, 1)) * 100)}%`;
                const rateStyle = rateStyles[rate];
                return (
                  <motion.tr
                    key={member.id}
                    className="border-b border-surface-100 hover:bg-surface-50 transition-colors"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={member.name} color={color} size="sm" />
                        <span className="font-semibold text-xs text-gray-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{member.designation ?? '—'}</td>
                    {dayStatuses.map((status, di) => (
                        <td key={days[di]} className="px-3 py-3 text-center">
                            {isAdmin && status !== undefined ? (
                                <button
                                    onClick={() => deleteAttendanceRecord(member.id, WEEK_DATES[di])}
                                    className="group relative w-5 h-5 rounded-full mx-auto flex items-center justify-center"
                                    title="Delete record"
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full group-hover:hidden ${
                                        isPresent(status) ? 'bg-[#68B266]' :
                                        status === 'absent' ? 'bg-[#D8727D]' :
                                        'bg-gray-300'
                                    }`} />
                                    <Trash2 size={12} className="hidden group-hover:block text-gray-400 hover:text-[#D8727D] transition-colors" />
                                </button>
                            ) : (
                                <div className={`w-2.5 h-2.5 rounded-full mx-auto ${
                                    isPresent(status) ? 'bg-[#68B266]' :
                                    status === 'absent' ? 'bg-[#D8727D]' :
                                    'bg-gray-300'
                                }`} />
                            )}
                        </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rateStyle?.bg ?? ''} ${rateStyle?.text ?? ''}`}>{rate}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
          <TodaySessionCard />
          {/* Attendance Summary */}
          <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Attendance Summary</h3>
            {[['Present days', totalPresent], ['Absent days', totalAbsent], ['Perfect streak', perfectCount]].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between py-2 border-b border-surface-100 last:border-0 text-xs">
                <span className="text-gray-500">{label}</span>
                <span className="font-bold text-gray-900">{val}</span>
              </div>
            ))}
          </motion.div>

          {/* Daily Breakdown */}
          <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Daily Breakdown</h3>
            {days.map((day, di) => {
              const present = dailyPresent[di];
              const pct = members.length > 0 ? (present / members.length) * 100 : 0;
              const allPresent = members.length > 0 && present === members.length;
              return (
                <div key={day} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0 text-xs">
                  <span className="text-gray-500 w-8 shrink-0">{day}</span>
                  <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: allPresent ? '#68B266' : '#FFA500' }} />
                  </div>
                  <span className="font-bold text-gray-900 w-8 text-right">{present}/{members.length}</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
    );
};

export default AttendancePage;
