import mongoose, { Schema, Document, Types } from 'mongoose';

export enum NotificationType {
  SINGLE = 'single',
  GROUP = 'group',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface INotification extends Document {
  _id: Types.ObjectId;
  type: NotificationType;
  message: string;
  title: string;
  createdBy: Types.ObjectId; // reference to User
  
  // Target recipients
  recipientUser?: Types.ObjectId; // for single user notification
  recipientGroup?: Types.ObjectId; // for group notification
  
  // Scheduling
  scheduledFor?: Date; // if null, send immediately
  
  // Status tracking
  status: NotificationStatus;
  processedAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  
  // Retry logic
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  
  // BullMQ job reference
  jobId?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    recipientGroup: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
    },
    scheduledFor: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
    },
    processedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastError: {
      type: String,
    },
    jobId: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
NotificationSchema.index({ createdBy: 1, createdAt: -1 });
NotificationSchema.index({ recipientUser: 1, status: 1 });
NotificationSchema.index({ recipientGroup: 1, status: 1 });
NotificationSchema.index({ status: 1, scheduledFor: 1 });
NotificationSchema.index({ jobId: 1 });
NotificationSchema.index({ scheduledFor: 1 }, { sparse: true });

export const Notification = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
