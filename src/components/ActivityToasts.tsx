import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { X, Sparkles, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';

export const ActivityToasts: React.FC = () => {
  const { notifications, dismissNotification } = useWorkspace();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-900/90 text-white rounded-lg shadow-lg border border-slate-800 backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {notif.type === 'create' && <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            {notif.type === 'move' && <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            {notif.type === 'delete' && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
            {notif.type === 'join' && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
            {!notif.type && <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            
            <p className="text-xs text-slate-200 truncate">
              {notif.message}
            </p>
          </div>

          <button
            onClick={() => dismissNotification(notif.id)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
