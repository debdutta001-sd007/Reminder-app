import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Task, Subtask, PeerPresence, ActivityNotification, TaskStatus, TaskPriority, TaskDifficulty } from '../types.ts';
import { sound } from '../utils/audio.ts';

interface WorkspaceContextType {
  tasks: Task[];
  peers: PeerPresence[];
  currentUser: { id: string; name: string; color: string };
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  roomId: string;
  userCount: number;
  notifications: ActivityNotification[];
  selectedTaskId: string | null;
  createTask: (taskData: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    difficulty?: TaskDifficulty;
    estimatedMinutes?: number;
    urgency?: boolean;
    importance?: boolean;
    tags?: string[];
    dueDate?: string | null;
    subtasks?: Subtask[];
  }) => void;
  updateTask: (task: Task) => void;
  moveTask: (taskId: string, newStatus?: TaskStatus, newUrgency?: boolean, newImportance?: boolean) => void;
  deleteTask: (taskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addComment: (taskId: string, text: string) => void;
  updateProfile: (name: string, color: string) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  changeRoom: (newRoomId: string) => void;
  resetWorkspace: () => Promise<void>;
  dismissNotification: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

const DEFAULT_COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Crimson
  '#9333EA', // Purple
  '#0284C7', // Sky
  '#DB2777', // Pink
];

const DEFAULT_NAMES = [
  'Debdutta', 'Alex M.', 'Sarah C.', 'Jordan T.', 'Elena R.', 'Marcus V.', 'Taylor K.'
];

function getInitialUser() {
  if (typeof window === 'undefined') {
    return { id: 'user-default', name: 'Collaborator', color: DEFAULT_COLORS[0] };
  }
  const saved = localStorage.getItem('onedot_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  const randomName = DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
  const randomColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  const newUser = {
    id: `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    name: randomName,
    color: randomColor
  };
  localStorage.setItem('onedot_user', JSON.stringify(newUser));
  return newUser;
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getInitialUser);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [userCount, setUserCount] = useState<number>(1);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [selectedTaskId, setSelectedTaskIdState] = useState<string | null>(null);

  // Parse room from URL query or default
  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || 'onedot-main';
    }
    return 'onedot-main';
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const lastCursorEmitRef = useRef<number>(0);

  const addNotification = useCallback((message: string, by: string, type?: ActivityNotification['type']) => {
    const notif: ActivityNotification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      message,
      by,
      timestamp: Date.now(),
      type
    };
    setNotifications(prev => [notif, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 4500);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const sendWs = useCallback((payload: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // Connect WebSocket
  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setConnectionStatus('connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isMounted) return;
          setConnectionStatus('connected');
          // Join room
          socket.send(JSON.stringify({
            type: 'room:join',
            roomId,
            peer: {
              id: currentUser.id,
              name: currentUser.name,
              color: currentUser.color,
              cursor: null,
              activeTaskId: selectedTaskId
            }
          }));
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case 'init': {
                setTasks(data.tasks || []);
                setPeers(data.peers || []);
                setUserCount(data.userCount || 1);
                break;
              }

              case 'peer:joined': {
                setPeers(prev => {
                  const filtered = prev.filter(p => p.id !== data.peer.id);
                  return [...filtered, data.peer];
                });
                if (data.userCount) setUserCount(data.userCount);
                addNotification(`${data.peer.name} joined the room`, data.peer.name, 'join');
                break;
              }

              case 'peer:left': {
                setPeers(prev => prev.filter(p => p.id !== data.peerId));
                if (data.userCount) setUserCount(data.userCount);
                break;
              }

              case 'peer:cursor': {
                setPeers(prev => prev.map(p => {
                  if (p.id === data.peerId) {
                    return { ...p, cursor: data.cursor, lastSeen: Date.now() };
                  }
                  return p;
                }));
                break;
              }

              case 'peer:updated': {
                setPeers(prev => prev.map(p => {
                  if (p.id === data.peer.id) {
                    return { ...p, ...data.peer };
                  }
                  return p;
                }));
                break;
              }

              case 'task:created': {
                setTasks(prev => {
                  if (prev.some(t => t.id === data.task.id)) return prev;
                  return [data.task, ...prev];
                });
                addNotification(`${data.by} created task "${data.task.title}"`, data.by, 'create');
                break;
              }

              case 'task:updated': {
                setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
                break;
              }

              case 'task:moved': {
                setTasks(prev => prev.map(t => {
                  if (t.id === data.taskId) {
                    return {
                      ...t,
                      status: data.status || t.status,
                      urgency: typeof data.urgency === 'boolean' ? data.urgency : t.urgency,
                      importance: typeof data.importance === 'boolean' ? data.importance : t.importance,
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return t;
                }));
                addNotification(`${data.by} moved task status`, data.by, 'move');
                break;
              }

              case 'task:deleted': {
                setTasks(prev => prev.filter(t => t.id !== data.taskId));
                addNotification(`${data.by} deleted a task`, data.by, 'delete');
                break;
              }

              case 'task:subtask_toggled': {
                setTasks(prev => prev.map(t => {
                  if (t.id === data.taskId) {
                    return {
                      ...t,
                      subtasks: t.subtasks.map(s => s.id === data.subtaskId ? { ...s, completed: data.completed } : s)
                    };
                  }
                  return t;
                }));
                break;
              }

              case 'task:comment_added': {
                setTasks(prev => prev.map(t => {
                  if (t.id === data.taskId) {
                    return {
                      ...t,
                      comments: [...t.comments, data.comment]
                    };
                  }
                  return t;
                }));
                addNotification(`${data.by} commented on a task`, data.by, 'update');
                break;
              }

              case 'tasks:synced': {
                setTasks(data.tasks);
                addNotification('Workspace reset to template tasks', 'System');
                break;
              }

              default:
                break;
            }
          } catch (err) {
            console.error('Error handling WebSocket frame:', err);
          }
        };

        socket.onclose = () => {
          if (!isMounted) return;
          setConnectionStatus('disconnected');
          // Auto reconnect after 2 seconds
          reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch (err) {
        console.error('WebSocket connection failed:', err);
        setConnectionStatus('disconnected');
        reconnectTimeoutRef.current = window.setTimeout(connect, 2500);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, currentUser.id, currentUser.name, currentUser.color, addNotification]);

  // Track live mouse movement and broadcast to peers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      // Throttle mouse moves to ~40ms (25fps) to balance smooth presence and bandwidth
      if (now - lastCursorEmitRef.current > 40) {
        lastCursorEmitRef.current = now;
        sendWs({
          type: 'cursor:move',
          roomId,
          cursor: {
            x: Math.round(e.clientX),
            y: Math.round(e.clientY)
          }
        });
      }
    };

    const handleMouseLeave = () => {
      sendWs({
        type: 'cursor:move',
        roomId,
        cursor: null
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [roomId, sendWs]);

  // Set active task and broadcast presence
  const setSelectedTaskId = useCallback((taskId: string | null) => {
    setSelectedTaskIdState(taskId);
    sendWs({
      type: 'presence:update',
      roomId,
      activeTaskId: taskId
    });
  }, [roomId, sendWs]);

  // Mutator functions with optimistic updates
  const createTask = useCallback((taskData: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    difficulty?: TaskDifficulty;
    estimatedMinutes?: number;
    urgency?: boolean;
    importance?: boolean;
    tags?: string[];
    dueDate?: string | null;
    subtasks?: Subtask[];
  }) => {
    const defaultDifficulty = taskData.difficulty || (taskData.priority === 'urgent' ? 'hard' : (taskData.priority === 'high' ? 'medium' : 'easy'));
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      difficulty: defaultDifficulty,
      estimatedMinutes: taskData.estimatedMinutes || (defaultDifficulty === 'hard' ? 90 : defaultDifficulty === 'medium' ? 45 : 20),
      urgency: taskData.urgency !== undefined ? taskData.urgency : (taskData.priority === 'urgent' || taskData.priority === 'high'),
      importance: taskData.importance !== undefined ? taskData.importance : true,
      tags: taskData.tags || ['Task'],
      dueDate: taskData.dueDate || null,
      subtasks: taskData.subtasks || [],
      comments: [],
      assignee: { name: currentUser.name, avatarColor: currentUser.color },
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistic local update
    setTasks(prev => [newTask, ...prev]);

    // Broadcast to server
    sendWs({
      type: 'task:create',
      roomId,
      task: newTask,
      by: currentUser.name
    });
  }, [currentUser, roomId, sendWs]);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    sendWs({
      type: 'task:update',
      roomId,
      task: updatedTask,
      by: currentUser.name
    });
  }, [currentUser.name, roomId, sendWs]);

  const moveTask = useCallback((taskId: string, newStatus?: TaskStatus, newUrgency?: boolean, newImportance?: boolean) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: newStatus !== undefined ? newStatus : t.status,
          urgency: newUrgency !== undefined ? newUrgency : t.urgency,
          importance: newImportance !== undefined ? newImportance : t.importance,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));

    if (newStatus === 'done') {
      sound.playTaskComplete();
    }

    sendWs({
      type: 'task:move',
      roomId,
      taskId,
      newStatus,
      newUrgency,
      newImportance,
      by: currentUser.name
    });
  }, [currentUser.name, roomId, sendWs]);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }

    sendWs({
      type: 'task:delete',
      roomId,
      taskId,
      by: currentUser.name
    });
  }, [currentUser.name, roomId, selectedTaskId, setSelectedTaskId, sendWs]);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    let nowCompleted = false;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => {
            if (s.id === subtaskId) {
              nowCompleted = !s.completed;
              return { ...s, completed: nowCompleted };
            }
            return s;
          })
        };
      }
      return t;
    }));

    if (nowCompleted) {
      sound.playTaskComplete();
    }

    sendWs({
      type: 'task:subtask_toggle',
      roomId,
      taskId,
      subtaskId,
      by: currentUser.name
    });
  }, [currentUser.name, roomId, sendWs]);

  const addComment = useCallback((taskId: string, text: string) => {
    if (!text.trim()) return;
    const comment = {
      id: `c-${Date.now()}`,
      author: currentUser.name,
      avatarColor: currentUser.color,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          comments: [...t.comments, comment]
        };
      }
      return t;
    }));

    sendWs({
      type: 'task:comment',
      roomId,
      taskId,
      comment
    });
  }, [currentUser, roomId, sendWs]);

  const updateProfile = useCallback((name: string, color: string) => {
    const updated = { ...currentUser, name, color };
    setCurrentUser(updated);
    localStorage.setItem('onedot_user', JSON.stringify(updated));

    sendWs({
      type: 'presence:update',
      roomId,
      name,
      color
    });
  }, [currentUser, roomId, sendWs]);

  const changeRoom = useCallback((newRoomId: string) => {
    const clean = newRoomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'onedot-main';
    setRoomId(clean);
    const url = new URL(window.location.href);
    url.searchParams.set('room', clean);
    window.history.pushState({}, '', url.toString());
  }, []);

  const resetWorkspace = useCallback(async () => {
    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomId })
      });
    } catch (e) {
      console.error('Failed to reset workspace via API:', e);
    }
  }, [roomId]);

  return (
    <WorkspaceContext.Provider
      value={{
        tasks,
        peers,
        currentUser,
        connectionStatus,
        roomId,
        userCount,
        notifications,
        selectedTaskId,
        createTask,
        updateTask,
        moveTask,
        deleteTask,
        toggleSubtask,
        addComment,
        updateProfile,
        setSelectedTaskId,
        changeRoom,
        resetWorkspace,
        dismissNotification
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
