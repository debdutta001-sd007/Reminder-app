import React from 'react';
import { Task, TaskPriority, TaskStatus } from '../types.ts';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { CheckSquare, Calendar, ChevronRight, Check } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onOpenDrawer: (taskId: string) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

// User specified: Dot colours will be Red, Orange, and Blue
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; dotColor: string; textColor: string; glowColor: string; isBreathing?: boolean }> = {
  urgent: { label: 'Urgent', dotColor: 'bg-red-500', textColor: 'text-red-400', glowColor: 'shadow-[0_0_10px_rgba(239,68,68,0.85)] animate-pulse', isBreathing: true },
  high: { label: 'High', dotColor: 'bg-orange-500', textColor: 'text-orange-400', glowColor: 'shadow-[0_0_10px_rgba(249,115,22,0.85)] animate-pulse', isBreathing: true },
  medium: { label: 'Normal', dotColor: 'bg-blue-500', textColor: 'text-blue-400', glowColor: 'shadow-blue-500/40' },
  low: { label: 'Low', dotColor: 'bg-slate-500', textColor: 'text-slate-400', glowColor: 'shadow-slate-500/30' }
};

const STATUS_OPTIONS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' }
];

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onOpenDrawer,
  onDragStart
}) => {
  const { peers, moveTask } = useWorkspace();

  const isDone = task.status === 'done';
  const activePeer = peers.find(p => p.activeTaskId === task.id);
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;

  const formatDueDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      onClick={() => onOpenDrawer(task.id)}
      style={{
        boxShadow: activePeer ? `0 0 0 2px ${activePeer.color}` : undefined
      }}
      className={`group relative p-3.5 bg-[#0E0E12] border border-[#1F1F28] rounded-xl hover:border-[#383848] transition-all cursor-pointer select-none ${
        isDone ? 'opacity-70 bg-[#09090D] border-emerald-950/40' : ''
      }`}
    >
      {/* Active Peer Editing Indicator */}
      {activePeer && (
        <div
          className="absolute -top-2.5 right-3 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white shadow-xs flex items-center gap-1 z-10"
          style={{ backgroundColor: activePeer.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>{activePeer.name}</span>
        </div>
      )}

      {/* Header: Title + Glowing Green Dot (Done) OR Red/Orange/Blue Priority Dot (Active) */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className={`text-sm font-semibold transition-colors leading-snug line-clamp-2 ${
          isDone ? 'line-through text-slate-500' : 'text-slate-100 group-hover:text-white'
        }`}>
          {task.title}
        </h4>

        {/* Status Dot: User specified Glowing Green Light when done, else Red/Orange/Blue with subtle breathing glow */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5" title={isDone ? 'Status: Completed (Green Light)' : `Priority: ${priorityInfo.label}`}>
          {isDone ? (
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.95)] ring-2 ring-emerald-500/40 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
            </span>
          ) : (
            <span className={`w-2.5 h-2.5 rounded-full ${priorityInfo.dotColor} ${priorityInfo.glowColor}`} />
          )}
        </div>
      </div>

      {/* Description Snippet */}
      {task.description && (
        <p className={`text-xs line-clamp-2 mb-3 leading-relaxed ${isDone ? 'text-slate-600' : 'text-slate-400'}`}>
          {task.description}
        </p>
      )}

      {/* Unboxed Metadata Line with Indicator */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400 mb-3 font-normal">
        {isDone ? (
          <span className="font-semibold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />
            <span>Completed</span>
          </span>
        ) : (
          <span className={`font-semibold ${priorityInfo.textColor}`}>
            {priorityInfo.label}
          </span>
        )}

        {task.difficulty && (
          <>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="capitalize text-slate-300 font-mono text-[11px]">{task.difficulty}</span>
          </>
        )}

        {task.tags.map((tag) => (
          <React.Fragment key={tag}>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300">{tag}</span>
          </React.Fragment>
        ))}

        {task.dueDate && (
          <>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className={`inline-flex items-center gap-1 font-mono tabular-nums ${
              isOverdue ? 'text-red-400 font-semibold' : 'text-slate-400'
            }`}>
              <Calendar className="w-3 h-3" />
              <span>{formatDueDate(task.dueDate)}</span>
            </span>
          </>
        )}
      </div>

      {/* Subtasks Progress */}
      {totalSubtasks > 0 && (
        <div className="mb-3 pt-2 border-t border-[#1F1F28]">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono tabular-nums">
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-slate-500" />
              <span>Checklist</span>
            </span>
            <span>{completedSubtasks}/{totalSubtasks}</span>
          </div>

          <div className="w-full h-1 bg-[#1A1A22] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completedSubtasks === totalSubtasks ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.round((completedSubtasks / totalSubtasks) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Card Footer: Assignee & Fast Status Mover */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1F1F28] text-xs">
        {task.assignee ? (
          <div className="flex items-center gap-1.5" title={`Assigned to ${task.assignee.name}`}>
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
              style={{ backgroundColor: task.assignee.avatarColor }}
            >
              {task.assignee.name.charAt(0)}
            </span>
            <span className="text-xs text-slate-300 truncate max-w-[90px]">
              {task.assignee.name}
            </span>
          </div>
        ) : (
          <span className="text-slate-500 text-[11px]">Unassigned</span>
        )}

        <select
          value={task.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            moveTask(task.id, e.target.value as TaskStatus);
          }}
          className="text-[11px] py-0.5 px-2 bg-[#16161E] hover:bg-[#1E1E28] text-slate-300 border border-[#272734] rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-[#121218] text-slate-200">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
