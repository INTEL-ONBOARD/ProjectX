import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subMonths, eachMonthOfInterval } from 'date-fns';

interface AttendanceRecord {
  userId: string;
  date: string;
  status: string;
}

interface AttendanceChartProps {
  records: AttendanceRecord[];
  memberCount: number;
}

export function AttendanceChart({ records, memberCount }: AttendanceChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    return months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      const workingDays = 22; // approximate
      const denominator = memberCount * workingDays;
      const present = records.filter(r => {
        const d = r.date?.slice(0, 7);
        return d === monthStr && ['present', 'wfh', 'half-day'].includes(r.status);
      }).length;
      return {
        month: format(month, 'MMM'),
        rate: denominator > 0 ? Math.min(100, Math.round((present / denominator) * 100)) : 0,
      };
    });
  }, [records, memberCount]);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
        <Tooltip formatter={(v: any) => [`${v}%`, 'Attendance Rate']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.rate >= 80 ? '#22C55E' : entry.rate >= 60 ? '#F59E0B' : '#EF4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
