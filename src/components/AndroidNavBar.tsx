import React from 'react';
import { ViewMode } from '../types.ts';
import { 
  Kanban, 
  ListTodo, 
  Grid2X2, 
  Timer, 
  Sparkles, 
  Plus,
  Mic
} from 'lucide-react';

interface AndroidNavBarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewTask: () => void;
  onOpenVoiceModal?: () => void;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({
  currentView,
  onViewChange,
  onOpenNewTask,
  onOpenVoiceModal
}) => {
  const navItems: { id: ViewMode; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'kanban', label: 'Kanban', icon: Kanban },
    { id: 'list', label: 'List', icon: ListTodo },
    { id: 'matrix', label: 'Matrix', icon: Grid2X2 },
    { id: 'focus', label: 'Focus', icon: Timer },
    { id: 'wallpaper', label: 'Wallpaper', icon: Sparkles }
  ];

  return (
    <>
      {/* Floating Action Buttons for Android 1-Handed Ergonomics */}
      {currentView !== 'ambient' && (
        <div className="fixed bottom-22 right-4 z-40 flex flex-col items-center gap-3">
          {/* AI Voice Microphone Quick Action */}
          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              title="Speak to Add Task (Gemini AI)"
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#EF4444] hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-transform active:scale-95 border border-red-400/40"
            >
              <Mic className="w-5 h-5 animate-pulse" />
            </button>
          )}

          {/* New Task FAB */}
          <button
            onClick={onOpenNewTask}
            title="Create New Task (+)"
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F97316] hover:bg-orange-500 text-white shadow-xl shadow-orange-600/30 transition-transform active:scale-95 border border-orange-400/30 group"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>
      )}

      {/* Android Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#09090D]/95 backdrop-blur-xl border-t border-[#1C1C26] px-2 pt-1 pb-safe flex flex-col">
        <div className="grid grid-cols-5 items-center justify-around h-15 max-w-lg mx-auto w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all relative ${
                  isActive ? 'text-orange-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Material Pill Indicator */}
                <div
                  className={`flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
                    isActive ? 'bg-orange-500/20 text-orange-400' : 'bg-transparent text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <span className="text-[10px] tracking-tight mt-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Android System Gesture Navigation Handle */}
        <div className="w-32 h-1 bg-slate-600/70 rounded-full mx-auto my-1.5" />
      </nav>
    </>
  );
};
