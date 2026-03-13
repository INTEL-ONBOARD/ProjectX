import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors } from '../data/mockData';
import { AppContext, AttendanceRecord } from '../context/AppContext';

const AttendancePage: React.FC = () => {
    const { attendanceRecords } = useContext(AppContext);

    const WEEK_DATES = ['2020-12-01', '2020-12-02', '2020-12-03', '2020-12-04', '2020-12-05'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const designations: Record<string, string> = {
        u1: 'Project Manager', u2: 'Frontend Developer', u3: 'UI Designer',
        u4: 'Backend Developer', u5: 'QA Engineer', u6: 'DevOps Engineer',
    };

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
    const totalPresent = teamMembers.reduce((sum, m) =>
        sum + WEEK_DATES.filter(d => isPresent(getMemberStatus(m.id, d))).length, 0);
    const totalAbsent = teamMembers.reduce((sum, m) =>
        sum + WEEK_DATES.filter(d => getMemberStatus(m.id, d) === 'absent').length, 0);
    const perfectCount = teamMembers.filter(m =>
        WEEK_DATES.every(d => isPresent(getMemberStatus(m.id, d)))).length;
    const avgRate = Math.round((totalPresent / (teamMembers.length * 5)) * 100);

    const dailyPresent = WEEK_DATES.map(date =>
        teamMembers.filter(m => isPresent(getMemberStatus(m.id, date))).length
    );

    const metrics = [
        { label: 'Team Avg Rate', value: `${avgRate}%`, trend: 'This week', trendUp: true, color: '', accent: true, icon: TrendingUp, barPct: avgRate },
        { label: 'Perfect Attendance', value: String(perfectCount), trend: '100% rate', trendUp: true, color: '#68B266', accent: false, icon: CheckCircle, barPct: (perfectCount / teamMembers.length) * 100 },
        { label: 'One Absence', value: String(teamMembers.length - perfectCount), trend: '80% rate', trendUp: false, color: '#D58D49', accent: false, icon: AlertCircle, barPct: ((teamMembers.length - perfectCount) / teamMembers.length) * 100 },
        { label: 'Days Tracked', value: '5', trend: 'Mon–Fri', trendUp: true, color: '#30C5E5', accent: false, icon: Calendar, barPct: 100 },
    ];

    return (
  <motion.div
    className="flex-1 overflow-y-auto px-8 pb-8 bg-white"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="w-full">
      <div className="pt-8 pb-5">
        <PageHeader
          eyebrow="Home / Attendance"
          title="Attendance"
          description="Weekly overview"
          actions={
            <motion.button className="flex items-center gap-2 bg-white text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Download size={16} /> Export
            </motion.button>
          }
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-2xl p-5 shadow-card ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white'}`}
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
      <div className="grid grid-cols-[1fr_300px] gap-5">
        {/* Main: Attendance table */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">Weekly Attendance</h2>
            <span className="text-xs text-gray-400">Dec 1–5, 2020</span>
          </div>
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
              {teamMembers.map((member, i) => {
                const color = memberColors[i] ?? memberColors[0];
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
                    <td className="px-4 py-3 text-xs text-gray-500">{designations[member.id] ?? '—'}</td>
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

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Attendance Summary */}
          <motion.div className="bg-white rounded-2xl shadow-card p-4"
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
          <motion.div className="bg-white rounded-2xl shadow-card p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Daily Breakdown</h3>
            {days.map((day, di) => {
              const present = dailyPresent[di];
              const pct = (present / teamMembers.length) * 100;
              const allPresent = present === teamMembers.length;
              return (
                <div key={day} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0 text-xs">
                  <span className="text-gray-500 w-8 shrink-0">{day}</span>
                  <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: allPresent ? '#68B266' : '#FFA500' }} />
                  </div>
                  <span className="font-bold text-gray-900 w-8 text-right">{present}/{teamMembers.length}</span>
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
