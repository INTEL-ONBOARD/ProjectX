import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  dotColor: string;
  lineColor: string;
  index: number;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title, status, tasks, dotColor, lineColor, index,
  onTaskClick, onAddTask, onMoveTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) onMoveTask(taskId, status);
    setIsDragOver(false);
  };

  return (
    <motion.div
      className="flex-1 min-w-[310px] max-w-[380px] flex flex-col h-full"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.12, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: dotColor }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          />
          <span className="font-semibold text-gray-900 text-base">{title}</span>
          <span className="w-5 h-5 rounded-full bg-surface-200 text-[11px] text-gray-500 font-semibold flex items-center justify-center">
            {tasks.length}
          </span>
        </div>
        <motion.button
          onClick={() => onAddTask(status)}
          className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center text-primary-500 hover:bg-primary-100 transition-colors"
          whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <Plus size={14} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Color line */}
      <motion.div
        className="h-[3px] rounded-full mb-5"
        style={{ backgroundColor: lineColor, transformOrigin: 'left' }}
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: index * 0.12 + 0.2, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* Drop zone */}
      <div
        className={`flex-1 overflow-y-auto space-y-4 pr-1 rounded-xl transition-all ${isDragOver ? 'bg-primary-50/50 ring-2 ring-dashed ring-primary-300' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            index={i}
            onClick={() => onTaskClick(task)}
            onMoveTask={onMoveTask}
          />
        ))}
        {tasks.length === 0 && isDragOver && (
          <div className="h-20 rounded-xl border-2 border-dashed border-primary-300 flex items-center justify-center">
            <span className="text-xs text-primary-400 font-medium">Drop here</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default KanbanColumn;
