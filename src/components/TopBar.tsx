import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { ViewMode } from '../types.ts';
import { 
  Share2, 
  Check, 
  RotateCcw,
  Wifi,
  BatteryMedium,
  Database
} from 'lucide-react';

interface TopBarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewTask: () => void;
  onOpenProfile: () => void;
  onOpenFullstackHub: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onViewChange,
  onOpenNewTask,
  onOpenProfile,
  onOpenFullstackHub
}) => {
  const { 
    currentUser, 
    peers, 
    connectionStatus, 
    roomId, 
    userCount, 
    changeRoom,
    resetWorkspace 
  } = useWorkspace();

  const [copied, setCopied] = useState(false);
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [newRoomCode, setNewRoomCode] = useState(roomId);

  const handleCopyInvite = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSwitchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomCode.trim()) {
      changeRoom(newRoomCode);
      setShowRoomInput(false);
    }
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-[#1A1A24]">
      {/* Android System Status Strip (Simulated for authentic Android ambiance) */}
      <div className="flex items-center justify-between px-6 py-1 text-[11px] font-mono text-slate-400 border-b border-[#14141B]">
        <span>{timeStr}</span>
        <div className="flex items-center gap-2">
          <span>5G</span>
          <Wifi className="w-3 h-3 text-slate-300" />
          <BatteryMedium className="w-3.5 h-3.5 text-slate-300" />
          <span>100%</span>
        </div>
      </div>

      {/* Main App Bar */}
      <div className="flex items-center justify-between gap-6 px-6 py-3">
        {/* Zone 1: Android Wordmark with Red, Orange, Blue Dots */}
        <div className="flex items-center gap-3 shrink-0">
          <a 
            href="/" 
            className="flex items-center gap-2 text-white hover:text-indigo-300 transition-colors whitespace-nowrap"
          >
            {/* Signature Tri-Color Dot Logo */}
            <div className="flex items-center gap-1 p-1 bg-[#121218] rounded-md border border-[#22222E]">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-xs shadow-red-500/50" />
              <span className="w-2 h-2 rounded-full bg-orange-500 shadow-xs shadow-orange-500/50" />
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs shadow-blue-500/50" />
            </div>

            <span className="font-display text-base font-bold tracking-tight">
              OneDot <span className="text-xs font-mono font-normal text-indigo-400">Android</span>
            </span>
          </a>

          {/* Room code identifier */}
          <button
            onClick={() => setShowRoomInput(!showRoomInput)}
            title="Switch or rename room"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors py-1 px-2 rounded-md hover:bg-[#15151D]"
          >
            <span className="font-mono text-slate-500">#</span>
            <span className="font-medium text-slate-300">{roomId}</span>
          </button>

          {showRoomInput && (
            <form onSubmit={handleSwitchRoom} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newRoomCode}
                onChange={(e) => setNewRoomCode(e.target.value)}
                placeholder="room-code"
                className="text-xs px-2.5 py-1 bg-[#14141C] border border-[#2B2B3C] text-white rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28"
                autoFocus
              />
              <button
                type="submit"
                className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 font-semibold"
              >
                Join
              </button>
            </form>
          )}
        </div>

        {/* Zone 2: Collaborators & Primary Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Active Collaborator Avatar Stack */}
          <div className="flex items-center -space-x-1.5" title={`${userCount} collaborator(s) online`}>
            {/* Current User Avatar */}
            <button
              onClick={onOpenProfile}
              title={`${currentUser.name} (You) - Click to customize`}
              className="relative group z-20 flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold border-2 border-black shadow-xs transition-transform hover:scale-105"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.name.charAt(0).toUpperCase()}
              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
                connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-orange-400'
              }`} />
            </button>

            {/* Remote Peer Avatars */}
            {peers.slice(0, 3).map((peer) => (
              <div
                key={peer.id}
                title={`${peer.name} (Active peer)`}
                className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold border-2 border-black shadow-xs transition-transform hover:scale-105"
                style={{ backgroundColor: peer.color }}
              >
                {peer.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          {/* Fullstack Hub Button */}
          <button
            onClick={onOpenFullstackHub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/60 rounded-xl transition-colors whitespace-nowrap"
            title="Fullstack Workspace Hub: Persistent Database, Rooms Manager, Analytics, and Backups"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Fullstack Hub</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Share Room Button */}
          <button
            onClick={handleCopyInvite}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#14141C] hover:bg-[#1D1D28] border border-[#232330] rounded-xl transition-colors whitespace-nowrap"
            title="Copy invite URL for collaborative editing"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Share Room</span>
              </>
            )}
          </button>

          {/* Reset Workspace button */}
          <button
            onClick={resetWorkspace}
            title="Reset to default tasks template"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#161620] rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
