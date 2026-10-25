import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer(app);

app.use(express.json());

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  avatarColor: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  urgency: boolean;     // Urgent axis (Eisenhower Matrix)
  importance: boolean;  // Important axis (Eisenhower Matrix)
  tags: string[];
  dueDate: string | null;
  subtasks: Subtask[];
  comments: TaskComment[];
  assignee: { name: string; avatarColor: string } | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedMinutes?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

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
    createdBy: 'System',
    createdAt: '2026-10-24T17:00:00Z',
    updatedAt: '2026-10-25T00:40:00Z'
  }
];

// Room-based state storage
const rooms = new Map<string, {
  tasks: Task[];
  peers: Map<string, { ws: WebSocket; presence: PeerPresence }>;
}>();

function getOrCreateRoom(roomId: string) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      tasks: JSON.parse(JSON.stringify(defaultSeedTasks)),
      peers: new Map()
    });
  }
  return rooms.get(roomId)!;
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  let totalPeers = 0;
  rooms.forEach(r => totalPeers += r.peers.size);
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    roomsCount: rooms.size,
    totalPeers
  });
});

app.get('/api/tasks', (req, res) => {
  const roomId = (req.query.room as string) || 'onedot-main';
  const room = getOrCreateRoom(roomId);
  res.json({ tasks: room.tasks });
});

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

// Dynamic real-time vector wallpaper endpoint for Android Tasker, MacroDroid, and lock screen feeds
app.get('/api/wallpaper.svg', (req, res) => {
  const roomId = (req.query.room as string) || 'onedot-main';
  const ratio = (req.query.ratio as string) || '20:9';
  const theme = (req.query.theme as string) || 'oled';
  const room = getOrCreateRoom(roomId);

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
  const activeTasks = room.tasks.filter(t => t.status !== 'done').slice(0, 4);
  const completedTasks = room.tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 3);
  const completedCount = room.tasks.filter(t => t.status === 'done').length;

  // Android standard 20:9 (1080x2400) or 19.5:9 (1080x2340) or Tablet (1920x1080)
  let width = 1080;
  let height = 2400;
  if (ratio === '16:9') {
    width = 1920;
    height = 1080;
  } else if (ratio === '19.5:9') {
    height = 2340;
  }

  // Pure Black OLED Theme definitions
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

  // Render active task items in SVG
  let tasksSvg = '';
  const tasksStartY = 1380;
  const taskX = 140;
  let currentCardY = tasksStartY;

  activeTasks.forEach((task) => {
    let priorityColor = '#3B82F6'; // Blue
    let filterAttr = '';
    let animClass = '';

    if (task.priority === 'urgent' || task.difficulty === 'hard') {
      priorityColor = '#EF4444'; // Red
      filterAttr = 'filter="url(#glowRed)"';
      animClass = 'class="breathe-dot"';
    } else if (task.priority === 'high' || task.difficulty === 'medium') {
      priorityColor = '#F97316'; // Orange
      filterAttr = 'filter="url(#glowOrange)"';
      animClass = 'class="breathe-dot"';
    }

    const completedSubtasks = task.subtasks.filter(s => s.completed).length;
    const subtaskText = task.subtasks.length > 0 ? `(${completedSubtasks}/${task.subtasks.length})` : '';
    const safeTitle = task.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    tasksSvg += `
      <g transform="translate(${taskX}, ${currentCardY})">
        <!-- OLED Card Background -->
        <rect x="0" y="0" width="800" height="88" rx="18" fill="#0E0E12" stroke="#1F1F28" stroke-width="1.5"/>
        <!-- Active Dot with Breathing Glow for Red & Orange -->
        <circle cx="36" cy="44" r="8" fill="${priorityColor}" ${filterAttr} ${animClass}/>
        <!-- Title -->
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
      <!-- Completed Tasks Section in Glowing Green Light -->
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
          <!-- OLED Dimmed Card Background -->
          <rect x="0" y="0" width="800" height="76" rx="16" fill="#09090D" stroke="#161620" stroke-width="1.2"/>
          
          <!-- Glowing Green Light Dot (#10B981) -->
          <circle cx="34" cy="38" r="9" fill="#10B981" filter="url(#glowGreen)"/>
          <circle cx="34" cy="38" r="4.5" fill="#FFFFFF"/>
          
          <!-- Green Light Checkmark Badge -->
          <path d="M 28 38 L 32 42 L 40 33" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          
          <!-- Dimmed Line-Through Title -->
          <text x="65" y="46" fill="#64748B" font-family="-apple-system, Roboto, sans-serif" font-size="24" font-weight="500" text-decoration="line-through">
            ${truncatedTitle}
          </text>
          
          <!-- Completed status tag -->
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

    <!-- Green Light Glow Filter for Completed Tasks -->
    <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur1" />
      <feGaussianBlur stdDeviation="14" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Orange Glow Filter for Active Focus Tasks -->
    <filter id="glowOrange" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="blur1" />
      <feGaussianBlur stdDeviation="12" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Red Glow Filter for Urgent Tasks -->
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

  <!-- OLED Black Background Layer -->
  <rect width="100%" height="100%" fill="url(#bgGrad)" />
  <rect width="100%" height="100%" fill="url(#dotGrid)" />

  <!-- Android Centered Punch-Hole Camera Clearance -->
  <circle cx="${width / 2}" cy="58" r="16" fill="#000000" stroke="#1F1F28" stroke-width="1.5" />

  <!-- Android System Status Bar Area (Top Left & Right) -->
  <text x="90" y="65" fill="#94A3B8" font-family="monospace" font-size="24" font-weight="600">${timeStr}</text>
  <text x="${width - 90}" y="65" text-anchor="end" fill="#94A3B8" font-family="-apple-system, Roboto, sans-serif" font-size="22">5G · 100%</text>

  <!-- Android Lock Screen Clock & Date Header -->
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

  <!-- Year Progress Section -->
  <g transform="translate(140, 760)">
    <text x="0" y="0" fill="#CBD5E1" font-family="-apple-system, Roboto, sans-serif" font-size="24" font-weight="700" letter-spacing="1">
      ONEDOT ANDROID YEAR MATRIX (${yearPct}%)
    </text>
  </g>
  ${dotsSvg}

  <!-- Tasks Header -->
  <g transform="translate(140, 1310)">
    <text x="0" y="0" fill="#CBD5E1" font-family="-apple-system, Roboto, sans-serif" font-size="24" font-weight="700" letter-spacing="1">
      TODAY'S ANDROID FOCUS (${activeTasks.length} OPEN · ${completedCount} DONE)
    </text>
  </g>
  ${tasksSvg}
  ${completedSvg}

  <!-- Android Gesture Pill Navigation Bar Clearance -->
  <rect x="${width / 2 - 120}" y="${height - 40}" width="240" height="6" rx="3" fill="#64748B" fill-opacity="0.6" />

  <!-- Footer Watermark -->
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

// Server-Sent Events (SSE) stream for instant real-time live wallpaper sync
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

  // Send initial event
  res.write(`event: connected\ndata: ${JSON.stringify({ roomId, timestamp: Date.now() })}\n\n`);

  // Heartbeat / clock tick every 60 seconds
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

app.post('/api/reset', (req, res) => {
  const roomId = (req.body.room as string) || 'onedot-main';
  const room = getOrCreateRoom(roomId);
  room.tasks = JSON.parse(JSON.stringify(defaultSeedTasks));
  
  // Broadcast reset to all clients in the room
  const payload = JSON.stringify({
    type: 'tasks:synced',
    tasks: room.tasks,
    by: 'System'
  });
  room.peers.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });

  broadcastWallpaperUpdate(roomId);

  res.json({ success: true, count: room.tasks.length });
});

// Gemini AI Client Configuration
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI Voice & Natural Language Task Parser (Gemini 3.8 Flash)
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

// AI Task Difficulty & Subtask Analyzer (Gemini 3.8 Flash)
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

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId = 'onedot-main';
  let peerId = '';

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const room = getOrCreateRoom(data.roomId || currentRoomId);

      switch (data.type) {
        case 'room:join': {
          currentRoomId = data.roomId || 'onedot-main';
          peerId = data.peer.id;

          const activeRoom = getOrCreateRoom(currentRoomId);
          activeRoom.peers.set(peerId, {
            ws,
            presence: {
              ...data.peer,
              lastSeen: Date.now()
            }
          });

          // Send initial state to the newcomer
          const peerList = Array.from(activeRoom.peers.values())
            .filter(p => p.presence.id !== peerId)
            .map(p => p.presence);

          ws.send(JSON.stringify({
            type: 'init',
            tasks: activeRoom.tasks,
            peers: peerList,
            userCount: activeRoom.peers.size
          }));

          // Broadcast peer joined to others in the room
          const joinMsg = JSON.stringify({
            type: 'peer:joined',
            peer: data.peer,
            userCount: activeRoom.peers.size
          });

          activeRoom.peers.forEach((peerObj, pId) => {
            if (pId !== peerId && peerObj.ws.readyState === WebSocket.OPEN) {
              peerObj.ws.send(joinMsg);
            }
          });
          break;
        }

        case 'cursor:move': {
          const activeRoom = getOrCreateRoom(currentRoomId);
          const peerObj = activeRoom.peers.get(peerId);
          if (peerObj) {
            peerObj.presence.cursor = data.cursor;
            peerObj.presence.lastSeen = Date.now();

            const cursorMsg = JSON.stringify({
              type: 'peer:cursor',
              peerId,
              cursor: data.cursor
            });

            activeRoom.peers.forEach((p, pId) => {
              if (pId !== peerId && p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(cursorMsg);
              }
            });
          }
          break;
        }

        case 'presence:update': {
          const activeRoom = getOrCreateRoom(currentRoomId);
          const peerObj = activeRoom.peers.get(peerId);
          if (peerObj) {
            if (data.name) peerObj.presence.name = data.name;
            if (data.color) peerObj.presence.color = data.color;
            if (data.activeTaskId !== undefined) peerObj.presence.activeTaskId = data.activeTaskId;
            peerObj.presence.lastSeen = Date.now();

            const updateMsg = JSON.stringify({
              type: 'peer:updated',
              peer: peerObj.presence
            });

            activeRoom.peers.forEach((p, pId) => {
              if (pId !== peerId && p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(updateMsg);
              }
            });
          }
          break;
        }

        case 'task:create': {
          const activeRoom = getOrCreateRoom(currentRoomId);
          const newTask: Task = {
            ...data.task,
            id: data.task.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Idempotency: verify task doesn't already exist
          if (!activeRoom.tasks.some(t => t.id === newTask.id)) {
            activeRoom.tasks.unshift(newTask);

            const broadcastMsg = JSON.stringify({
              type: 'task:created',
              task: newTask,
              by: data.by || 'Someone'
            });

            activeRoom.peers.forEach(p => {
              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(broadcastMsg);
              }
            });
            broadcastWallpaperUpdate(currentRoomId);
          }
          break;
        }

        case 'task:update': {
          const activeRoom = getOrCreateRoom(currentRoomId);
          const index = activeRoom.tasks.findIndex(t => t.id === data.task.id);
          if (index !== -1) {
            activeRoom.tasks[index] = {
              ...activeRoom.tasks[index],
              ...data.task,
              updatedAt: new Date().toISOString()
            };

            const broadcastMsg = JSON.stringify({
              type: 'task:updated',
              task: activeRoom.tasks[index],
              by: data.by || 'Someone'
            });

            activeRoom.peers.forEach(p => {
              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(broadcastMsg);
              }
            });
            broadcastWallpaperUpdate(currentRoomId);
          }
          break;
        }

        case 'task:move': {
          const activeRoom = getOrCreateRoom(currentRoomId);
          const { taskId, newStatus, newUrgency, newImportance } = data;
          const task = activeRoom.tasks.find(t => t.id === taskId);
          if (task) {
            if (newStatus) task.status = newStatus;
            if (typeof newUrgency === 'boolean') task.urgency = newUrgency;
            if (typeof newImportance === 'boolean') task.importance = newImportance;
            task.updatedAt = new Date().toISOString();

            const broadcastMsg = JSON.stringify({
              type: 'task:moved',
              taskId,
              status: task.status,
              urgency: task.urgency,
              importance: task.importance,
              by: data.by || 'Someone'
            });

            activeRoom.peers.forEach(p => {
              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(broadcastMsg);
              }
            });
            broadcastWallpaperUpdate(currentRoomId);
          }
          break;
        }

        case 'task:delete': {
          const activeRoom = getOrCreateRoom(currentRoomId);
          const initialLength = activeRoom.tasks.length;
          activeRoom.tasks = activeRoom.tasks.filter(t => t.id !== data.taskId);

          if (activeRoom.tasks.length !== initialLength) {
            const broadcastMsg = JSON.stringify({
              type: 'task:deleted',
              taskId: data.taskId,
              by: data.by || 'Someone'
            });

            activeRoom.peers.forEach(p => {
              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(broadcastMsg);
              }
            });
            broadcastWallpaperUpdate(currentRoomId);
          }
          break;
        }

        case 'task:subtask_toggle': {
          const activeRoom = getOrCreateRoom(currentRoomId);
          const task = activeRoom.tasks.find(t => t.id === data.taskId);
          if (task) {
            const sub = task.subtasks.find(s => s.id === data.subtaskId);
            if (sub) {
              sub.completed = !sub.completed;
              task.updatedAt = new Date().toISOString();

              const broadcastMsg = JSON.stringify({
                type: 'task:subtask_toggled',
                taskId: task.id,
                subtaskId: sub.id,
                completed: sub.completed,
                by: data.by || 'Someone'
              });

              activeRoom.peers.forEach(p => {
                if (p.ws.readyState === WebSocket.OPEN) {
                  p.ws.send(broadcastMsg);
                }
              });
              broadcastWallpaperUpdate(currentRoomId);
            }
          }
          break;
        }

        case 'task:comment': {
          const activeRoom = getOrCreateRoom(currentRoomId);
          const task = activeRoom.tasks.find(t => t.id === data.taskId);
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

            const broadcastMsg = JSON.stringify({
              type: 'task:comment_added',
              taskId: task.id,
              comment: newComment,
              by: newComment.author
            });

            activeRoom.peers.forEach(p => {
              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(broadcastMsg);
              }
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
      const activeRoom = rooms.get(currentRoomId);
      if (activeRoom) {
        activeRoom.peers.delete(peerId);
        const leaveMsg = JSON.stringify({
          type: 'peer:left',
          peerId,
          userCount: activeRoom.peers.size
        });
        activeRoom.peers.forEach(p => {
          if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(leaveMsg);
          }
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
