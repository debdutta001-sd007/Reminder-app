import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { TaskPriority, TaskStatus, TaskDifficulty } from '../types.ts';
import { X, Plus, Calendar, Tag, Mic, Sparkles, AlertCircle } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStatus?: TaskStatus;
  onOpenVoiceModal?: () => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  initialStatus = 'todo',
  onOpenVoiceModal
}) => {
  const { createTask } = useWorkspace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('medium');
  const [urgency, setUrgency] = useState(false);
  const [importance, setImportance] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Android', 'Focus']);

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(',', '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTask({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      difficulty,
      urgency,
      importance,
      dueDate: dueDate || null,
      tags
    });

    // Reset & close
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-[#0E0E12] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#1F1F28] z-10 animate-in fade-in zoom-in-95 duration-150 text-white">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1F1F28]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F97316] animate-pulse" />
            <h3 className="font-display text-base font-bold text-white tracking-tight">
              Create Android Task
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {onOpenVoiceModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVoiceModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-red-400 rounded-lg text-xs font-semibold transition-colors"
                title="Use Gemini AI Voice Recognition"
              >
                <Mic className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>Voice Capture</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-[#1F1F28] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Optimize OLED lockscreen battery life"
              className="w-full text-sm px-3.5 py-2.5 bg-[#16161E] border border-[#272733] rounded-xl focus:outline-none focus:border-orange-500 text-white font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline steps, context, or key requirements..."
              className="w-full text-xs p-3 bg-[#16161E] border border-[#272733] rounded-xl focus:outline-none focus:border-orange-500 text-slate-200"
            />
          </div>

          {/* Status & Difficulty Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full py-2 px-2.5 bg-[#16161E] border border-[#272733] rounded-lg text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center justify-between">
                <span>AI Difficulty</span>
                <span className="text-[10px] text-orange-400 font-mono">Dot Color</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => {
                  const d = e.target.value as TaskDifficulty;
                  setDifficulty(d);
                  if (d === 'hard') setPriority('urgent');
                  else if (d === 'medium') setPriority('high');
                  else setPriority('medium');
                }}
                className="w-full py-2 px-2.5 bg-[#16161E] border border-[#272733] rounded-lg text-slate-200 focus:outline-none focus:border-orange-500 font-medium"
              >
                <option value="hard">🔴 Hard (Urgent Focus)</option>
                <option value="medium">🟠 Medium (Standard)</option>
                <option value="easy">🔵 Easy (Quick Win)</option>
              </select>
            </div>
          </div>

          {/* Priority & Matrix Flags */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  const p = e.target.value as TaskPriority;
                  setPriority(p);
                  if (p === 'urgent') setUrgency(true);
                }}
                className="w-full py-2 px-2.5 bg-[#16161E] border border-[#272733] rounded-lg text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full py-2 px-2.5 bg-[#16161E] border border-[#272733] rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Eisenhower Flags */}
          <div className="p-2.5 bg-[#16161E] rounded-xl border border-[#272733] flex items-center justify-around text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={urgency}
                onChange={(e) => setUrgency(e.target.checked)}
                className="rounded accent-red-500"
              />
              <span>Urgent (Time Critical)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={importance}
                onChange={(e) => setImportance(e.target.checked)}
                className="rounded accent-orange-500"
              />
              <span>Important (High Value)</span>
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>Tags</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#272733] text-slate-200 rounded font-medium"
                >
                  {t}
                  <button type="button" onClick={() => handleRemoveTag(t)} className="text-slate-400 hover:text-white">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type tag and press Enter..."
              className="w-full text-xs px-3 py-1.5 bg-[#16161E] border border-[#272733] rounded-lg focus:outline-none focus:border-orange-500 text-slate-200"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1F1F28]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Android Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
