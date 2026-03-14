import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AppContext, AttendanceRecord } from '../context/AppContext';
import { useMembersContext } from '../context/MembersContext';
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

const AttendancePage: React.FC = () => {
    const { attendanceRecords, selectedWeekStart } = useContext(AppContext);
    const { members, getMemberColor } = useMembersContext();

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
    const perfectCount = members.filter(m =>
        WEEK_DATES.every(d => isPresent(getMemberStatus(m.id, d)))).length;
    const dailyPresent = WEEK_DATES.map(date =>
        members.filter(m => isPresent(getMemberStatus(m.id, date))).length
    );

    const daysWithData = WEEK_DATES.filter(date =>
        members.some(m => getMemberStatus(m.id, date) !== undefined)
    ).length;

    const trackedDays = daysWithData > 0 ? daysWithData : 5;
    const avgRate = members.length > 0 ? Math.round((totalPresent / (members.length * trackedDays)) * 100) : 0;
    const hasAbsenceCount = members.filter(m =>
        WEEK_DATES.some(d => getMemberStatus(m.id, d) === 'absent')
    ).length;

    const metrics = [
        { label: 'Team Avg Rate', value: `${avgRate}%`, trend: `${trackedDays} day${trackedDays !== 1 ? 's' : ''} tracked`, trendUp: true, color: '', accent: true, icon: TrendingUp, barPct: avgRate },
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
          actions={
            <motion.button onClick={handleExport} className="flex items-center gap-2 bg-white text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Download size={16} /> Export
            </motion.button>
          }
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
            <span className="text-xs text-gray-400">{WEEK_DATES[0]} – {WEEK_DATES[4]}</span>
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
                const rate = `${Math.round((presentCount / 5) * 100)}%`;
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
                            <div className={`w-2.5 h-2.5 rounded-full mx-auto ${
                                isPresent(status) ? 'bg-[#68B266]' :
                                status === 'absent' ? 'bg-[#D8727D]' :
                                'bg-gray-300'
                            }`} />
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
