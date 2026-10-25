import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export interface RoomRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
}

export interface RoomSummary {
  id: string;
  name: string;
  taskCount: number;
  activeCount: number;
  completedCount: number;
  urgentCount: number;
  updatedAt: string;
}

export interface RoomStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  backlogTasks: number;
  reviewTasks: number;
  completionRate: number;
  urgentCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
    unassigned: number;
  };
  totalEstimatedMinutes: number;
  completedEstimatedMinutes: number;
  tagCounts: Record<string, number>;
}

const DATA_DIR = path.resolve(__dirname, '../data');
const ROOMS_DIR = path.resolve(DATA_DIR, 'rooms');

// In-memory cache for fast sub-millisecond access
const memoryCache = new Map<string, RoomRecord>();

// Ensure storage directories exist
export function initStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ROOMS_DIR)) {
      fs.mkdirSync(ROOMS_DIR, { recursive: true });
    }
    console.log(`[Storage] Persistent fullstack database initialized at: ${ROOMS_DIR}`);
  } catch (err) {
    console.error('[Storage] Error initializing storage directories:', err);
  }
}

function getRoomFilePath(roomId: string): string {
  // Sanitize room ID to avoid path traversal
  const safeRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.resolve(ROOMS_DIR, `${safeRoomId}.json`);
}

// Atomic file write using temporary file + rename to avoid corrupt writes
async function persistRoomToDisk(record: RoomRecord): Promise<void> {
  const filePath = getRoomFilePath(record.id);
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  try {
    const data = JSON.stringify(record, null, 2);
    await fs.promises.writeFile(tempPath, data, 'utf8');
    await fs.promises.rename(tempPath, filePath);
  } catch (err) {
    console.error(`[Storage] Failed to persist room ${record.id} to disk:`, err);
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch {
      // ignore temp cleanup error
    }
  }
}

// Synchronous disk loader for cold starts
function loadRoomFromDisk(roomId: string): RoomRecord | null {
  const filePath = getRoomFilePath(roomId);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content) as RoomRecord;
      if (parsed && Array.isArray(parsed.tasks)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error(`[Storage] Error reading room ${roomId} from disk:`, err);
  }
  return null;
}

export function getOrCreateRoomRecord(roomId: string, defaultTasks: Task[] = []): RoomRecord {
  // Check memory cache
  if (memoryCache.has(roomId)) {
    return memoryCache.get(roomId)!;
  }

  // Check disk
  const onDisk = loadRoomFromDisk(roomId);
  if (onDisk) {
    memoryCache.set(roomId, onDisk);
    return onDisk;
  }

  // Create new room record
  const newRecord: RoomRecord = {
    id: roomId,
    name: roomId === 'onedot-main' ? 'Main Android Workspace' : `Workspace ${roomId}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: JSON.parse(JSON.stringify(defaultTasks))
  };

  memoryCache.set(roomId, newRecord);
  // Persist to disk in background
  persistRoomToDisk(newRecord).catch(err => {
    console.error(`[Storage] Initial room save failed for ${roomId}:`, err);
  });

  return newRecord;
}

export function listAllRooms(): RoomSummary[] {
  initStorage();
  const roomsMap = new Map<string, RoomSummary>();

  // 1. Scan memory cache
  memoryCache.forEach(record => {
    const activeCount = record.tasks.filter(t => t.status !== 'done').length;
    const completedCount = record.tasks.filter(t => t.status === 'done').length;
    const urgentCount = record.tasks.filter(t => (t.priority === 'urgent' || t.urgency || t.difficulty === 'hard') && t.status !== 'done').length;
    roomsMap.set(record.id, {
      id: record.id,
      name: record.name,
      taskCount: record.tasks.length,
      activeCount,
      completedCount,
      urgentCount,
      updatedAt: record.updatedAt
    });
  });

  // 2. Scan disk files for any rooms not loaded in memory yet
  try {
    if (fs.existsSync(ROOMS_DIR)) {
      const files = fs.readdirSync(ROOMS_DIR);
      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('.tmp')) {
          const roomId = file.slice(0, -5);
          if (!roomsMap.has(roomId)) {
            const diskRecord = loadRoomFromDisk(roomId);
            if (diskRecord) {
              const activeCount = diskRecord.tasks.filter(t => t.status !== 'done').length;
              const completedCount = diskRecord.tasks.filter(t => t.status === 'done').length;
              const urgentCount = diskRecord.tasks.filter(t => (t.priority === 'urgent' || t.urgency || t.difficulty === 'hard') && t.status !== 'done').length;
              roomsMap.set(roomId, {
                id: diskRecord.id,
                name: diskRecord.name,
                taskCount: diskRecord.tasks.length,
                activeCount,
                completedCount,
                urgentCount,
                updatedAt: diskRecord.updatedAt
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Storage] Error scanning rooms directory:', err);
  }

  return Array.from(roomsMap.values()).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function createRoomRecord(roomId: string, name?: string, seedTasks: Task[] = []): Promise<RoomRecord> {
  const safeId = roomId.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '-');
  const record: RoomRecord = {
    id: safeId,
    name: name?.trim() || `Workspace ${safeId}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: JSON.parse(JSON.stringify(seedTasks))
  };

  memoryCache.set(safeId, record);
  await persistRoomToDisk(record);
  return record;
}

export async function saveRoomRecord(record: RoomRecord): Promise<void> {
  record.updatedAt = new Date().toISOString();
  memoryCache.set(record.id, record);
  await persistRoomToDisk(record);
}

export function calculateRoomStats(tasks: Task[]): RoomStats {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const backlogTasks = tasks.filter(t => t.status === 'backlog').length;
  const reviewTasks = tasks.filter(t => t.status === 'review').length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const urgentCount = tasks.filter(t => (t.priority === 'urgent' || t.urgency || t.difficulty === 'hard') && t.status !== 'done').length;
  const highCount = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
  const mediumCount = tasks.filter(t => t.priority === 'medium' && t.status !== 'done').length;
  const lowCount = tasks.filter(t => t.priority === 'low' && t.status !== 'done').length;

  const difficultyBreakdown = {
    easy: 0,
    medium: 0,
    hard: 0,
    unassigned: 0
  };

  let totalEstimatedMinutes = 0;
  let completedEstimatedMinutes = 0;
  const tagCounts: Record<string, number> = {};

  tasks.forEach(task => {
    if (task.difficulty === 'easy') difficultyBreakdown.easy++;
    else if (task.difficulty === 'medium') difficultyBreakdown.medium++;
    else if (task.difficulty === 'hard') difficultyBreakdown.hard++;
    else difficultyBreakdown.unassigned++;

    const est = task.estimatedMinutes || (task.difficulty === 'hard' ? 180 : task.difficulty === 'medium' ? 60 : 30);
    totalEstimatedMinutes += est;
    if (task.status === 'done') {
      completedEstimatedMinutes += est;
    }

    if (Array.isArray(task.tags)) {
      task.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    backlogTasks,
    reviewTasks,
    completionRate,
    urgentCount,
    highCount,
    mediumCount,
    lowCount,
    difficultyBreakdown,
    totalEstimatedMinutes,
    completedEstimatedMinutes,
    tagCounts
  };
}
