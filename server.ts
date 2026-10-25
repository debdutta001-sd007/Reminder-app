import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  initStorage, 
  getOrCreateRoomRecord, 
  saveRoomRecord, 
  listAllRooms, 
  createRoomRecord, 
  calculateRoomStats,
  Task, 
  Subtask, 
  TaskComment,
  RoomRecord 
} from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer(app);

app.use(express.json({ limit: '10mb' }));

// Initialize Persistent Storage
initStorage();

export interface PeerPresence {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  activeTaskId: string | null;
  lastSeen: number;
}

// Initial seed tasks showcasing OneDot high-efficiency workflow
const defaultSeedTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Design OneDot multi-view task canvas',
    description: 'Create responsive visual architecture for Kanban columns, Eisenhower priority quadrants, and high-density list views.',
    status: 'in_progress',
    priority: 'urgent',
    urgency: true,
    importance: true,
    tags: ['Design', 'UI/UX'],
    dueDate: '2026-10-26',
    subtasks: [
      { id: 'sub-1', text: 'Define 60-30-10 neutral color tokens', completed: true },
      { id: 'sub-2', text: 'Implement zero-pill metadata typography', completed: true },
      { id: 'sub-3', text: 'Build Eisenhower 4-quadrant dot matrix view', completed: false }
    ],
    comments: [
      { id: 'c-1', author: 'Sarah C.', avatarColor: '#059669', text: 'Loving the dot grid visual density!', createdAt: '2026-10-25T00:15:00Z' }
    ],
    assignee: { name: 'Sarah C.', avatarColor: '#059669' },
    difficulty: 'hard',
    estimatedMinutes: 180,
    createdBy: 'System',
    createdAt: '2026-10-24T18:00:00Z',
    updatedAt: '2026-10-25T00:20:00Z'
  },
  {
    id: 'task-2',
    title: 'Real-time WebSocket presence & collaborative cursor sync',
    description: 'Broadcast sub-200ms cursor positions, room joins, task drag-and-drop operations, and active card focus rings.',
    status: 'in_progress',
    priority: 'high',
    urgency: true,
    importance: true,
    tags: ['Engineering', 'WebSockets'],
    dueDate: '2026-10-27',
    subtasks: [
      { id: 'sub-4', text: 'Setup native ws server on port 3000', completed: true },
      { id: 'sub-5', text: 'Implement optimistic client updates', completed: true },
      { id: 'sub-6', text: 'Broadcast peer cursor coordinates with lerp', completed: false }
    ],
    comments: [
      { id: 'c-2', author: 'Alex M.', avatarColor: '#4F46E5', text: 'Server is authoritative; client handles optimistic reconciliation.', createdAt: '2026-10-25T00:25:00Z' }
    ],
    assignee: { name: 'Alex M.', avatarColor: '#4F46E5' },
    difficulty: 'medium',
    estimatedMinutes: 90,
    createdBy: 'System',
    createdAt: '2026-10-24T19:30:00Z',
    updatedAt: '2026-10-25T00:30:00Z'
  },
  {
    id: 'task-3',
    title: 'Integrated Pomodoro focus interval timer',
    description: 'Distraction-free 25-minute timer linked to the active task, tracking focus streak and sound alerts.',
    status: 'todo',
    priority: 'medium',
    urgency: false,
    importance: true,
    tags: ['Productivity', 'Focus'],
    dueDate: '2026-10-28',
    subtasks: [
      { id: 'sub-7', text: 'Add start/pause/reset states', completed: true },
      { id: 'sub-8', text: 'Web Audio API bell notification', completed: true },
      { id: 'sub-9', text: 'Link timer directly to selected task', completed: false }
    ],
    comments: [],
    assignee: { name: 'Debdutta D.', avatarColor: '#D97706' },
    difficulty: 'easy',
    estimatedMinutes: 30,
    createdBy: 'System',
    createdAt: '2026-10-24T20:00:00Z',
    updatedAt: '2026-10-24T20:00:00Z'
  },
  {
    id: 'task-4',
    title: 'Audit WCAG AA accessibility & keyboard shortcuts',
    description: 'Ensure focus rings, Cmd/Ctrl+K quick action search, Esc to dismiss modal, and tabular numbers are verified.',
    status: 'backlog',
    priority: 'low',
    urgency: false,
    importance: true,
    tags: ['QA', 'A11y'],
    dueDate: '2026-10-30',
    subtasks: [
      { id: 'sub-10', text: 'Check contrast on dark and light surfaces', completed: true },
      { id: 'sub-11', text: 'Ensure touch targets >= 40px', completed: true }
    ],
    comments: [],
    assignee: null,
    difficulty: 'easy',
    estimatedMinutes: 45,
    createdBy: 'System',
    createdAt: '2026-10-24T21:00:00Z',
    updatedAt: '2026-10-24T21:00:00Z'
  },
  {
    id: 'task-5',
    title: 'Deploy OneDot collaborative room sharing',
    description: 'Generate shareable room codes and links for instant multi-user synchronization.',
    status: 'done',
    priority: 'high',
    urgency: false,
    importance: false,
    tags: ['Release', 'Infra'],
    dueDate: '2026-10-25',
    subtasks: [
      { id: 'sub-12', text: 'URL query parameter ?room=XYZ', completed: true },
      { id: 'sub-13', text: 'Copy room invite link button', completed: true }
    ],
    comments: [
      { id: 'c-3', author: 'Elena R.', avatarColor: '#9333EA', text: 'Tested with 4 simultaneous tabs — syncing instantly!', createdAt: '2026-10-25T00:35:00Z' }
    ],
    assignee: { name: 'Elena R.', avatarColor: '#9333EA' },
    difficulty: 'medium',
    estimatedMinutes: 60,
    createdBy: 'System',
    createdAt: '2026-10-24T17:00:00Z',
    updatedAt: '2026-10-25T00:40:00Z'
  }
];

// In-Memory WebSockets and Presence per room
const peerSessions = new Map<string, Map<string, { ws: WebSocket; presence: PeerPresence }>>();

function getPeerSessions(roomId: string) {
  if (!peerSessions.has(roomId)) {
    peerSessions.set(roomId, new Map());
  }
  return peerSessions.get(roomId)!;
}

function broadcastToRoom(roomId: string, message: object, excludePeerId?: string) {
  const sessions = peerSessions.get(roomId);
  if (!sessions) return;
  const str = JSON.stringify(message);
  sessions.forEach((peerObj, pId) => {
    if (pId !== excludePeerId && peerObj.ws.readyState === WebSocket.OPEN) {
      peerObj.ws.send(str);
    }
  });
}

// SSE client registry for live wallpaper push updates
const wallpaperSseClients = new Map<string, Set<express.Response>>();

function broadcastWallpaperUpdate(roomId: string) {
  const clients = wallpaperSseClients.get(roomId);
  if (clients && clients.size > 0) {
    const data = JSON.stringify({ timestamp: Date.now(), roomId });
    clients.forEach(client => {
      try {
        client.write(`event: wallpaper-update\ndata: ${data}\n\n`);
      } catch {
        clients.delete(client);
      }
    });
  }
}

// ==========================================
// FULLSTACK RESTful API ENDPOINTS
// ==========================================

// 1. Health & Database Diagnostic Endpoint
app.get('/api/health', (req, res) => {
  let totalPeers = 0;
  peerSessions.forEach(m => totalPeers += m.size);
  const rooms = listAllRooms();
  const totalTasks = rooms.reduce((acc, r) => acc + r.taskCount, 0);

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: {
      type: 'persistent-json-file-db',
      status: 'healthy',
      roomsCount: rooms.length,
      totalStoredTasks: totalTasks
    },
    activePeers: totalPeers
  });
});

// 2. Rooms API: List & Create Rooms
app.get('/api/rooms', (req, res) => {
  const rooms = listAllRooms();
  res.json({ success: true, rooms });
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { roomId, name } = req.body;
    if (!roomId || !roomId.trim()) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    const safeId = roomId.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '-');
    const room = await createRoomRecord(safeId, name, defaultSeedTasks);
    res.status(201).json({ success: true, room });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to create room', message: (err as Error).message });
  }
});

// 3. Workspace Analytics & Statistics Endpoint
app.get('/api/stats', (req, res) => {
  const roomId = (req.query.room as string) || 'onedot-main';
  const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
  const stats = calculateRoomStats(record.tasks);
  res.json({ success: true, roomId, stats });
});

// 4. Tasks Query API with Server-Side Filtering
app.get('/api/tasks', (req, res) => {
  const roomId = (req.query.room as string) || 'onedot-main';
  const { status, priority, difficulty, search, tag } = req.query;
  const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
  
  let tasks = [...record.tasks];

  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }
  if (priority) {
    tasks = tasks.filter(t => t.priority === priority);
  }
  if (difficulty) {
    tasks = tasks.filter(t => t.difficulty === difficulty);
  }
  if (tag) {
    tasks = tasks.filter(t => t.tags && t.tags.includes(tag as string));
  }
  if (search && typeof search === 'string') {
    const term = search.toLowerCase();
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(term) || 
      t.description.toLowerCase().includes(term) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }

  res.json({ success: true, roomId, count: tasks.length, tasks });
});

// 5. Get Single Task
app.get('/api/tasks/:id', (req, res) => {
  const roomId = (req.query.room as string) || 'onedot-main';
  const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
  const task = record.tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ success: true, task });
});

// 6. Create Task via REST
app.post('/api/tasks', async (req, res) => {
  try {
    const { room, task, by } = req.body;
    const roomId = room || 'onedot-main';
    if (!task || !task.title || !task.title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
    const newTask: Task = {
      id: task.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: task.title.trim(),
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      urgency: typeof task.urgency === 'boolean' ? task.urgency : false,
      importance: typeof task.importance === 'boolean' ? task.importance : true,
      tags: Array.isArray(task.tags) ? task.tags : [],
      dueDate: task.dueDate || null,
      subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      comments: Array.isArray(task.comments) ? task.comments : [],
      assignee: task.assignee || null,
      difficulty: task.difficulty || 'medium',
      estimatedMinutes: task.estimatedMinutes || (task.difficulty === 'hard' ? 120 : task.difficulty === 'easy' ? 25 : 60),
      createdBy: by || 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    record.tasks.unshift(newTask);
    await saveRoomRecord(record);

    // Broadcast to WebSocket peers and SSE
    broadcastToRoom(roomId, {
      type: 'task:created',
      task: newTask,
      by: by || 'Someone'
    });
    broadcastWallpaperUpdate(roomId);

    res.status(201).json({ success: true, task: newTask });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to create task', message: (err as Error).message });
  }
});

// 7. Update Task via REST
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { room, task, by } = req.body;
    const roomId = room || 'onedot-main';
    const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
    const index = record.tasks.findIndex(t => t.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    record.tasks[index] = {
      ...record.tasks[index],
      ...task,
      updatedAt: new Date().toISOString()
    };

    await saveRoomRecord(record);

    broadcastToRoom(roomId, {
      type: 'task:updated',
      task: record.tasks[index],
      by: by || 'Someone'
    });
    broadcastWallpaperUpdate(roomId);

    res.json({ success: true, task: record.tasks[index] });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to update task', message: (err as Error).message });
  }
});

// 8. Move Task (Status / Urgency / Importance)
app.patch('/api/tasks/:id/move', async (req, res) => {
  try {
    const { room, status, urgency, importance, by } = req.body;
    const roomId = room || 'onedot-main';
    const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
    const task = record.tasks.find(t => t.id === req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (status) task.status = status;
    if (typeof urgency === 'boolean') task.urgency = urgency;
    if (typeof importance === 'boolean') task.importance = importance;
    task.updatedAt = new Date().toISOString();

    await saveRoomRecord(record);

    broadcastToRoom(roomId, {
      type: 'task:moved',
      taskId: task.id,
      status: task.status,
      urgency: task.urgency,
      importance: task.importance,
      by: by || 'Someone'
    });
    broadcastWallpaperUpdate(roomId);

    res.json({ success: true, task });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to move task', message: (err as Error).message });
  }
});

// 9. Delete Task via REST
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const roomId = (req.query.room as string) || 'onedot-main';
    const by = (req.query.by as string) || 'Someone';
    const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
    const initialLen = record.tasks.length;
    record.tasks = record.tasks.filter(t => t.id !== req.params.id);

    if (record.tasks.length === initialLen) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await saveRoomRecord(record);

    broadcastToRoom(roomId, {
      type: 'task:deleted',
      taskId: req.params.id,
      by
    });
    broadcastWallpaperUpdate(roomId);

    res.json({ success: true, taskId: req.params.id });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to delete task', message: (err as Error).message });
  }
});

// 10. Subtask Toggle via REST
app.patch('/api/tasks/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const { room, by } = req.body;
    const roomId = room || 'onedot-main';
    const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
    const task = record.tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const sub = task.subtasks.find(s => s.id === req.params.subtaskId);
    if (!sub) return res.status(404).json({ error: 'Subtask not found' });

    sub.completed = !sub.completed;
    task.updatedAt = new Date().toISOString();
    await saveRoomRecord(record);

    broadcastToRoom(roomId, {
      type: 'task:subtask_toggled',
      taskId: task.id,
      subtaskId: sub.id,
      completed: sub.completed,
      by: by || 'Someone'
    });
    broadcastWallpaperUpdate(roomId);

    res.json({ success: true, completed: sub.completed, subtask: sub });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to toggle subtask', message: (err as Error).message });
  }
});

// 11. Add Comment via REST
app.post('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { room, comment } = req.body;
    const roomId = room || 'onedot-main';
    const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
    const task = record.tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newComment: TaskComment = {
      id: `c-${Date.now()}`,
      author: comment?.author || 'Anonymous',
      avatarColor: comment?.avatarColor || '#4F46E5',
      text: comment?.text || '',
      createdAt: new Date().toISOString()
    };

    task.comments.push(newComment);
    task.updatedAt = new Date().toISOString();
    await saveRoomRecord(record);

    broadcastToRoom(roomId, {
      type: 'task:comment_added',
      taskId: task.id,
      comment: newComment,
      by: newComment.author
    });

    res.status(201).json({ success: true, task, comment: newComment });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to add comment', message: (err as Error).message });
  }
});

// 12. Backup Export (Full Room JSON)
app.get('/api/export', (req, res) => {
  const roomId = (req.query.room as string) || 'onedot-main';
  const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);

  const exportPayload = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    room: {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    },
    totalTasks: record.tasks.length,
    tasks: record.tasks
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="onedot-workspace-${roomId}.json"`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

// 13. Backup Import / Restore
app.post('/api/import', async (req, res) => {
  try {
    const { room, tasks, mode } = req.body;
    const roomId = room || 'onedot-main';
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Invalid tasks array in payload' });
    }

    const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
    if (mode === 'replace') {
      record.tasks = tasks;
    } else {
      // Merge mode: add non-duplicates
      const existingIds = new Set(record.tasks.map(t => t.id));
      tasks.forEach(t => {
        if (!existingIds.has(t.id)) {
          record.tasks.push(t);
        }
      });
    }

    await saveRoomRecord(record);

    broadcastToRoom(roomId, {
      type: 'tasks:synced',
      tasks: record.tasks,
      by: 'Import Tool'
    });
    broadcastWallpaperUpdate(roomId);

    res.json({ success: true, count: record.tasks.length });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to import tasks', message: (err as Error).message });
  }
});

// 14. Reset Room to Seed State
app.post('/api/reset', async (req, res) => {
  const roomId = (req.body.room as string) || 'onedot-main';
  const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);
  record.tasks = JSON.parse(JSON.stringify(defaultSeedTasks));
  await saveRoomRecord(record);
  
  broadcastToRoom(roomId, {
    type: 'tasks:synced',
    tasks: record.tasks,
    by: 'System'
  });
  broadcastWallpaperUpdate(roomId);

  res.json({ success: true, count: record.tasks.length });
});

// ==========================================
// REAL-TIME ANDROID WALLPAPER ENGINE (SVG)
// ==========================================
app.get('/api/wallpaper.svg', (req, res) => {
  const roomId = (req.query.room as string) || 'onedot-main';
  const ratio = (req.query.ratio as string) || '20:9';
  const theme = (req.query.theme as string) || 'oled';
  const record = getOrCreateRoomRecord(roomId, defaultSeedTasks);

  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const isLeapYear = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || (now.getFullYear() % 400 === 0);
  const totalDaysInYear = isLeapYear ? 366 : 365;
  const yearPct = ((dayOfYear / totalDaysInYear) * 100).toFixed(1);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dateStr = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}`;
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  // 4 active focus tasks + up to 3 most recently completed tasks in green light
  const activeTasks = record.tasks.filter(t => t.status !== 'done').slice(0, 4);
  const completedTasks = record.tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 3);
  const completedCount = record.tasks.filter(t => t.status === 'done').length;

  let width = 1080;
  let height = 2400;
  if (ratio === '16:9') {
    width = 1920;
    height = 1080;
  } else if (ratio === '19.5:9') {
    height = 2340;
  }

  let bgGradient = '<stop offset="0%" stop-color="#000000"/><stop offset="100%" stop-color="#050508"/>';
  if (theme === 'aurora') {
    bgGradient = '<stop offset="0%" stop-color="#021E17"/><stop offset="60%" stop-color="#000000"/><stop offset="100%" stop-color="#000000"/>';
  } else if (theme === 'cyberpunk') {
    bgGradient = '<stop offset="0%" stop-color="#240730"/><stop offset="60%" stop-color="#000000"/><stop offset="100%" stop-color="#000000"/>';
  } else if (theme === 'nordic') {
    bgGradient = '<stop offset="0%" stop-color="#111827"/><stop offset="60%" stop-color="#000000"/><stop offset="100%" stop-color="#000000"/>';
  }

  // Render 200 dots for year matrix
  let dotsSvg = '';
  const cols = 20;
  const dotSpacing = 24;
  const startX = 140;
  const startY = 820;

  const displayDotsCount = Math.min(totalDaysInYear, 200);
  for (let i = 0; i < displayDotsCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * dotSpacing;
    const cy = startY + row * dotSpacing;
    const isPassed = i < dayOfYear;
    const isToday = i === dayOfYear;

    const fill = isToday ? '#F97316' : (isPassed ? (i % 4 === 0 ? '#3B82F6' : '#94A3B8') : 'none');
    const stroke = isToday ? '#FB923C' : (isPassed ? '#475569' : '#272732');
    const r = isToday ? 6 : 4;
    const filterAttr = isToday ? 'filter="url(#glowOrange)" class="breathe-dot"' : '';

    dotsSvg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" ${filterAttr} />`;
  }

  // Active tasks in SVG
  let tasksSvg = '';
  const tasksStartY = 1380;
  const taskX = 140;
  let currentCardY = tasksStartY;

  activeTasks.forEach((task) => {
    let priorityColor = '#3B82F6';
    let filterAttr = '';
    let animClass = '';

    if (task.priority === 'urgent' || task.difficulty === 'hard') {
      priorityColor = '#EF4444';
      filterAttr = 'filter="url(#glowRed)"';
      animClass = 'class="breathe-dot"';
    } else if (task.priority === 'high' || task.difficulty === 'medium') {
      priorityColor = '#F97316';
      filterAttr = 'filter="url(#glowOrange)"';
      animClass = 'class="breathe-dot"';
    }

    const completedSubtasks = task.subtasks.filter(s => s.completed).length;
    const subtaskText = task.subtasks.length > 0 ? `(${completedSubtasks}/${task.subtasks.length})` : '';
    const safeTitle = task.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    tasksSvg += `
      <g transform="translate(${taskX}, ${currentCardY})">
        <rect x="0" y="0" width="800" height="88" rx="18" fill="#0E0E12" stroke="#1F1F28" stroke-width="1.5"/>
        <circle cx="36" cy="44" r="8" fill="${priorityColor}" ${filterAttr} ${animClass}/>
        <text x="65" y="52" fill="#F8FAFC" font-family="-apple-system, Roboto, sans-serif" font-size="28" font-weight="600">
          ${safeTitle.length > 34 ? safeTitle.slice(0, 34) + '...' : safeTitle}
        </text>
        ${subtaskText ? `
          <text x="760" y="52" text-anchor="end" fill="#94A3B8" font-family="monospace" font-size="22">
            ${subtaskText}
          </text>
        ` : ''}
      </g>
    `;
    currentCardY += 105;
  });

  if (activeTasks.length === 0) {
    tasksSvg += `
      <g transform="translate(${taskX}, ${currentCardY})">
        <text x="0" y="44" fill="#94A3B8" font-family="-apple-system, Roboto, sans-serif" font-size="26">
          All focus tasks clear for today! Enjoy the calm.
        </text>
      </g>
    `;
    currentCardY += 80;
  }

  // Render Completed Tasks in GREEN LIGHT
  let completedSvg = '';
  if (completedTasks.length > 0) {
    const compHeaderY = currentCardY + 20;
    completedSvg += `
      <g transform="translate(${taskX}, ${compHeaderY})">
        <text x="0" y="0" fill="#10B981" font-family="-apple-system, Roboto, sans-serif" font-size="22" font-weight="700" letter-spacing="1">
          RECENT COMPLETED (${completedTasks.length} SHOWN · GREEN LIGHT)
        </text>
      </g>
    `;

    completedTasks.forEach((cTask, idx) => {
      const cY = compHeaderY + 25 + idx * 95;
      const safeTitle = cTask.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const truncatedTitle = safeTitle.length > 32 ? safeTitle.slice(0, 32) + '...' : safeTitle;

      completedSvg += `
        <g transform="translate(${taskX}, ${cY})">
          <rect x="0" y="0" width="800" height="76" rx="16" fill="#09090D" stroke="#161620" stroke-width="1.2"/>
          <circle cx="34" cy="38" r="9" fill="#10B981" filter="url(#glowGreen)"/>
          <circle cx="34" cy="38" r="4.5" fill="#FFFFFF"/>
          <path d="M 28 38 L 32 42 L 40 33" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="65" y="46" fill="#64748B" font-family="-apple-system, Roboto, sans-serif" font-size="24" font-weight="500" text-decoration="line-through">
            ${truncatedTitle}
          </text>
          <text x="760" y="46" text-anchor="end" fill="#10B981" font-family="monospace" font-size="18" font-weight="600">
            DONE ✓
          </text>
        </g>
      `;
    });
  }

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      @keyframes breathe {
        0%, 100% { opacity: 0.85; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.15); }
      }
      .breathe-dot {
        transform-origin: center;
        animation: breathe 3s ease-in-out infinite;
      }
    </style>

    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      ${bgGradient}
    </linearGradient>
    <pattern id="dotGrid" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="0.8" fill="#1F1F28" fill-opacity="0.4" />
    </pattern>

    <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur1" />
      <feGaussianBlur stdDeviation="14" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="glowOrange" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="blur1" />
      <feGaussianBlur stdDeviation="12" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur1" />
      <feGaussianBlur stdDeviation="14" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#bgGrad)" />
  <rect width="100%" height="100%" fill="url(#dotGrid)" />

  <circle cx="${width / 2}" cy="58" r="16" fill="#000000" stroke="#1F1F28" stroke-width="1.5" />

  <text x="90" y="65" fill="#94A3B8" font-family="monospace" font-size="24" font-weight="600">${timeStr}</text>
  <text x="${width - 90}" y="65" text-anchor="end" fill="#94A3B8" font-family="-apple-system, Roboto, sans-serif" font-size="22">5G · 100%</text>

  <g transform="translate(140, 440)">
    <text x="0" y="0" fill="#FFFFFF" font-family="-apple-system, Roboto, sans-serif" font-size="160" font-weight="800" letter-spacing="-4">
      ${timeStr}
    </text>
    <text x="0" y="90" fill="#94A3B8" font-family="-apple-system, Roboto, sans-serif" font-size="36" font-weight="500">
      ${dateStr}
    </text>
    <text x="0" y="150" fill="#F97316" font-family="monospace" font-size="28" font-weight="600">
      Day ${dayOfYear} of ${totalDaysInYear} · ${yearPct}% Year Elapsed
    </text>
  </g>

  <g transform="translate(140, 760)">
    <text x="0" y="0" fill="#CBD5E1" font-family="-apple-system, Roboto, sans-serif" font-size="24" font-weight="700" letter-spacing="1">
      ONEDOT ANDROID YEAR MATRIX (${yearPct}%)
    </text>
  </g>
  ${dotsSvg}

  <g transform="translate(140, 1310)">
    <text x="0" y="0" fill="#CBD5E1" font-family="-apple-system, Roboto, sans-serif" font-size="24" font-weight="700" letter-spacing="1">
      TODAY'S ANDROID FOCUS (${activeTasks.length} OPEN · ${completedCount} DONE)
    </text>
  </g>
  ${tasksSvg}
  ${completedSvg}

  <rect x="${width / 2 - 120}" y="${height - 40}" width="240" height="6" rx="3" fill="#64748B" fill-opacity="0.6" />

  <g transform="translate(${width / 2}, ${height - 70})" text-anchor="middle">
    <text x="0" y="0" fill="#475569" font-family="monospace" font-size="20">
      OneDot Android Live Wallpaper · Green Light Completed Sync
    </text>
  </g>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.send(svgContent);
});

// SSE Wallpaper Stream Endpoint
app.get('/api/wallpaper/stream', (req, res) => {
  const roomId = (req.query.room as string) || 'onedot-main';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!wallpaperSseClients.has(roomId)) {
    wallpaperSseClients.set(roomId, new Set());
  }
  const clientSet = wallpaperSseClients.get(roomId)!;
  clientSet.add(res);

  res.write(`event: connected\ndata: ${JSON.stringify({ roomId, timestamp: Date.now() })}\n\n`);

  const heartbeatTimer = setInterval(() => {
    try {
      res.write(`event: clock-tick\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 60000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    clientSet.delete(res);
  });
});

// ==========================================
// GEMINI 3.8 FLASH AI ENDPOINTS
// ==========================================
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.post('/api/ai/parse-task', async (req, res) => {
  try {
    const { voiceTranscript } = req.body;
    if (!voiceTranscript || !voiceTranscript.trim()) {
      return res.status(400).json({ error: 'voiceTranscript is required' });
    }

    const prompt = `You are the OneDot Android task AI engine. Parse this spoken task request into a structured task with difficulty estimation:
"${voiceTranscript}"

Evaluate the difficulty as either 'easy' (15-30m, simple, quick win), 'medium' (1-3h, moderate effort), or 'hard' (complex, multi-step, critical focus).
Map difficulty to OneDot's Red-Orange-Blue system:
- 'hard' -> dotColor: 'red', priority: 'urgent'
- 'medium' -> dotColor: 'orange', priority: 'high'
- 'easy' -> dotColor: 'blue', priority: 'medium'

Break the task down into 2 to 4 actionable subtasks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Crisp imperative task title' },
            description: { type: Type.STRING, description: 'Helpful details and context' },
            difficulty: { type: Type.STRING, description: 'easy, medium, or hard' },
            estimatedMinutes: { type: Type.INTEGER, description: 'Estimated total minutes to complete' },
            priority: { type: Type.STRING, description: 'urgent, high, medium, or low' },
            dotColor: { type: Type.STRING, description: 'red, orange, or blue' },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: '1-3 tags' },
            dueDate: { type: Type.STRING, description: 'YYYY-MM-DD or empty if not mentioned' },
            subtasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: '2 to 4 actionable subtasks' }
          },
          required: ['title', 'difficulty', 'estimatedMinutes', 'priority', 'dotColor', 'tags', 'subtasks']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, task: parsed });
  } catch (err: unknown) {
    console.error('Error parsing voice task with Gemini:', err);
    res.status(500).json({ error: 'Failed to process voice task with AI', message: (err as Error).message });
  }
});

app.post('/api/ai/analyze-difficulty', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const prompt = `Analyze this task for OneDot Android:
Title: "${title}"
Description: "${description || 'None provided'}"

Determine if it is 'easy' (15-30m), 'medium' (1-3h), or 'hard' (complex, multi-step execution).
Recommend dot color:
- 'hard' -> 'red'
- 'medium' -> 'orange'
- 'easy' -> 'blue'

Provide an explanation reasoning and 3-5 subtask steps to execute it smoothly.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            difficulty: { type: Type.STRING, description: 'easy, medium, or hard' },
            estimatedMinutes: { type: Type.INTEGER, description: 'Estimated minutes' },
            reasoning: { type: Type.STRING, description: '1-2 sentence explanation of why this difficulty was assigned' },
            recommendedDotColor: { type: Type.STRING, description: 'red, orange, or blue' },
            suggestedSubtasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3-5 breakdown subtasks' }
          },
          required: ['difficulty', 'estimatedMinutes', 'reasoning', 'recommendedDotColor', 'suggestedSubtasks']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json({ success: true, assessment: result });
  } catch (err: unknown) {
    console.error('Error analyzing task difficulty with Gemini:', err);
    res.status(500).json({ error: 'Failed to analyze difficulty with AI', message: (err as Error).message });
  }
});

// ==========================================
// WEBSOCKET REAL-TIME SYNC & COLLABORATION
// ==========================================
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId = 'onedot-main';
  let peerId = '';

  ws.on('message', async (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const roomId = data.roomId || currentRoomId;

      switch (data.type) {
        case 'room:join': {
          currentRoomId = roomId;
          peerId = data.peer.id;

          const record = getOrCreateRoomRecord(currentRoomId, defaultSeedTasks);
          const sessions = getPeerSessions(currentRoomId);

          sessions.set(peerId, {
            ws,
            presence: {
              ...data.peer,
              lastSeen: Date.now()
            }
          });

          // Send initial state to the newcomer
          const peerList = Array.from(sessions.values())
            .filter(p => p.presence.id !== peerId)
            .map(p => p.presence);

          ws.send(JSON.stringify({
            type: 'init',
            tasks: record.tasks,
            peers: peerList,
            userCount: sessions.size
          }));

          // Broadcast peer joined to others in the room
          broadcastToRoom(currentRoomId, {
            type: 'peer:joined',
            peer: data.peer,
            userCount: sessions.size
          }, peerId);
          break;
        }

        case 'cursor:move': {
          const sessions = getPeerSessions(currentRoomId);
          const peerObj = sessions.get(peerId);
          if (peerObj) {
            peerObj.presence.cursor = data.cursor;
            peerObj.presence.lastSeen = Date.now();

            broadcastToRoom(currentRoomId, {
              type: 'peer:cursor',
              peerId,
              cursor: data.cursor
            }, peerId);
          }
          break;
        }

        case 'presence:update': {
          const sessions = getPeerSessions(currentRoomId);
          const peerObj = sessions.get(peerId);
          if (peerObj) {
            if (data.name) peerObj.presence.name = data.name;
            if (data.color) peerObj.presence.color = data.color;
            if (data.activeTaskId !== undefined) peerObj.presence.activeTaskId = data.activeTaskId;
            peerObj.presence.lastSeen = Date.now();

            broadcastToRoom(currentRoomId, {
              type: 'peer:updated',
              peer: peerObj.presence
            }, peerId);
          }
          break;
        }

        case 'task:create': {
          const record = getOrCreateRoomRecord(currentRoomId, defaultSeedTasks);
          const newTask: Task = {
            ...data.task,
            id: data.task.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          if (!record.tasks.some(t => t.id === newTask.id)) {
            record.tasks.unshift(newTask);
            await saveRoomRecord(record);

            broadcastToRoom(currentRoomId, {
              type: 'task:created',
              task: newTask,
              by: data.by || 'Someone'
            });
            broadcastWallpaperUpdate(currentRoomId);
          }
          break;
        }

        case 'task:update': {
          const record = getOrCreateRoomRecord(currentRoomId, defaultSeedTasks);
          const index = record.tasks.findIndex(t => t.id === data.task.id);
          if (index !== -1) {
            record.tasks[index] = {
              ...record.tasks[index],
              ...data.task,
              updatedAt: new Date().toISOString()
            };
            await saveRoomRecord(record);

            broadcastToRoom(currentRoomId, {
              type: 'task:updated',
              task: record.tasks[index],
              by: data.by || 'Someone'
            });
            broadcastWallpaperUpdate(currentRoomId);
          }
          break;
        }

        case 'task:move': {
          const record = getOrCreateRoomRecord(currentRoomId, defaultSeedTasks);
          const { taskId, newStatus, newUrgency, newImportance } = data;
          const task = record.tasks.find(t => t.id === taskId);
          if (task) {
            if (newStatus) task.status = newStatus;
            if (typeof newUrgency === 'boolean') task.urgency = newUrgency;
            if (typeof newImportance === 'boolean') task.importance = newImportance;
            task.updatedAt = new Date().toISOString();
            await saveRoomRecord(record);

            broadcastToRoom(currentRoomId, {
              type: 'task:moved',
              taskId,
              status: task.status,
              urgency: task.urgency,
              importance: task.importance,
              by: data.by || 'Someone'
            });
            broadcastWallpaperUpdate(currentRoomId);
          }
          break;
        }

        case 'task:delete': {
          const record = getOrCreateRoomRecord(currentRoomId, defaultSeedTasks);
          const initialLength = record.tasks.length;
          record.tasks = record.tasks.filter(t => t.id !== data.taskId);

          if (record.tasks.length !== initialLength) {
            await saveRoomRecord(record);

            broadcastToRoom(currentRoomId, {
              type: 'task:deleted',
              taskId: data.taskId,
              by: data.by || 'Someone'
            });
            broadcastWallpaperUpdate(currentRoomId);
          }
          break;
        }

        case 'task:subtask_toggle': {
          const record = getOrCreateRoomRecord(currentRoomId, defaultSeedTasks);
          const task = record.tasks.find(t => t.id === data.taskId);
          if (task) {
            const sub = task.subtasks.find(s => s.id === data.subtaskId);
            if (sub) {
              sub.completed = !sub.completed;
              task.updatedAt = new Date().toISOString();
              await saveRoomRecord(record);

              broadcastToRoom(currentRoomId, {
                type: 'task:subtask_toggled',
                taskId: task.id,
                subtaskId: sub.id,
                completed: sub.completed,
                by: data.by || 'Someone'
              });
              broadcastWallpaperUpdate(currentRoomId);
            }
          }
          break;
        }

        case 'task:comment': {
          const record = getOrCreateRoomRecord(currentRoomId, defaultSeedTasks);
          const task = record.tasks.find(t => t.id === data.taskId);
          if (task) {
            const newComment: TaskComment = {
              id: `c-${Date.now()}`,
              author: data.comment.author || 'Anonymous',
              avatarColor: data.comment.avatarColor || '#4F46E5',
              text: data.comment.text,
              createdAt: new Date().toISOString()
            };
            task.comments.push(newComment);
            task.updatedAt = new Date().toISOString();
            await saveRoomRecord(record);

            broadcastToRoom(currentRoomId, {
              type: 'task:comment_added',
              taskId: task.id,
              comment: newComment,
              by: newComment.author
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && peerId) {
      const sessions = peerSessions.get(currentRoomId);
      if (sessions) {
        sessions.delete(peerId);
        broadcastToRoom(currentRoomId, {
          type: 'peer:left',
          peerId,
          userCount: sessions.size
        });
      }
    }
  });
});

// Vite Middleware in Dev or Static Files in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`OneDot Task Workspace running on http://0.0.0.0:${port}`);
  });
}

startServer();
