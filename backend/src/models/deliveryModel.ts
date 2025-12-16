import mongoose, { Schema, Document, Types } from 'mongoose';

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export interface INotificationDelivery extends Document {
  _id: Types.ObjectId;
  notification: Types.ObjectId; // reference to Notification
  recipient: Types.ObjectId; // reference to User
  status: DeliveryStatus;
  
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  
  error?: string;
  retryCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const NotificationDeliverySchema = new Schema<INotificationDelivery>(
  {
    notification: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DeliveryStatus),
      default: DeliveryStatus.PENDING,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    error: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
NotificationDeliverySchema.index({ notification: 1, recipient: 1 }, { unique: true });
NotificationDeliverySchema.index({ recipient: 1, status: 1, createdAt: -1 });
NotificationDeliverySchema.index({ notification: 1, status: 1 });
NotificationDeliverySchema.index({ status: 1, createdAt: -1 });

export const NotificationDelivery = mongoose.model<INotificationDelivery>(
  'NotificationDelivery',
  NotificationDeliverySchema
);
