import { NotificationStatus, NotificationType } from "../models/index.js";

export interface CreateNotificationBody {
  type: NotificationType;
  title: string;
  message: string;
  recipientUserId?: string;
  recipientGroupId?: string;
  scheduledFor?: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateNotificationBody {
  title?: string;
  message?: string;
  scheduledFor?: string | null;
}

export interface NotificationParams {
  id: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  userId: string;
  status?: NotificationStatus;
}

export interface UserIdQuery {
  userId: string;
}
