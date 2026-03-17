import React from 'react';
import { motion } from 'framer-motion';
import { Task, TaskStatus } from '../../types';
import TaskCard from './TaskCard';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function SortableTaskCard({ task, ...props }: { task: Task } & Omit<React.ComponentProps<typeof TaskCard>, 'task'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} {...props} />
    </div>
  );
}

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  dotColor: string;
  lineColor: string;
  index: number;
  onTaskClick: (task: Task) => void;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask?: (taskId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title, status, tasks, dotColor, lineColor, index,
  onTaskClick, onMoveTask, onDeleteTask,
}) => {
  // Register this column as a droppable target so empty columns accept drops
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });

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
      </div>

      {/* Color line */}
      <motion.div
        className="h-[3px] rounded-full mb-5"
        style={{ backgroundColor: lineColor, transformOrigin: 'left' }}
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: index * 0.12 + 0.2, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* Drop zone — registered with dnd-kit */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-4 pr-1 rounded-xl transition-all ${isOver ? 'bg-primary-50/50 ring-2 ring-dashed ring-primary-300' : ''}`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task, i) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              index={i}
              onClick={() => onTaskClick(task)}
              onMoveTask={onMoveTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && isOver && (
          <div className="h-20 rounded-xl border-2 border-dashed border-primary-300 flex items-center justify-center">
            <span className="text-xs text-primary-400 font-medium">Drop here</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default KanbanColumn;
