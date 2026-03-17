import React, { useState, useEffect } from 'react';
import { Timer, Square, Clock } from 'lucide-react';
import { TimeEntry } from '../../types';

interface TimeTrackerProps {
  taskId: string;
  userId: string;
  timeEntries: TimeEntry[];
  estimatedMinutes?: number;
  onUpdate: (entries: TimeEntry[], estimatedMinutes?: number) => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function TimeTracker({ taskId, userId, timeEntries, estimatedMinutes, onUpdate }: TimeTrackerProps) {
  const [tick, setTick] = useState(0);
  const activeEntry = timeEntries.find(e => e.userId === userId && !e.endedAt);

  useEffect(() => {
    if (!activeEntry) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeEntry?.id]);

  const totalLogged = timeEntries
    .filter(e => e.endedAt)
    .reduce((sum, e) => sum + (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()), 0);

  const activeMs = activeEntry
    ? Date.now() - new Date(activeEntry.startedAt).getTime()
    : 0;

  function handleStart() {
    const entry: TimeEntry = {
      id: `te-${Date.now()}`,
      userId,
      startedAt: new Date().toISOString(),
    };
    onUpdate([...timeEntries, entry]);
  }

  function handleStop() {
    if (!activeEntry) return;
    const updated = timeEntries.map(e =>
      e.id === activeEntry.id ? { ...e, endedAt: new Date().toISOString() } : e
    );
    onUpdate(updated);
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Time Tracking
        </span>
        <div className="flex items-center gap-2">
          {activeEntry ? (
            <>
              <span className="text-xs font-mono text-primary-500">{formatDuration(activeMs)}</span>
              <button
                onClick={handleStop}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
              >
                <Square size={10} /> Stop
              </button>
            </>
          ) : (
            <button
              onClick={handleStart}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200"
            >
              <Timer size={10} /> Start Timer
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <Clock size={12} />
        <span>Logged: <strong>{formatDuration(totalLogged + activeMs)}</strong></span>
        {estimatedMinutes ? (
          <span className="ml-1">/ {estimatedMinutes}m estimated</span>
        ) : null}
      </div>
    </div>
  );
}
