export interface User {
  id: string;
  email: string;
  username: string;
}

export interface Notification {
  _id: string;
  type: 'single' | 'group';
  title: string;
  message: string;
  status: 'pending' | 'scheduled' | 'processing' | 'delivered' | 'failed' | 'cancelled';
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDelivery {
  id: string;
  notification: Notification;
  recipient: User;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

export interface WebSocketStats {
  totalConnections: number;
  onlineUserIds: string[];
}

export interface NotificationStats {
  total: number;
  byStatus: Record<string, number>;
  deliveries: Record<string, number>;
}
export interface QueueStats {
  total: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  scheduled: number;
}
export interface DashboardOverview {
  // ← NEW FIELDS (matching backend JSON)
  totalSent: number;
  pending: number;
  scheduled: number;
  processing: number;
  delivered: number;
  failed: number;

  // Existing fields
  queue: QueueStats;

  websocket: {
    activeConnections: number;
  };

  notifications: {
    total: number;
    byStatus: Record<string, number>;
    recent: Notification[];
  };
}
