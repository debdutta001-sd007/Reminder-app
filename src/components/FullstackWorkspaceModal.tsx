import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { RoomSummary, RoomStats } from '../utils/api.ts';
import { 
  Database, 
  Server, 
  FolderPlus, 
  BarChart3, 
  Download, 
  Upload, 
  X, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface FullstackWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FullstackWorkspaceModal: React.FC<FullstackWorkspaceModalProps> = ({ isOpen, onClose }) => {
  const { 
    roomId, 
    changeRoom, 
    databaseHealth, 
    checkDbHealth, 
    fetchRooms, 
    createNewRoom, 
    fetchStats, 
    exportWorkspace, 
    importWorkspace,
    resetWorkspace
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'analytics' | 'backup'>('overview');
  const [roomsList, setRoomsList] = useState<RoomSummary[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [newRoomIdInput, setNewRoomIdInput] = useState('');
  const [newRoomNameInput, setNewRoomNameInput] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // Load data when modal opens or tab changes
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        await checkDbHealth();
        if (activeTab === 'rooms') {
          const list = await fetchRooms();
          if (mounted) setRoomsList(list);
        } else if (activeTab === 'analytics') {
          const s = await fetchStats();
          if (mounted) setStats(s);
        }
      } catch (err) {
        console.error('Failed to load modal data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [isOpen, activeTab, checkDbHealth, fetchRooms, fetchStats]);

  if (!isOpen) return null;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomIdInput.trim()) return;

    setLoading(true);
    try {
      const success = await createNewRoom(newRoomIdInput.trim(), newRoomNameInput.trim());
      if (success) {
        setActionSuccess(`Room "${newRoomIdInput.trim()}" created successfully!`);
        setNewRoomIdInput('');
        setNewRoomNameInput('');
        const updated = await fetchRooms();
        setRoomsList(updated);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const tasksToImport = Array.isArray(parsed) ? parsed : (parsed.tasks || []);

        if (!Array.isArray(tasksToImport) || tasksToImport.length === 0) {
          alert('No valid tasks array found in the uploaded JSON file.');
          return;
        }

        const success = await importWorkspace(tasksToImport, importMode);
        if (success) {
          setActionSuccess(`Imported ${tasksToImport.length} tasks successfully!`);
          setTimeout(() => setActionSuccess(null), 3000);
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-[#09090D] border border-[#232332] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A26] bg-[#0E0E14]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/60 border border-indigo-700/50 rounded-xl text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-display">Fullstack Workspace Hub</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-emerald-950/70 border border-emerald-600/60 text-emerald-300">
                  Persistent Storage
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connected to active room <span className="text-slate-200 font-mono font-semibold">#{roomId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#181824] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#1A1A26] bg-[#09090D]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-white bg-[#14141E]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101018]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Database & Health
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'rooms'
                ? 'border-indigo-500 text-white bg-[#14141E]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101018]'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Rooms Manager
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-white bg-[#14141E]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101018]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Workspace Analytics
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'backup'
                ? 'border-indigo-500 text-white bg-[#14141E]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101018]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Backup & Export
          </button>
        </div>

        {/* Success Alert Banner */}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-2.5 bg-emerald-950/60 border border-emerald-600/50 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Modal Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW & DATABASE HEALTH */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Architecture Highlight Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#12121C] to-[#0A0A10] border border-[#232334]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Production Fullstack Architecture</h3>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                      All tasks, rooms, subtasks, and comments are stored in a persistent file database with atomic disk writes. Real-time updates push through WebSockets and Server-Sent Events (SSE) directly to your Android live wallpaper feed.
                    </p>
                  </div>
                  <button
                    onClick={() => checkDbHealth()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C2A] hover:bg-[#252538] border border-[#303046] text-xs font-medium text-slate-200 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-400" />
                    Ping DB
                  </button>
                </div>
              </div>

              {/* Server & DB Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#111118] border border-[#1F1F2B] rounded-xl">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Database Engine</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/80 animate-pulse" />
                  </div>
                  <div className="text-sm font-bold text-white">Atomic JSON Storage</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">/data/rooms/*.json</div>
                </div>

                <div className="p-4 bg-[#111118] border border-[#1F1F2B] rounded-xl">
                  <div className="text-xs text-slate-400 mb-1">Total Rooms Saved</div>
                  <div className="text-xl font-bold text-white font-mono">
                    {databaseHealth?.roomsCount || 1}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Multi-workspace ready</div>
                </div>

                <div className="p-4 bg-[#111118] border border-[#1F1F2B] rounded-xl">
                  <div className="text-xs text-slate-400 mb-1">Persisted Tasks Count</div>
                  <div className="text-xl font-bold text-indigo-400 font-mono">
                    {databaseHealth?.totalStoredTasks || 5}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Safely written to disk</div>
                </div>
              </div>

              {/* REST API Endpoints Reference */}
              <div className="p-4 bg-[#0D0D14] border border-[#1C1C26] rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Fullstack REST API Endpoints
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-[#12121A] rounded-lg border border-[#1E1E2C] text-slate-300 flex items-center justify-between">
                    <span><strong className="text-emerald-400">GET</strong> /api/tasks</span>
                    <span className="text-[10px] text-slate-500">Query & Filter</span>
                  </div>
                  <div className="p-2 bg-[#12121A] rounded-lg border border-[#1E1E2C] text-slate-300 flex items-center justify-between">
                    <span><strong className="text-blue-400">POST</strong> /api/tasks</span>
                    <span className="text-[10px] text-slate-500">Persist Task</span>
                  </div>
                  <div className="p-2 bg-[#12121A] rounded-lg border border-[#1E1E2C] text-slate-300 flex items-center justify-between">
                    <span><strong className="text-amber-400">PUT</strong> /api/tasks/:id</span>
                    <span className="text-[10px] text-slate-500">Update Task</span>
                  </div>
                  <div className="p-2 bg-[#12121A] rounded-lg border border-[#1E1E2C] text-slate-300 flex items-center justify-between">
                    <span><strong className="text-red-400">DELETE</strong> /api/tasks/:id</span>
                    <span className="text-[10px] text-slate-500">Delete Task</span>
                  </div>
                  <div className="p-2 bg-[#12121A] rounded-lg border border-[#1E1E2C] text-slate-300 flex items-center justify-between">
                    <span><strong className="text-indigo-400">GET</strong> /api/rooms</span>
                    <span className="text-[10px] text-slate-500">List Rooms</span>
                  </div>
                  <div className="p-2 bg-[#12121A] rounded-lg border border-[#1E1E2C] text-slate-300 flex items-center justify-between">
                    <span><strong className="text-purple-400">GET</strong> /api/wallpaper.svg</span>
                    <span className="text-[10px] text-slate-500">Live Wallpaper</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROOMS MANAGER */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              {/* Create New Room Form */}
              <form onSubmit={handleCreateRoom} className="p-4 bg-[#111118] border border-[#21212E] rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-white">Create New Workspace Room</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-mono">Room Code (slug)</label>
                    <input
                      type="text"
                      value={newRoomIdInput}
                      onChange={(e) => setNewRoomIdInput(e.target.value)}
                      placeholder="e.g. engineering-sprint"
                      className="w-full text-xs px-3 py-2 bg-[#161622] border border-[#2B2B3C] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-mono">Display Name</label>
                    <input
                      type="text"
                      value={newRoomNameInput}
                      onChange={(e) => setNewRoomNameInput(e.target.value)}
                      placeholder="e.g. Q4 Sprint Board"
                      className="w-full text-xs px-3 py-2 bg-[#161622] border border-[#2B2B3C] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !newRoomIdInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Create & Save Room
                  </button>
                </div>
              </form>

              {/* List of Persisted Rooms */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Saved Workspace Rooms ({roomsList.length})
                </h4>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {roomsList.map((r) => {
                    const isCurrent = r.id === roomId;
                    return (
                      <div
                        key={r.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-colors ${
                          isCurrent 
                            ? 'bg-indigo-950/30 border-indigo-600/50' 
                            : 'bg-[#101018] border-[#1E1E2C] hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{r.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-[#161622] px-2 py-0.5 rounded-md">
                              #{r.id}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                                Active Room
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                            <span>{r.taskCount} total tasks</span>
                            <span>·</span>
                            <span className="text-orange-400">{r.activeCount} open</span>
                            <span>·</span>
                            <span className="text-emerald-400">{r.completedCount} done</span>
                            {r.urgentCount > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-red-400">{r.urgentCount} urgent</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          {isCurrent ? (
                            <span className="text-xs text-indigo-400 font-semibold px-3 py-1.5">
                              Current
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                changeRoom(r.id);
                                onClose();
                              }}
                              className="text-xs px-3 py-1.5 bg-[#1A1A26] hover:bg-indigo-600 hover:text-white text-slate-300 font-medium rounded-lg border border-[#2B2B3E] transition-colors"
                            >
                              Switch Room
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACE ANALYTICS */}
          {activeTab === 'analytics' && stats && (
            <div className="space-y-6">
              {/* High Level Progress Header */}
              <div className="p-4 bg-[#111118] border border-[#21212E] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">Overall Completion Rate</span>
                  <span className="text-lg font-bold text-white font-mono">{stats.completionRate}%</span>
                </div>
                <div className="w-full bg-[#1A1A26] rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 shadow-[0_0_8px_#10B981]" 
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                  <span>{stats.completedTasks} completed in green light</span>
                  <span>{stats.totalTasks - stats.completedTasks} pending focus</span>
                </div>
              </div>

              {/* Tri-Color & Difficulty Distribution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#111118] border border-[#21212E] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Priority Dot Hierarchy
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs shadow-red-500" />
                        <span className="text-slate-300">Urgent & Hard Tasks</span>
                      </span>
                      <strong className="text-white font-mono">{stats.urgentCount}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs shadow-orange-500" />
                        <span className="text-slate-300">High / Today's Focus</span>
                      </span>
                      <strong className="text-white font-mono">{stats.highCount}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs shadow-blue-500" />
                        <span className="text-slate-300">Normal / Easy Priority</span>
                      </span>
                      <strong className="text-white font-mono">{stats.mediumCount + stats.lowCount}</strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#1C1C28]">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500" />
                        <span className="text-emerald-400 font-medium">Completed Green Light</span>
                      </span>
                      <strong className="text-emerald-300 font-mono">{stats.completedTasks}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#111118] border border-[#21212E] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    AI Difficulty Breakdown
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Hard (Multi-step, &gt;2h)</span>
                      <span className="text-red-400 font-mono font-bold">{stats.difficultyBreakdown.hard}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Medium (1-2 hours)</span>
                      <span className="text-orange-400 font-mono font-bold">{stats.difficultyBreakdown.medium}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Easy (15-30 mins)</span>
                      <span className="text-blue-400 font-mono font-bold">{stats.difficultyBreakdown.easy}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#1C1C28]">
                      <span className="text-slate-400">Total Focus Required</span>
                      <span className="text-white font-mono font-bold">
                        {Math.round(stats.totalEstimatedMinutes / 60)} hrs ({stats.totalEstimatedMinutes}m)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP & DATA MANAGEMENT */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Export Card */}
              <div className="p-4 bg-[#111118] border border-[#21212E] rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Export Room Workspace Backup</h4>
                  <p className="text-xs text-slate-400">
                    Download complete snapshot of room <span className="font-mono text-slate-200">#{roomId}</span> as a standalone JSON file.
                  </p>
                </div>
                <button
                  onClick={exportWorkspace}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download JSON
                </button>
              </div>

              {/* Import Card */}
              <div className="p-4 bg-[#111118] border border-[#21212E] rounded-xl space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Restore / Import Tasks</h4>
                  <p className="text-xs text-slate-400">
                    Import previously exported workspace JSON into room <span className="font-mono text-slate-200">#{roomId}</span>.
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-indigo-600"
                    />
                    <span>Merge (keep existing tasks)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-indigo-600"
                    />
                    <span>Replace (overwrite workspace)</span>
                  </label>
                </div>

                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C1C2A] hover:bg-[#252538] border border-[#303046] text-xs font-medium text-slate-200 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select JSON Backup File...</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Reset Card */}
              <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-300 mb-1">Reset to Default Template</h4>
                  <p className="text-xs text-slate-400">
                    Re-seed this room with the original 5 sample high-efficiency tasks.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to reset tasks in this room to the default template?')) {
                      resetWorkspace();
                      setActionSuccess('Workspace reset to default template');
                      setTimeout(() => setActionSuccess(null), 3000);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-semibold rounded-lg transition-colors shrink-0"
                >
                  Reset Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
