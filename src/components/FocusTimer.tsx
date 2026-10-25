import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { sound } from '../utils/audio.ts';
import { Play, Pause, RotateCcw, Target, Sparkles, CheckCircle2 } from 'lucide-react';

export const FocusTimer: React.FC = () => {
  const { tasks, moveTask } = useWorkspace();
  
  // 25 mins work, 5 mins break, 15 mins long break
  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  const getDuration = (m: 'work' | 'shortBreak' | 'longBreak') => {
    switch (m) {
      case 'work': return 25 * 60;
      case 'shortBreak': return 5 * 60;
      case 'longBreak': return 15 * 60;
    }
  };

  const [timeLeft, setTimeLeft] = useState<number>(getDuration('work'));
  const totalDuration = getDuration(mode);

  useEffect(() => {
    let interval: number | null = null;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      sound.playFocusSessionComplete();
      if (mode === 'work') {
        setCompletedSessions(prev => prev + 1);
        setMode('shortBreak');
        setTimeLeft(getDuration('shortBreak'));
      } else {
        setMode('work');
        setTimeLeft(getDuration('work'));
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, mode, selectedTaskId]);

  const handleModeSwitch = (newMode: 'work' | 'shortBreak' | 'longBreak') => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(getDuration(mode));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dots representing each minute in a cycle
  const totalMinutes = Math.ceil(totalDuration / 60);
  const elapsedMinutes = Math.floor((totalDuration - timeLeft) / 60);

  const linkedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="bg-[#0E0E12] border border-[#1F1F28] rounded-2xl p-8 shadow-2xl text-center space-y-8">
        {/* Mode Selector Tabs */}
        <div className="inline-flex items-center p-1 bg-[#16161E] rounded-xl border border-[#272733]">
          <button
            onClick={() => handleModeSwitch('work')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'work' ? 'bg-[#272733] text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Focus (25m)
          </button>
          <button
            onClick={() => handleModeSwitch('shortBreak')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'shortBreak' ? 'bg-[#272733] text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Short Break (5m)
          </button>
          <button
            onClick={() => handleModeSwitch('longBreak')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'longBreak' ? 'bg-[#272733] text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Long Break (15m)
          </button>
        </div>

        {/* Large OneDot Digital Timer Display */}
        <div className="space-y-3">
          <div className="font-mono tabular-nums text-7xl sm:text-8xl font-black tracking-tight text-white drop-shadow-md">
            {formatTime(timeLeft)}
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#F97316] animate-ping' : 'bg-slate-600'}`} />
            <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
              {mode === 'work' ? 'Deep Focus Session' : 'Recharge & Rest'}
            </p>
          </div>
        </div>

        {/* OneDot Visual Dot Matrix: Red, Orange, Blue minute dots */}
        <div className="py-2">
          <div className="text-[11px] font-mono text-slate-400 mb-3 flex items-center justify-center gap-2">
            <span>Minute Progress ({elapsedMinutes}/{totalMinutes} min)</span>
            <span className="text-slate-600">·</span>
            <span className="text-orange-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
              <span>Elapsed</span>
            </span>
            <span className="text-blue-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
              <span>Current</span>
            </span>
          </div>

          <div className="flex items-center justify-center flex-wrap gap-2.5 max-w-sm mx-auto">
            {Array.from({ length: totalMinutes }).map((_, i) => {
              const isFilled = i < elapsedMinutes;
              const isCurrent = i === elapsedMinutes && isActive;

              return (
                <div
                  key={i}
                  title={`Minute ${i + 1}`}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    isFilled
                      ? 'bg-[#F97316] shadow-sm shadow-orange-500/50 scale-100'
                      : isCurrent
                      ? 'bg-[#3B82F6] ring-2 ring-blue-500/40 animate-pulse scale-110'
                      : 'border-2 border-[#272733] bg-transparent'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Timer Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm transition-all shadow-md ${
              isActive
                ? 'bg-orange-600 hover:bg-orange-500 text-white'
                : 'bg-white hover:bg-slate-200 text-black'
            }`}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isActive ? 'Pause' : 'Start Focus'}</span>
          </button>

          <button
            onClick={handleReset}
            title="Reset timer"
            className="p-3 text-slate-400 hover:text-white hover:bg-[#16161E] rounded-xl transition-colors border border-[#272733]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Linked Task Selector */}
        <div className="pt-6 border-t border-[#1F1F28] max-w-md mx-auto text-left">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-orange-400" />
            <span>Link Active Android Task:</span>
          </label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full text-xs py-2 px-3 bg-[#16161E] border border-[#272733] rounded-lg text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="">No task linked (general focus block)</option>
            {tasks.filter(t => t.status !== 'done').map((t) => {
              const diffLabel = t.difficulty ? ` [${t.difficulty.toUpperCase()}]` : '';
              return (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.priority}){diffLabel}
                </option>
              );
            })}
          </select>

          {linkedTask && (
            <div className="mt-3 p-3 bg-[#16161E] border border-[#272733] rounded-xl flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    linkedTask.difficulty === 'hard' || linkedTask.priority === 'urgent'
                      ? 'bg-[#EF4444]'
                      : linkedTask.difficulty === 'medium' || linkedTask.priority === 'high'
                      ? 'bg-[#F97316]'
                      : 'bg-[#3B82F6]'
                  }`} />
                  <p className="text-xs font-semibold text-white truncate">
                    {linkedTask.title}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {linkedTask.subtasks.filter(s => s.completed).length}/{linkedTask.subtasks.length} subtasks done
                </p>
              </div>

              <button
                onClick={() => moveTask(linkedTask.id, 'done')}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium hover:underline flex items-center gap-1 shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Done</span>
              </button>
            </div>
          )}
        </div>

        {/* Focus Streak Counter */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400 pt-2">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span>Completed focus blocks today: <strong className="text-white">{completedSessions}</strong></span>
        </div>
      </div>
    </div>
  );
};
