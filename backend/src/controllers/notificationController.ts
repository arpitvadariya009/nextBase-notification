import { FastifyReply, FastifyRequest } from "fastify";
import { Types } from "mongoose";
import {
  Notification,
  NotificationDelivery,
  User,
  Group,
  NotificationType,
  NotificationStatus,
  DeliveryStatus,
} from "../models/index.js";
import {
  addNotificationToQueue,
  notificationQueue,
} from "../workers/notificationQueue.js";
import { HttpError } from "../utils/httpError.js";
import {
  CreateNotificationBody,
  UpdateNotificationBody,
  NotificationParams,
  PaginationQuery,
  UserIdQuery,
} from "../types/notification.js";

/**
 * CREATE NOTIFICATION
 */
export const createNotification = async (
  request: FastifyRequest<{ Body: CreateNotificationBody }>,
  reply: FastifyReply
) => {
  try {
    const {
      type,
      title,
      message,
      recipientUserId,
      recipientGroupId,
      scheduledFor,
      createdBy,
      metadata,
    } = request.body;

    if (!title || !message) {
      throw new HttpError("Title and message are required", 400);
    }

    if (type === NotificationType.SINGLE && !recipientUserId) {
      throw new HttpError("recipientUserId is required", 400);
    }

    if (type === NotificationType.GROUP && !recipientGroupId) {
      throw new HttpError("recipientGroupId is required", 400);
    }

    const scheduleDate = scheduledFor ? new Date(scheduledFor) : null;
    const isScheduled =
      scheduleDate &&
      !isNaN(scheduleDate.getTime()) &&
      scheduleDate > new Date();

    const notification = await Notification.create({
      type,
      title,
      message,
      createdBy: new Types.ObjectId(createdBy),
      recipientUser:
        type === NotificationType.SINGLE
          ? new Types.ObjectId(recipientUserId)
          : undefined,
      recipientGroup:
        type === NotificationType.GROUP
          ? new Types.ObjectId(recipientGroupId)
          : undefined,
      scheduledFor: isScheduled ? scheduleDate : undefined,
      status: isScheduled
        ? NotificationStatus.SCHEDULED
        : NotificationStatus.PENDING,
      metadata,
    });

    if (isScheduled) {
      const delay = scheduleDate!.getTime() - Date.now();
      const job = await addNotificationToQueue(notification._id.toString(), delay);
      notification.jobId = job.id;
      await notification.save();
    }

    return reply.code(201).send({
      success: true,
      notification,
    });
  } catch (error) {
    const err = error as HttpError;
    return reply.code(err.statusCode || 500).send({
      error: err.message || "Failed to create notification",
    });
  }
};

/**
 * UPDATE NOTIFICATION
 */
export const updateNotification = async (
  request: FastifyRequest<{
    Params: NotificationParams;
    Body: UpdateNotificationBody;
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const { title, message } = request.body;
    const userId = request.user!.userId;

    const notification = await Notification.findById(id);
    if (!notification) throw new HttpError("Notification not found", 404);

    if (notification.createdBy.toString() !== userId) {
      throw new HttpError("Not authorized", 403);
    }

    if (
      notification.status !== NotificationStatus.PENDING &&
      notification.status !== NotificationStatus.SCHEDULED
    ) {
      throw new HttpError("Cannot update this notification", 400);
    }

    if (title) notification.title = title;
    if (message) notification.message = message;

    await notification.save();

    return reply.send({ success: true, notification });
  } catch (error) {
    const err = error as HttpError;
    return reply.code(err.statusCode || 500).send({
      error: err.message || "Failed to update notification",
    });
  }
};

/**
 * GET SENT NOTIFICATIONS
 */
export const getSentNotifications = async (
  request: FastifyRequest<{ Querystring: PaginationQuery }>,
  reply: FastifyReply
) => {
  const { userId, page = 1, limit = 10 } = request.query;

  const notifications = await Notification.find({ createdBy: userId })
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  reply.send({ success: true, data: notifications });
};

/**
 * GET RECEIVED NOTIFICATIONS
 */
export const getReceivedNotifications = async (
  request: FastifyRequest<{ Querystring: PaginationQuery }>,
  reply: FastifyReply
) => {
  const { userId } = request.query;

  const deliveries = await NotificationDelivery.find({
    recipientUser: userId,
  }).populate("notification");

  reply.send({ success: true, data: deliveries });
};

/**
 * GET SINGLE NOTIFICATION
 */
export const getSingleNotification = async (
  request: FastifyRequest<{ Params: NotificationParams }>,
  reply: FastifyReply
) => {
  const notification = await Notification.findById(request.params.id);
  if (!notification) throw new HttpError("Notification not found", 404);

  reply.send({ success: true, notification });
};

/**
 * CANCEL NOTIFICATION
 */
export const cancelNotification = async (
  request: FastifyRequest<{ Params: NotificationParams }>,
  reply: FastifyReply
) => {
  const notification = await Notification.findById(request.params.id);
  if (!notification) throw new HttpError("Notification not found", 404);

  notification.status = NotificationStatus.CANCELLED;
  await notification.save();

  reply.send({ success: true, message: "Notification cancelled" });
};

/**
 * GET NOTIFICATION STATS
 */
export const getNotificationStats = async (
  request: FastifyRequest<{ Querystring: UserIdQuery }>,
  reply: FastifyReply
) => {
  const count = await Notification.countDocuments({
    createdBy: request.query.userId,
  });

  reply.send({ success: true, count });
};

/**
 * QUEUE STATUS
 */
export const getQueueStatus = async (
  request: FastifyRequest<{ Querystring: UserIdQuery }>,
  reply: FastifyReply
) => {
  const jobCounts = await notificationQueue.getJobCounts();
  reply.send({ success: true, queue: jobCounts });
};
