import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { Task, TaskPriority, TaskStatus, AIDifficultyAssessment } from '../types.ts';
import { 
  X, 
  Trash2, 
  Calendar, 
  Tag, 
  CheckSquare, 
  MessageSquare, 
  Send, 
  Sparkles,
  Clock,
  Plus
} from 'lucide-react';

interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ taskId, onClose }) => {
  const { 
    tasks, 
    updateTask, 
    deleteTask, 
    toggleSubtask, 
    addComment, 
    setSelectedTaskId,
    peers 
  } = useWorkspace();

  const task = tasks.find(t => t.id === taskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [urgency, setUrgency] = useState<boolean>(false);
  const [importance, setImportance] = useState<boolean>(true);
  const [dueDate, setDueDate] = useState<string>('');
  const [newTag, setNewTag] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  
  // Gemini AI difficulty state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAssessment, setAiAssessment] = useState<AIDifficultyAssessment | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setUrgency(task.urgency);
      setImportance(task.importance);
      setDueDate(task.dueDate || '');
      setSelectedTaskId(task.id);
      setAiAssessment(null);
    } else {
      setSelectedTaskId(null);
    }

    return () => {
      setSelectedTaskId(null);
    };
  }, [task, setSelectedTaskId]);

  if (!task) return null;

  const peersViewingThis = peers.filter(p => p.activeTaskId === task.id);

  const handleSaveField = (key: keyof Task, val: unknown) => {
    updateTask({
      ...task,
      [key]: val,
      updatedAt: new Date().toISOString()
    });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTag.trim();
    if (clean && !task.tags.includes(clean)) {
      const updatedTags = [...task.tags, clean];
      handleSaveField('tags', updatedTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleSaveField('tags', task.tags.filter(t => t !== tagToRemove));
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskText.trim()) {
      const newSub = {
        id: `sub-${Date.now()}`,
        text: newSubtaskText.trim(),
        completed: false
      };
      handleSaveField('subtasks', [...task.subtasks, newSub]);
      setNewSubtaskText('');
    }
  };

  const handleRemoveSubtask = (subId: string) => {
    handleSaveField('subtasks', task.subtasks.filter(s => s.id !== subId));
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCommentText.trim()) {
      addComment(task.id, newCommentText);
      setNewCommentText('');
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteTask(task.id);
      onClose();
    }
  };

  // Gemini AI Difficulty Analysis
  const handleAnalyzeWithGemini = async () => {
    setIsAnalyzingAi(true);
    try {
      const res = await fetch('/api/ai/analyze-difficulty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });

      const data = await res.json();
      if (data.success && data.assessment) {
        setAiAssessment(data.assessment);
        handleSaveField('difficulty', data.assessment.difficulty);
        handleSaveField('estimatedMinutes', data.assessment.estimatedMinutes);

        // Map recommended dot color
        if (data.assessment.recommendedDotColor === 'red') {
          handleSaveField('priority', 'urgent');
          setPriority('urgent');
        } else if (data.assessment.recommendedDotColor === 'orange') {
          handleSaveField('priority', 'high');
          setPriority('high');
        } else {
          handleSaveField('priority', 'medium');
          setPriority('medium');
        }
      }
    } catch (err) {
      console.error('Error analyzing difficulty:', err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleApplyAiSubtasks = () => {
    if (!aiAssessment || !aiAssessment.suggestedSubtasks) return;
    const newItems = aiAssessment.suggestedSubtasks.map((text, i) => ({
      id: `sub-ai-${Date.now()}-${i}`,
      text,
      completed: false
    }));
    handleSaveField('subtasks', [...task.subtasks, ...newItems]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel - Pure OLED Dark */}
      <div className="relative w-full max-w-xl bg-[#0B0B0F] border-l border-[#1F1F28] shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
        {/* Drawer Top Header */}
        <div className="sticky top-0 bg-[#0B0B0F]/95 backdrop-blur-md px-6 py-4 border-b border-[#1A1A24] flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Task Details</span>
            {peersViewingThis.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-950/70 border border-indigo-800/80 rounded-full text-[11px] text-indigo-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span>{peersViewingThis.map(p => p.name).join(', ')} co-viewing</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              title="Delete task"
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#161622] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 text-slate-100">
          {/* Editable Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleSaveField('title', e.target.value);
              }}
              className="w-full text-xl font-bold font-display text-white bg-transparent border-none px-0 py-1 focus:outline-none focus:ring-0 placeholder:text-slate-600"
              placeholder="Task title..."
            />
          </div>

          {/* Gemini AI Task Difficulty Section */}
          <div className="p-4 bg-[#12121A] rounded-2xl border border-indigo-950/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  AI Task Difficulty Understander
                </h4>
              </div>

              <button
                type="button"
                onClick={handleAnalyzeWithGemini}
                disabled={isAnalyzingAi}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAnalyzingAi ? 'Analyzing...' : 'Assess with Gemini'}</span>
              </button>
            </div>

            {/* Assessment display */}
            {aiAssessment ? (
              <div className="space-y-2 pt-2 border-t border-[#1F1F28] text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded font-bold uppercase text-[11px] ${
                    aiAssessment.difficulty === 'hard'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : aiAssessment.difficulty === 'medium'
                      ? 'bg-orange-950 text-orange-300 border border-orange-800'
                      : 'bg-blue-950 text-blue-300 border border-blue-800'
                  }`}>
                    {aiAssessment.difficulty}
                  </span>
                  <span className="text-slate-400 font-mono">
                    Estimated {aiAssessment.estimatedMinutes} mins
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${
                      aiAssessment.recommendedDotColor === 'red' ? 'bg-red-500' : (
                        aiAssessment.recommendedDotColor === 'orange' ? 'bg-orange-500' : 'bg-blue-500'
                      )
                    }`} />
                    <span>{aiAssessment.recommendedDotColor} dot assigned</span>
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed italic text-[11px]">
                  &ldquo;{aiAssessment.reasoning}&rdquo;
                </p>

                {aiAssessment.suggestedSubtasks?.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApplyAiSubtasks}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add {aiAssessment.suggestedSubtasks.length} AI suggested subtasks to checklist</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Tap assess to automatically evaluate whether this task is Easy, Medium, or Hard and generate subtasks.
              </p>
            )}
          </div>

          {/* Quick Property Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-[#0E0E12] rounded-2xl border border-[#1F1F28] text-xs">
            {/* Status */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  const s = e.target.value as TaskStatus;
                  setStatus(s);
                  handleSaveField('status', s);
                }}
                className="w-full py-1.5 px-2.5 bg-[#161620] border border-[#232330] rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
              >
                <option value="backlog" className="bg-[#0E0E12]">Backlog</option>
                <option value="todo" className="bg-[#0E0E12]">To Do</option>
                <option value="in_progress" className="bg-[#0E0E12]">In Progress</option>
                <option value="review" className="bg-[#0E0E12]">Review</option>
                <option value="done" className="bg-[#0E0E12]">🟢 Done (Green Light Indicator)</option>
              </select>
            </div>

            {/* Dot Priority (Red · Orange · Blue) */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Dot Priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  const p = e.target.value as TaskPriority;
                  setPriority(p);
                  handleSaveField('priority', p);
                }}
                className="w-full py-1.5 px-2.5 bg-[#161620] border border-[#232330] rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
              >
                <option value="urgent" className="bg-[#0E0E12]">🔴 Red (Urgent / Hard)</option>
                <option value="high" className="bg-[#0E0E12]">🟠 Orange (High / Medium)</option>
                <option value="medium" className="bg-[#0E0E12]">🔵 Blue (Normal / Easy)</option>
                <option value="low" className="bg-[#0E0E12]">⚪ Slate (Low)</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleSaveField('dueDate', e.target.value || null);
                }}
                className="w-full py-1.5 px-2.5 bg-[#161620] border border-[#232330] rounded-xl text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs cursor-pointer"
              />
            </div>

            {/* Eisenhower Flags */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Matrix Placement</label>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={urgency}
                    onChange={(e) => {
                      setUrgency(e.target.checked);
                      handleSaveField('urgency', e.target.checked);
                    }}
                    className="rounded text-red-500 bg-[#161620] border-[#2A2A38] focus:ring-0"
                  />
                  <span>Urgent (Red)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={importance}
                    onChange={(e) => {
                      setImportance(e.target.checked);
                      handleSaveField('importance', e.target.checked);
                    }}
                    className="rounded text-orange-500 bg-[#161620] border-[#2A2A38] focus:ring-0"
                  />
                  <span>Important</span>
                </label>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Description & Specifications
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                handleSaveField('description', e.target.value);
              }}
              placeholder="Add specs, implementation details, or notes..."
              className="w-full text-xs p-3 bg-[#0E0E12] border border-[#1F1F28] rounded-2xl focus:bg-[#121218] focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed text-slate-200"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>Tags</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {task.tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[#161620] text-slate-300 rounded-lg font-medium border border-[#232330]"
                >
                  {t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="text-slate-500 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddTag} className="flex items-center gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag and press Enter..."
                className="text-xs px-3 py-1.5 bg-[#0E0E12] border border-[#1F1F28] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 text-white"
              />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 bg-[#161620] hover:bg-[#20202C] text-slate-200 rounded-xl transition-colors font-medium border border-[#232330]"
              >
                Add
              </button>
            </form>
          </div>

          {/* Subtask Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Checklist ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})</span>
              </label>
            </div>

            <div className="space-y-2 mb-3">
              {task.subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0E0E12] border border-[#1A1A22] hover:bg-[#13131A] transition-colors"
                >
                  <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => toggleSubtask(task.id, sub.id)}
                      className="rounded text-indigo-500 bg-[#161620] border-[#2A2A38] focus:ring-0"
                    />
                    <span className={`truncate ${sub.completed ? 'line-through text-slate-500' : ''}`}>
                      {sub.text}
                    </span>
                  </label>

                  <button
                    onClick={() => handleRemoveSubtask(sub.id)}
                    className="text-slate-500 hover:text-red-400 p-0.5 rounded"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                placeholder="Add checklist item..."
                className="flex-1 text-xs px-3 py-2 bg-[#0E0E12] border border-[#1F1F28] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
              />
              <button
                type="submit"
                className="text-xs px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold"
              >
                Add
              </button>
            </form>
          </div>

          {/* Real-Time Comments */}
          <div className="pt-4 border-t border-[#1F1F28]">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Collaborator Activity ({task.comments.length})</span>
            </label>

            <div className="space-y-3 mb-4">
              {task.comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-[#0E0E12] rounded-xl border border-[#1A1A22] text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                        style={{ backgroundColor: comment.avatarColor }}
                      >
                        {comment.author.charAt(0)}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {comment.author}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed pl-5">
                    {comment.text}
                  </p>
                </div>
              ))}

              {task.comments.length === 0 && (
                <p className="text-xs text-slate-500 italic">No comments yet. Post a note for peers.</p>
              )}
            </div>

            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write message to collaborators..."
                className="flex-1 text-xs px-3 py-2 bg-[#0E0E12] border border-[#1F1F28] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
              />
              <button
                type="submit"
                className="text-xs px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-1 font-semibold"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
