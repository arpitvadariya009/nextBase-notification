import { FastifyInstance } from "fastify";
import {
  createNotification,
  updateNotification,
  getSentNotifications,
  getReceivedNotifications,
  getSingleNotification,
  cancelNotification,
  getNotificationStats,
  getQueueStatus,
} from "../controllers/notificationController.js";
import {
  CreateNotificationBody,
  UpdateNotificationBody,
  NotificationParams,
  PaginationQuery,
  UserIdQuery,
} from "../types/notification.js";

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateNotificationBody }>(
    "/create/notifications",
    { preHandler: [fastify.authenticate] },
    createNotification
  );

  fastify.patch<{ Params: NotificationParams; Body: UpdateNotificationBody }>(
    "/notifications/:id",
    { preHandler: [fastify.authenticate] },
    updateNotification
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    "/notifications/sent",
    { preHandler: [fastify.authenticate] },
    getSentNotifications
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    "/notifications/received",
    { preHandler: [fastify.authenticate] },
    getReceivedNotifications
  );

  fastify.get<{ Params: NotificationParams }>(
    "/notifications/:id",
    { preHandler: [fastify.authenticate] },
    getSingleNotification
  );

  fastify.delete<{ Params: NotificationParams }>(
    "/notifications/:id",
    { preHandler: [fastify.authenticate] },
    cancelNotification
  );

  fastify.get<{ Querystring: UserIdQuery }>(
    "/get/notifystats",
    { preHandler: [fastify.authenticate] },
    getNotificationStats
  );

  fastify.get<{ Querystring: UserIdQuery }>(
    "/getqueue/stats",
    { preHandler: [fastify.authenticate] },
    getQueueStatus
  );
}
