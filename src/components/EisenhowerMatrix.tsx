import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { Task } from '../types.ts';
import { Plus, CheckCircle2 } from 'lucide-react';

interface EisenhowerMatrixProps {
  onOpenDrawer: (taskId: string) => void;
  onOpenNewTask: () => void;
}

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({
  onOpenDrawer,
  onOpenNewTask
}) => {
  const { tasks, moveTask } = useWorkspace();
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Divide tasks into 4 quadrants
  const q1Tasks = tasks.filter(t => t.urgency && t.importance && t.status !== 'done');
  const q2Tasks = tasks.filter(t => !t.urgency && t.importance && t.status !== 'done');
  const q3Tasks = tasks.filter(t => t.urgency && !t.importance && t.status !== 'done');
  const q4Tasks = tasks.filter(t => !t.urgency && !t.importance && t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  const renderQuadrant = (
    title: string,
    subtitle: string,
    colorAccent: string,
    dotEmoji: string,
    quadTasks: Task[],
    urgencyVal: boolean,
    importanceVal: boolean,
    quadrantCode: string
  ) => {
    return (
      <div className="p-4 rounded-2xl border border-[#1F1F28] bg-[#0E0E12] flex flex-col justify-between transition-all">
        {/* Quadrant Header */}
        <div className="flex items-start justify-between pb-3 mb-3 border-b border-[#1A1A24]">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${colorAccent} shadow-xs`} />
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                {title}
              </h3>
              <span className="text-[10px] font-mono font-semibold text-slate-400">
                {quadrantCode}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {subtitle}
            </p>
          </div>

          <span className="text-xs font-mono font-semibold text-slate-300 tabular-nums px-2 py-0.5 bg-[#14141B] rounded border border-[#232330]">
            {quadTasks.length} {quadTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {/* Task list in quadrant */}
        <div className="space-y-2 flex-1 min-h-[140px] max-h-[280px] overflow-y-auto pr-1">
          {quadTasks.map((t) => {
            const isHovered = hoveredTaskId === t.id;
            return (
              <div
                key={t.id}
                onMouseEnter={() => setHoveredTaskId(t.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                onClick={() => onOpenDrawer(t.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isHovered
                    ? 'border-indigo-500 bg-[#161622] shadow-xs'
                    : 'border-[#1A1A22] bg-[#08080C] hover:bg-[#121218] hover:border-[#272734]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${colorAccent}`} />
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {t.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span className="capitalize">{t.status.replace('_', ' ')}</span>
                    {t.dueDate && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="font-mono tabular-nums">{t.dueDate}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveTask(t.id, 'done');
                  }}
                  title="Mark as done"
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {quadTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-28 border border-dashed border-[#1F1F28] rounded-xl text-slate-500">
              <p className="text-xs">No active tasks</p>
            </div>
          )}
        </div>

        {/* Quadrant Footer */}
        <div className="pt-3 mt-3 border-t border-[#1A1A24] flex items-center justify-between text-xs">
          <button
            onClick={onOpenNewTask}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add task</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Title & Red-Orange-Blue Dot Legend */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#1A1A22]">
        <div>
          <h2 className="text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
            <span>OneDot Priority Matrix</span>
            <span className="text-xs font-mono font-semibold text-indigo-300 py-0.5 px-2 bg-indigo-950/60 border border-indigo-800/60 rounded">
              Android Edition
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Prioritize ruthlessly using the Red, Orange, and Blue tri-color dot hierarchy.
          </p>
        </div>

        {/* User specified: Red, Orange, Blue dots legend */}
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs shadow-red-500/40" />
            <span>Red: {q1Tasks.length} Urgent</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs shadow-orange-500/40" />
            <span>Orange: {q2Tasks.length} Schedule</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs shadow-blue-500/40" />
            <span>Blue: {q3Tasks.length} Delegate</span>
          </span>
        </div>
      </div>

      {/* 2x2 Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Q1: Red Dot (Urgent & Important) */}
        {renderQuadrant(
          'Do First (Red)',
          'Urgent & Important · Immediate execution required',
          'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse',
          '🔴',
          q1Tasks,
          true,
          true,
          'Q1'
        )}

        {/* Q2: Orange Dot (Not Urgent & Important) */}
        {renderQuadrant(
          'Schedule (Orange)',
          'Not Urgent & Important · High leverage & deep work',
          'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse',
          '🟠',
          q2Tasks,
          false,
          true,
          'Q2'
        )}

        {/* Q3: Blue Dot (Urgent & Not Important) */}
        {renderQuadrant(
          'Delegate (Blue)',
          'Urgent & Not Important · Interruptions & short tasks',
          'bg-blue-500 shadow-xs shadow-blue-500/40',
          '🔵',
          q3Tasks,
          true,
          false,
          'Q3'
        )}

        {/* Q4: Slate Dot (Neither) */}
        {renderQuadrant(
          'Eliminate (Slate)',
          'Neither Urgent Nor Important · Consider dropping',
          'bg-slate-500',
          '⚪',
          q4Tasks,
          false,
          false,
          'Q4'
        )}
      </div>

      {/* Completed Section with Green Light Indicators */}
      {completedTasks.length > 0 && (
        <div className="p-4 bg-[#0A0A0D] border border-emerald-950/50 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">
                {completedTasks.length} Completed Tasks (Green Light)
              </span>
              <span className="text-xs text-slate-500">
                · Finished and archived from active matrix
              </span>
            </div>

            <button
              onClick={() => onOpenDrawer(completedTasks[0].id)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
            >
              Open latest completed
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 border-t border-[#161622]">
            {completedTasks.slice(0, 3).map((ct) => (
              <div
                key={ct.id}
                onClick={() => onOpenDrawer(ct.id)}
                className="flex items-center gap-2 p-2 bg-[#0E0E12] border border-[#161622] rounded-xl hover:border-emerald-900/50 cursor-pointer text-xs transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] flex items-center justify-center text-[7px] text-black font-bold shrink-0">
                  ✓
                </span>
                <span className="truncate text-slate-500 line-through flex-1">{ct.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
