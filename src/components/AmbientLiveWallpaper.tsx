import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  Circle, 
  Check,
  Layers,
  Sparkles,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface AmbientLiveWallpaperProps {
  onClose: () => void;
  customBg?: string | null;
}

export const AmbientLiveWallpaper: React.FC<AmbientLiveWallpaperProps> = ({
  onClose,
  customBg
}) => {
  const { tasks, moveTask, userCount, connectionStatus } = useWorkspace();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [theme, setTheme] = useState<'oled_black' | 'aurora' | 'cyberpunk' | 'nordic'>('oled_black');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [burnInOffset, setBurnInOffset] = useState({ x: 0, y: 0 });
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Auto-updating live clock (every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Screen Wake Lock API for Android dock / desk stand AOD mode
  useEffect(() => {
    let isMounted = true;
    const requestLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          if (isMounted) setWakeLockActive(true);
          wakeLockRef.current.addEventListener('release', () => {
            if (isMounted) setWakeLockActive(false);
          });
        } catch {
          // Wake lock may fail if low battery or tab in background
        }
      }
    };

    requestLock();

    return () => {
      isMounted = false;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // OLED burn-in protection: subtle micro-drift every 5 minutes
  useEffect(() => {
    const burnInInterval = setInterval(() => {
      setBurnInOffset({
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 4
      });
    }, 300000); // 5 minutes

    return () => clearInterval(burnInInterval);
  }, []);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Hide controls after 3.5 seconds of inactivity
  useEffect(() => {
    let timeout: number | null = null;
    const handleMouseMove = () => {
      setControlsVisible(true);
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(() => setControlsVisible(false), 3500);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Date and year calculations
  const dayOfYear = Math.floor((currentTime.getTime() - new Date(currentTime.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const isLeap = (currentTime.getFullYear() % 4 === 0 && currentTime.getFullYear() % 100 !== 0) || (currentTime.getFullYear() % 400 === 0);
  const totalDays = isLeap ? 366 : 365;
  const yearPct = ((dayOfYear / totalDays) * 100).toFixed(1);

  const daysInMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
  const currentDayOfMonth = currentTime.getDate();

  const activeTasks = tasks.filter(t => t.status !== 'done').slice(0, 4);
  const recentCompletedTasks = tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 3);
  const totalCompletedCount = tasks.filter(t => t.status === 'done').length;

  // Background styling
  const getThemeBg = () => {
    if (customBg) {
      return {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.95)), url(${customBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    switch (theme) {
      case 'aurora':
        return { background: 'linear-gradient(135deg, #01140E 0%, #022C22 50%, #000000 100%)' };
      case 'cyberpunk':
        return { background: 'linear-gradient(135deg, #1A0724 0%, #0B0410 50%, #000000 100%)' };
      case 'nordic':
        return { background: 'linear-gradient(135deg, #0B1120 0%, #020617 60%, #000000 100%)' };
      case 'oled_black':
      default:
        return { background: '#000000' };
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-12 text-white select-none overflow-hidden transition-all duration-700 bg-dot-grid"
      style={{
        ...getThemeBg(),
        transform: `translate3d(${burnInOffset.x}px, ${burnInOffset.y}px, 0)`
      }}
    >
      {/* Floating Ambient Controls Bar (fades out when idle) */}
      <div className={`transition-opacity duration-300 flex items-center justify-between gap-4 z-20 ${
        controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3 bg-[#0E0E12]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#1F1F28] text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
          <span>ANDROID LIVE AOD · {connectionStatus === 'connected' ? `${userCount} peer(s)` : 'Live Feed'}</span>
          {wakeLockActive && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
              <ShieldCheck className="w-3 h-3" />
              <span>Wake Lock Active</span>
            </span>
          )}
        </div>

        {/* Right: Theme Selector & Fullscreen & Close */}
        <div className="flex items-center gap-2 bg-[#0E0E12]/80 backdrop-blur-md p-1 rounded-full border border-[#1F1F28]">
          <button
            onClick={() => setTheme('oled_black')}
            title="Pure Black OLED Theme"
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${theme === 'oled_black' ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40' : 'text-slate-400 hover:text-white'}`}
          >
            OLED Black
          </button>
          <button
            onClick={() => setTheme('aurora')}
            title="Emerald Theme"
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${theme === 'aurora' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400 hover:text-white'}`}
          >
            Aurora
          </button>
          <button
            onClick={() => setTheme('cyberpunk')}
            title="Cyberpunk Theme"
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${theme === 'cyberpunk' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-slate-400 hover:text-white'}`}
          >
            Cyber
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-1"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            title="Exit Ambient Live Wallpaper (Esc)"
            className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Wallpaper Body: Time, Progress & Tasks Split */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-between gap-10 my-auto max-w-7xl w-full mx-auto">
        {/* Left Column: Digital Clock & Date & OneDot Month Matrix */}
        <div className="flex-1 space-y-6">
          <div>
            <div className="font-mono text-7xl sm:text-9xl font-extrabold tracking-tighter text-white tabular-nums drop-shadow-md">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              <span className="text-3xl sm:text-4xl text-slate-500 font-normal ml-2">
                {currentTime.toLocaleTimeString('en-US', { second: '2-digit' })}
              </span>
            </div>

            <p className="text-lg sm:text-2xl text-slate-300 font-medium tracking-tight mt-1">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <p className="text-xs sm:text-sm font-mono text-orange-400 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#F97316]" />
              <span>Day {dayOfYear} of {totalDays} · {yearPct}% Year Elapsed</span>
            </p>
          </div>

          {/* Month Dot Matrix */}
          <div className="bg-[#0E0E12]/80 backdrop-blur-md p-4 rounded-2xl border border-[#1F1F28] max-w-md">
            <div className="text-xs font-mono text-slate-400 mb-2.5 flex items-center justify-between">
              <span className="font-semibold text-slate-300">{currentTime.toLocaleDateString('en-US', { month: 'long' })} Progress Matrix</span>
              <span className="text-orange-400">{currentDayOfMonth}/{daysInMonth} Days</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isPassed = dayNum < currentDayOfMonth;
                const isToday = dayNum === currentDayOfMonth;

                return (
                  <div
                    key={i}
                    title={`Day ${dayNum}`}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      isToday
                        ? 'bg-orange-500 ring-2 ring-orange-400 scale-125 animate-pulse shadow-[0_0_8px_#F97316]'
                        : isPassed
                        ? (i % 4 === 0 ? 'bg-blue-500' : 'bg-slate-300')
                        : 'border border-[#272733] bg-transparent'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Tasks Overlay (Active + Green Light Completed) */}
        <div className="flex-1 w-full max-w-lg space-y-4">
          {/* Active Tasks Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#1F1F28] text-xs font-mono text-slate-400">
            <span className="flex items-center gap-2 text-slate-200 font-semibold tracking-wider uppercase">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>Active Focus Tasks ({activeTasks.length})</span>
            </span>
            <span className="text-emerald-400 font-medium">{totalCompletedCount} Done</span>
          </div>

          {/* Active Tasks List with Breathing Glow on Red & Orange */}
          <div className="space-y-2">
            {activeTasks.map((task) => {
              const isUrgent = task.priority === 'urgent' || task.difficulty === 'hard';
              const isHigh = task.priority === 'high' || task.difficulty === 'medium';
              
              let dotClass = 'bg-blue-500 shadow-xs shadow-blue-500/40';
              if (isUrgent) {
                // Red breathing glow
                dotClass = 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.85)] animate-pulse';
              } else if (isHigh) {
                // Orange breathing glow
                dotClass = 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.85)] animate-pulse';
              }

              const completedSubs = task.subtasks.filter(s => s.completed).length;

              return (
                <div
                  key={task.id}
                  className="group flex items-center justify-between gap-3 p-3 bg-[#0E0E12]/90 backdrop-blur-md border border-[#1F1F28] hover:border-[#2D2D3D] rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => moveTask(task.id, 'done')}
                      title="Mark task done directly on wallpaper"
                      className="text-slate-500 hover:text-emerald-400 transition-colors shrink-0"
                    >
                      <Circle className="w-4 h-4 hover:stroke-emerald-400" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate group-hover:text-white">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-normal">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                        <span className="capitalize">{task.difficulty ? `${task.difficulty} diff` : task.priority}</span>
                        {task.tags.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{task.tags[0]}</span>
                          </>
                        )}
                        {task.dueDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{task.dueDate}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {task.subtasks.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums px-2 py-0.5 bg-[#16161E] rounded border border-[#272733]">
                      {completedSubs}/{task.subtasks.length}
                    </span>
                  )}
                </div>
              );
            })}

            {activeTasks.length === 0 && (
              <div className="p-5 text-center bg-[#0E0E12]/60 rounded-xl border border-[#1F1F28] text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-200">All tasks completed today!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Syncing live whenever new tasks are added.</p>
              </div>
            )}
          </div>

          {/* User Requested: Completed Tasks displayed in GREEN LIGHT (3 most recent) */}
          {recentCompletedTasks.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                <span className="flex items-center gap-1.5 uppercase font-semibold tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
                  <span>Recent Completed (Green Light)</span>
                </span>
                <span className="text-slate-500 text-[10px]">{recentCompletedTasks.length} shown</span>
              </div>

              <div className="space-y-1.5">
                {recentCompletedTasks.map((cTask) => (
                  <div
                    key={cTask.id}
                    className="flex items-center justify-between gap-3 p-2.5 bg-[#08080C]/80 backdrop-blur-md border border-[#161622] rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Glowing Green Light Dot (#10B981) with Checkmark */}
                      <div className="relative shrink-0 flex items-center justify-center">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.95)] ring-2 ring-emerald-500/40 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                        </span>
                      </div>

                      {/* Dimmed Line-Through Title */}
                      <span className="truncate text-slate-500 line-through font-medium text-[11px] sm:text-xs">
                        {cTask.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60 font-semibold">
                        DONE
                      </span>
                      <button
                        onClick={() => moveTask(cTask.id, 'todo')}
                        title="Reopen task"
                        className="p-1 text-slate-500 hover:text-slate-300 hover:bg-[#16161E] rounded transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] font-mono text-slate-500 z-10 flex items-center justify-center gap-3">
        <span>OneDot Android Live AOD</span>
        <span aria-hidden="true">·</span>
        <span>Green Light Completed Sync</span>
        <span aria-hidden="true">·</span>
        <span>Press <kbd className="px-1.5 py-0.5 bg-[#16161E] text-slate-300 rounded border border-[#272733]">ESC</kbd> to exit</span>
      </div>
    </div>
  );
};
