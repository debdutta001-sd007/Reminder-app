import React, { useState, useEffect } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext.tsx';
import { ViewMode, TaskStatus } from './types.ts';
import { TopBar } from './components/TopBar.tsx';
import { AndroidNavBar } from './components/AndroidNavBar.tsx';
import { KanbanBoard } from './components/KanbanBoard.tsx';
import { ListView } from './components/ListView.tsx';
import { EisenhowerMatrix } from './components/EisenhowerMatrix.tsx';
import { FocusTimer } from './components/FocusTimer.tsx';
import { WallpaperStudio } from './components/WallpaperStudio.tsx';
import { AmbientLiveWallpaper } from './components/AmbientLiveWallpaper.tsx';
import { VoiceTaskModal } from './components/VoiceTaskModal.tsx';
import { CollaboratorCursors } from './components/CollaboratorCursors.tsx';
import { ActivityToasts } from './components/ActivityToasts.tsx';
import { TaskDrawer } from './components/TaskDrawer.tsx';
import { NewTaskModal } from './components/NewTaskModal.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { FullstackWorkspaceModal } from './components/FullstackWorkspaceModal.tsx';
import { CheckCircle2, Clock, AlertTriangle, Users, Layers, Mic, Database } from 'lucide-react';

const WorkspaceMain: React.FC = () => {
  const { tasks, userCount, connectionStatus, roomId } = useWorkspace();

  const [currentView, setCurrentView] = useState<ViewMode>('kanban');
  const [activeDrawerTaskId, setActiveDrawerTaskId] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskInitialStatus, setNewTaskInitialStatus] = useState<TaskStatus>('todo');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFullstackHubOpen, setIsFullstackHubOpen] = useState(false);
  const [activeAmbientBg, setActiveAmbientBg] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsNewTaskOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsVoiceModalOpen(true);
      } else if (e.key === '1') {
        setCurrentView('kanban');
      } else if (e.key === '2') {
        setCurrentView('list');
      } else if (e.key === '3') {
        setCurrentView('matrix');
      } else if (e.key === '4') {
        setCurrentView('focus');
      } else if (e.key === '5') {
        setCurrentView('wallpaper');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const urgentTasks = tasks.filter(t => (t.priority === 'urgent' || t.urgency || t.difficulty === 'hard') && t.status !== 'done').length;

  const handleOpenNewTaskWithStatus = (status: TaskStatus) => {
    setNewTaskInitialStatus(status);
    setIsNewTaskOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col font-sans relative selection:bg-orange-500 selection:text-white pb-28">
      {/* Android Top Status Bar & Insignia Header */}
      <TopBar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenNewTask={() => {
          setNewTaskInitialStatus('todo');
          setIsNewTaskOpen(true);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenFullstackHub={() => setIsFullstackHubOpen(true)}
      />

      {/* Main Android Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col">
        {/* Android Quick Metrics Strip */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-3 mb-4 border-b border-[#1F1F28] text-xs">
          <div className="flex items-center gap-5 text-slate-400 font-mono tabular-nums">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Total: <strong className="text-white">{totalTasks}</strong></span>
            </span>

            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>In Progress: <strong className="text-orange-300">{inProgressTasks}</strong></span>
            </span>

            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Done: <strong className="text-emerald-300">{completedTasks}</strong></span>
            </span>

            {urgentTasks > 0 && (
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Urgent: <strong>{urgentTasks}</strong></span>
              </span>
            )}
          </div>

          {/* Real-Time Sync, Voice & Fullstack DB Status Quick Triggers */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <button
              onClick={() => setIsFullstackHubOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/60 text-indigo-300 rounded-lg font-mono text-[11px] transition-colors"
              title="Fullstack Workspace Hub: Persistent DB, Rooms Manager, Analytics"
            >
              <Database className="w-3 h-3 text-indigo-400" />
              <span>Persistent DB</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-red-400 rounded-lg font-mono text-[11px] transition-colors"
              title="Add task via AI Voice"
            >
              <Mic className="w-3 h-3 text-red-400 animate-pulse" />
              <span>Voice AI</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span className="font-mono text-[11px]">
                {connectionStatus === 'connected' ? `${userCount} active` : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* View Switch Container */}
        <div className="flex-1">
          {currentView === 'kanban' && (
            <KanbanBoard
              onOpenDrawer={(taskId) => setActiveDrawerTaskId(taskId)}
              onOpenNewTaskWithStatus={handleOpenNewTaskWithStatus}
            />
          )}

          {currentView === 'list' && (
            <ListView
              onOpenDrawer={(taskId) => setActiveDrawerTaskId(taskId)}
              onOpenNewTask={() => {
                setNewTaskInitialStatus('todo');
                setIsNewTaskOpen(true);
              }}
            />
          )}

          {currentView === 'matrix' && (
            <EisenhowerMatrix
              onOpenDrawer={(taskId) => setActiveDrawerTaskId(taskId)}
              onOpenNewTask={() => {
                setNewTaskInitialStatus('todo');
                setIsNewTaskOpen(true);
              }}
            />
          )}

          {currentView === 'focus' && (
            <FocusTimer />
          )}

          {currentView === 'wallpaper' && (
            <WallpaperStudio
              onLaunchAmbient={(customBg) => {
                setActiveAmbientBg(customBg);
                setCurrentView('ambient');
              }}
            />
          )}
        </div>
      </main>

      {/* Material Design 3 Bottom Navigation Bar with FAB */}
      <AndroidNavBar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenNewTask={() => {
          setNewTaskInitialStatus('todo');
          setIsNewTaskOpen(true);
        }}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
      />

      {/* Fullscreen Ambient Live Wallpaper Overlay */}
      {currentView === 'ambient' && (
        <AmbientLiveWallpaper
          customBg={activeAmbientBg}
          onClose={() => setCurrentView('wallpaper')}
        />
      )}

      {/* Floating Real-Time Components */}
      <CollaboratorCursors />
      <ActivityToasts />

      {/* Modals & Slide-over Drawer */}
      {activeDrawerTaskId && (
        <TaskDrawer
          taskId={activeDrawerTaskId}
          onClose={() => setActiveDrawerTaskId(null)}
        />
      )}

      <NewTaskModal
        isOpen={isNewTaskOpen}
        initialStatus={newTaskInitialStatus}
        onClose={() => setIsNewTaskOpen(false)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
      />

      <VoiceTaskModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <FullstackWorkspaceModal
        isOpen={isFullstackHubOpen}
        onClose={() => setIsFullstackHubOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceMain />
    </WorkspaceProvider>
  );
}
