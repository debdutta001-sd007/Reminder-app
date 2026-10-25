import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { Task, TaskPriority, TaskStatus } from '../types.ts';
import { 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Plus,
  Trash2,
  ArrowUpDown
} from 'lucide-react';

interface ListViewProps {
  onOpenDrawer: (taskId: string) => void;
  onOpenNewTask: () => void;
}

// User specified: Red, Orange, Blue dot hierarchy with subtle breathing glow
const PRIORITY_BADGES: Record<TaskPriority, { label: string; textClass: string; dot: string }> = {
  urgent: { label: 'Urgent', textClass: 'text-red-400', dot: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)] animate-pulse' },
  high: { label: 'High', textClass: 'text-orange-400', dot: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.85)] animate-pulse' },
  medium: { label: 'Normal', textClass: 'text-blue-400', dot: 'bg-blue-500 shadow-xs shadow-blue-500/40' },
  low: { label: 'Low', textClass: 'text-slate-400', dot: 'bg-slate-500' }
};

export const ListView: React.FC<ListViewProps> = ({
  onOpenDrawer,
  onOpenNewTask
}) => {
  const { tasks, moveTask, toggleSubtask, deleteTask } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status'>('priority');

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const priorityWeights: Record<TaskPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
    }
    if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    }
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-4 pb-16">
      {/* Controls Bar - OLED Dark */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#1A1A22]">
        <div className="flex items-center gap-2.5 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-[#0E0E12] border border-[#1F1F28] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'status')}
              className="text-xs py-1.5 px-2.5 bg-[#0E0E12] border border-[#1F1F28] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="priority">Dot Priority (Red first)</option>
              <option value="date">Due Date</option>
              <option value="status">Status</option>
            </select>
          </div>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* High-Density Task List Table */}
      <div className="bg-[#0E0E12] border border-[#1F1F28] rounded-2xl overflow-hidden shadow-xs">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[#0A0A0E] border-b border-[#1A1A22] text-xs font-semibold text-slate-400">
          <div className="col-span-5 flex items-center gap-2">
            <span>Task Title & Checklist</span>
          </div>
          <div className="col-span-2 text-left">Status</div>
          <div className="col-span-2 text-left">Dot Priority</div>
          <div className="col-span-2 text-left">Due Date</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Task Rows */}
        <div className="divide-y divide-[#1A1A22]">
          {sortedTasks.map((task) => {
            const isDone = task.status === 'done';
            const isExpanded = expandedTaskIds.has(task.id);
            const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
            const completedCount = task.subtasks.filter(s => s.completed).length;

            return (
              <React.Fragment key={task.id}>
                <div
                  onClick={() => onOpenDrawer(task.id)}
                  className={`grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-[#13131A] transition-colors cursor-pointer text-xs ${
                    isDone ? 'opacity-50 text-slate-500' : 'text-slate-200'
                  }`}
                >
                  {/* Title & expander */}
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveTask(task.id, isDone ? 'todo' : 'done');
                      }}
                      className="text-slate-500 hover:text-emerald-400 transition-colors shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-950" />
                      ) : (
                        <Circle className="w-4 h-4 hover:stroke-indigo-400" />
                      )}
                    </button>

                    {task.subtasks.length > 0 && (
                      <button
                        onClick={(e) => toggleExpand(task.id, e)}
                        className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <div className="min-w-0 flex-1">
                      <span className={`font-semibold block truncate ${
                        isDone ? 'line-through text-slate-500' : 'text-slate-100'
                      }`}>
                        {task.title}
                      </span>
                      {task.tags.length > 0 && (
                        <span className="text-[11px] text-slate-400 block truncate">
                          {task.tags.join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        moveTask(task.id, e.target.value as TaskStatus);
                      }}
                      className="text-[11px] py-1 px-2.5 bg-[#161620] border border-[#232330] rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="backlog" className="bg-[#0E0E12]">Backlog</option>
                      <option value="todo" className="bg-[#0E0E12]">To Do</option>
                      <option value="in_progress" className="bg-[#0E0E12]">In Progress</option>
                      <option value="review" className="bg-[#0E0E12]">Review</option>
                      <option value="done" className="bg-[#0E0E12]">Done</option>
                    </select>
                  </div>

                  {/* Status Dot: Glowing Green Light if done, else Red/Orange/Blue */}
                  <div className="col-span-2 flex items-center gap-2">
                    {isDone ? (
                      <>
                        <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.95)] ring-2 ring-emerald-500/40 flex items-center justify-center text-[8px] text-black font-bold">
                          ✓
                        </span>
                        <span className="font-semibold text-emerald-400">
                          Completed
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={`w-2.5 h-2.5 rounded-full ${priority.dot}`} />
                        <span className={`font-semibold ${priority.textClass}`}>
                          {priority.label}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="col-span-2 text-slate-400 font-mono tabular-nums text-xs">
                    {task.dueDate || '—'}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 text-right flex items-center justify-end gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this task?')) {
                          deleteTask(task.id);
                        }
                      }}
                      title="Delete task"
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtasks Accordion Dropdown */}
                {isExpanded && task.subtasks.length > 0 && (
                  <div className="bg-[#08080B] px-12 py-3 border-t border-[#1A1A22] space-y-2">
                    <p className="text-[11px] font-mono text-slate-400 mb-1">
                      Checklist ({completedCount}/{task.subtasks.length} completed):
                    </p>
                    {task.subtasks.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubtask(task.id, sub.id);
                        }}
                        className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => {}}
                          className="rounded text-indigo-500 bg-[#161620] border-[#2A2A38] focus:ring-0 cursor-pointer"
                        />
                        <span className={sub.completed ? 'line-through text-slate-500' : ''}>
                          {sub.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {sortedTasks.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No tasks found. Click "+ New Task" to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
