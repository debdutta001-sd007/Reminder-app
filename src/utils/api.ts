import { Task, TaskStatus, TaskPriority, TaskDifficulty, Subtask } from '../types.ts';

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

export interface HealthCheckResponse {
  status: string;
  uptime: number;
  database: {
    type: string;
    status: string;
    roomsCount: number;
    totalStoredTasks: number;
  };
  activePeers: number;
}

// RESTful Fullstack API Client
export const api = {
  // Database Health & System Info
  async checkHealth(): Promise<HealthCheckResponse> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Rooms CRUD
  async getRooms(): Promise<RoomSummary[]> {
    const res = await fetch('/api/rooms');
    if (!res.ok) throw new Error('Failed to load rooms');
    const data = await res.json();
    return data.rooms || [];
  },

  async createRoom(roomId: string, name?: string): Promise<{ success: boolean; room: RoomSummary }> {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, name })
    });
    if (!res.ok) throw new Error('Failed to create room');
    return res.json();
  },

  async getRoomStats(roomId: string): Promise<RoomStats> {
    const res = await fetch(`/api/stats?room=${encodeURIComponent(roomId)}`);
    if (!res.ok) throw new Error('Failed to fetch workspace stats');
    const data = await res.json();
    return data.stats;
  },

  // Tasks Query & CRUD
  async getTasks(roomId: string, filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    difficulty?: TaskDifficulty;
    search?: string;
  }): Promise<Task[]> {
    const params = new URLSearchParams({ room: roomId });
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.difficulty) params.set('difficulty', filters.difficulty);
    if (filters?.search) params.set('search', filters.search);

    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch tasks from server');
    const data = await res.json();
    return data.tasks || [];
  },

  async createTask(roomId: string, task: Partial<Task>, by: string = 'User'): Promise<Task> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomId, task, by })
    });
    if (!res.ok) throw new Error('Failed to persist task to database');
    const data = await res.json();
    return data.task;
  },

  async updateTask(roomId: string, task: Task, by: string = 'User'): Promise<Task> {
    const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomId, task, by })
    });
    if (!res.ok) throw new Error('Failed to update task');
    const data = await res.json();
    return data.task;
  },

  async moveTask(roomId: string, taskId: string, updates: {
    status?: TaskStatus;
    urgency?: boolean;
    importance?: boolean;
  }, by: string = 'User'): Promise<Task> {
    const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomId, ...updates, by })
    });
    if (!res.ok) throw new Error('Failed to move task');
    const data = await res.json();
    return data.task;
  },

  async deleteTask(roomId: string, taskId: string, by: string = 'User'): Promise<boolean> {
    const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}?room=${encodeURIComponent(roomId)}&by=${encodeURIComponent(by)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return true;
  },

  async toggleSubtask(roomId: string, taskId: string, subtaskId: string, by: string = 'User'): Promise<{ completed: boolean }> {
    const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomId, by })
    });
    if (!res.ok) throw new Error('Failed to toggle subtask');
    return res.json();
  },

  async addComment(roomId: string, taskId: string, text: string, author: string, avatarColor: string): Promise<Task> {
    const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: roomId,
        comment: { text, author, avatarColor }
      })
    });
    if (!res.ok) throw new Error('Failed to add comment');
    const data = await res.json();
    return data.task;
  },

  // Export / Import / Backup
  async exportRoom(roomId: string): Promise<Blob> {
    const res = await fetch(`/api/export?room=${encodeURIComponent(roomId)}`);
    if (!res.ok) throw new Error('Failed to export workspace');
    return res.blob();
  },

  async importRoom(roomId: string, tasks: Task[], mode: 'replace' | 'merge' = 'merge'): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomId, tasks, mode })
    });
    if (!res.ok) throw new Error('Failed to import tasks');
    return res.json();
  },

  async resetWorkspace(roomId: string): Promise<boolean> {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomId })
    });
    if (!res.ok) throw new Error('Failed to reset workspace');
    return true;
  }
};
