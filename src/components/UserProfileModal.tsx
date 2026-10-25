import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { X, Check, User } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PALETTE = [
  { hex: '#EF4444', name: 'Red' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#8B5CF6', name: 'Purple' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#64748B', name: 'Slate' }
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useWorkspace();
  const [name, setName] = useState(currentUser.name);
  const [selectedColor, setSelectedColor] = useState(currentUser.color);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateProfile(name.trim(), selectedColor);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-[#0E0E12] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#1F1F28] z-10 animate-in fade-in zoom-in-95 duration-150 text-white">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1F1F28]">
          <h3 className="font-display text-base font-bold text-white tracking-tight flex items-center gap-2">
            <User className="w-4 h-4 text-orange-400" />
            <span>Android Collaborator Profile</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-[#1F1F28] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md transition-colors ring-2 ring-[#272733]"
              style={{ backgroundColor: selectedColor }}
            >
              {name.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Live Android cursor beacon
            </span>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or handle..."
              className="w-full text-xs px-3.5 py-2.5 bg-[#16161E] border border-[#272733] rounded-xl focus:outline-none focus:border-orange-500 text-white font-medium"
            />
          </div>

          {/* Color palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Beacon Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className="flex items-center justify-center h-9 rounded-lg transition-transform hover:scale-105 relative"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {selectedColor === c.hex && (
                    <Check className="w-4 h-4 text-white drop-shadow-xs" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
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
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-xl transition-all shadow-md"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
