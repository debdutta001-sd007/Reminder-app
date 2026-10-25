import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { TaskStatus, TaskPriority } from '../types.ts';
import { TaskCard } from './TaskCard.tsx';
import { Plus, Search, Filter } from 'lucide-react';

interface KanbanBoardProps {
  onOpenDrawer: (taskId: string) => void;
  onOpenNewTaskWithStatus?: (status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; title: string; colorDot: string }[] = [
  { id: 'backlog', title: 'Backlog', colorDot: 'bg-slate-500' },
  { id: 'todo', title: 'To Do', colorDot: 'bg-blue-500' },          // Blue dot
  { id: 'in_progress', title: 'In Progress', colorDot: 'bg-orange-500' }, // Orange dot
  { id: 'review', title: 'Review', colorDot: 'bg-indigo-500' },
  { id: 'done', title: 'Done', colorDot: 'bg-emerald-500' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  onOpenDrawer,
  onOpenNewTaskWithStatus
}) => {
  const { tasks, moveTask } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      moveTask(taskId, colId);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search & Filter Toolbar - OLED styling */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#1A1A22]">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, tags, or specs..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-[#0E0E12] border border-[#1F1F28] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Priority Filter with Red, Orange, Blue indicators */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Priority:</span>
          </span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs py-1.5 px-3 bg-[#0E0E12] border border-[#1F1F28] rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Dots</option>
            <option value="urgent">🔴 Red (Urgent)</option>
            <option value="high">🟠 Orange (High)</option>
            <option value="medium">🔵 Blue (Normal)</option>
            <option value="low">⚪ Slate (Low)</option>
          </select>
        </div>
      </div>

      {/* Kanban Column Viewport */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start min-h-[calc(100vh-210px)] pb-16">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col p-3 rounded-2xl bg-[#09090D] border transition-all min-h-[460px] ${
                isOver
                  ? 'border-indigo-500 bg-[#12121A] ring-2 ring-indigo-500/30'
                  : 'border-[#1A1A22]'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1A1A22]">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.colorDot} shadow-xs`} />
                  <h3 className="text-xs font-bold text-slate-200 tracking-tight">
                    {col.title}
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 font-semibold px-1.5 py-0.2 bg-[#121218] rounded border border-[#1F1F28]">
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => onOpenNewTaskWithStatus && onOpenNewTaskWithStatus(col.id)}
                  title={`Add task to ${col.title}`}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1A1A22] rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="flex flex-col space-y-2.5 flex-1">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onOpenDrawer={onOpenDrawer}
                    onDragStart={handleDragStart}
                  />
                ))}

                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-[#1F1F28] rounded-xl text-slate-500 my-auto">
                    <p className="text-xs font-medium">No tasks</p>
                    <button
                      onClick={() => onOpenNewTaskWithStatus && onOpenNewTaskWithStatus(col.id)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 mt-1 font-medium"
                    >
                      + Create task
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
