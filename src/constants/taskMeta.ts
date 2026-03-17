export const ACTIVITY_LABELS: Record<string, string> = {
  created: 'created this task',
  status_changed: 'changed status',
  priority_changed: 'changed priority',
  assignee_added: 'added assignee',
  assignee_removed: 'removed assignee',
  due_date_changed: 'changed due date',
  title_changed: 'changed title',
  description_changed: 'updated description',
  comment_added: 'added a comment',
  attachment_added: 'added an attachment',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#D58D49',
  medium: '#A78BFA',
  high: '#D8727D',
  completed: '#22C55E',
};

export const PRIORITY_BG: Record<string, string> = {
  low: 'bg-orange-100 text-orange-700',
  medium: 'bg-violet-100 text-violet-700',
  high: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
};

export const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  'todo': { label: 'To Do', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  'in-progress': { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  'ready-for-qa': { label: 'Ready for QA', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'deployment-pending': { label: 'Deployment Pending', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'blocker': { label: 'Blocker', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  'on-hold': { label: 'On Hold', bg: 'bg-gray-200', text: 'text-gray-500', dot: 'bg-gray-400' },
  'done': { label: 'Done', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
};
