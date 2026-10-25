export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

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
  status: TaskStatus;
  priority: TaskPriority;
  urgency: boolean;     // Urgent axis (Eisenhower Matrix)
  importance: boolean;  // Important axis (Eisenhower Matrix)
  tags: string[];
  dueDate: string | null;
  subtasks: Subtask[];
  comments: TaskComment[];
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedMinutes?: number;
  assignee: { name: string; avatarColor: string } | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export interface AIDifficultyAssessment {
  difficulty: TaskDifficulty;
  estimatedMinutes: number;
  reasoning: string;
  recommendedDotColor: 'red' | 'orange' | 'blue';
  suggestedSubtasks: string[];
}

export interface PeerPresence {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  activeTaskId: string | null;
  lastSeen: number;
}

export type ViewMode = 'kanban' | 'list' | 'matrix' | 'focus' | 'wallpaper' | 'ambient';

export interface WallpaperConfig {
  format: 'mobile' | 'desktop';
  presetTheme: 'obsidian' | 'aurora' | 'cyberpunk' | 'nordic' | 'custom';
  customImageDataUrl: string | null;
  dimOpacity: number; // 0 to 0.8
  blurAmount: number; // 0 to 20
  showYearProgress: boolean;
  showMonthProgress: boolean;
  showTasks: boolean;
  quoteOrGoal: string;
}

export interface ActivityNotification {
  id: string;
  message: string;
  by: string;
  timestamp: number;
  type?: 'create' | 'update' | 'delete' | 'move' | 'join' | 'subtask';
}
