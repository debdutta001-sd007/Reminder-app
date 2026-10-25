import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';

export const CollaboratorCursors: React.FC = () => {
  const { peers } = useWorkspace();

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {peers.map((peer) => {
        if (!peer.cursor) return null;

        return (
          <div
            key={peer.id}
            className="absolute transition-all duration-75 ease-out flex items-start gap-1"
            style={{
              left: `${peer.cursor.x}px`,
              top: `${peer.cursor.y}px`,
              transform: 'translate(-2px, -2px)'
            }}
          >
            {/* SVG Mouse Pointer */}
            <svg
              className="w-4 h-4 drop-shadow-xs"
              viewBox="0 0 24 24"
              fill={peer.color}
              stroke="white"
              strokeWidth="1.5"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" />
            </svg>

            {/* Peer Name Tag */}
            <div
              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-xs whitespace-nowrap"
              style={{ backgroundColor: peer.color }}
            >
              {peer.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};
