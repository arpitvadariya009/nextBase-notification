import { FastifyInstance } from "fastify";
import {
  createNotification,
  updateNotification,
  getSentNotifications,
  getReceivedNotifications,
  getSingleNotification,
  cancelNotification,
  getNotificationStats,
  getQueueStatus
} from "../controllers/notificationController.js";

export default async function notificationRoutes(fastify: FastifyInstance) {
  // Routes
  fastify.post("/create/notifications", { preHandler: [fastify.authenticate] }, createNotification);
  fastify.get("/get/notifystats", { preHandler: [fastify.authenticate] }, getNotificationStats);
  fastify.patch("/notifications/:id", { preHandler: [fastify.authenticate] }, updateNotification);
  fastify.get("/notifications/sent", { preHandler: [fastify.authenticate] }, getSentNotifications);
  fastify.get("/notifications/received", { preHandler: [fastify.authenticate] }, getReceivedNotifications);
  fastify.get("/notifications/:id", { preHandler: [fastify.authenticate] }, getSingleNotification);
  fastify.get("/getqueue/stats", { preHandler: [fastify.authenticate] }, getQueueStatus);
  fastify.delete("/notifications/:id", { preHandler: [fastify.authenticate] }, cancelNotification);
}
