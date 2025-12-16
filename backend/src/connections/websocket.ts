import { FastifyInstance } from "fastify";
import fastifyWebSocket from "@fastify/websocket";
import { WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: Types.ObjectId;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
}

interface NotificationPayload {
  notificationId: string;
  title: string;
  message: string;
  type: "single" | "group";
  createdAt: string;
  metadata?: Record<string, any>;
}

// Store active connections: userId -> WebSocket
const activeConnections = new Map<string, AuthenticatedWebSocket>();

// Heartbeat interval to detect dead connections
let heartbeatInterval: NodeJS.Timeout;

export async function setupWebSocket(fastify: FastifyInstance) {
  // Register WebSocket plugin
  await fastify.register(fastifyWebSocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  fastify.get("/ws", { websocket: true }, (socket, request) => {
    // The first parameter IS the WebSocket connection
    const ws = socket as unknown as AuthenticatedWebSocket;
    ws.isAlive = true;

    fastify.log.info("New WebSocket connection attempt");

    // Send connection established message
    sendMessage(ws, {
      type: "connected",
      payload: { message: "WebSocket connection established" },
    });

    // Handle incoming messages
    ws.on("message", async (rawMessage: Buffer | string) => {
      try {
        const messageStr = typeof rawMessage === "string" ? rawMessage : rawMessage.toString();
        const message: WebSocketMessage = JSON.parse(messageStr);
        await handleMessage(ws, message, fastify);
      } catch (error) {
        fastify.log.error({ err: error }, "Error parsing WebSocket message");
        sendMessage(ws, {
          type: "error",
          payload: { message: "Invalid message format" },
        });
      }
    });

    // Handle pong responses (heartbeat)
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Handle connection close
    ws.on("close", () => {
      if (ws.userId) {
        const userId = ws.userId.toString();
        activeConnections.delete(userId);
        fastify.log.info({ userId }, "WebSocket connection closed");
      }
    });

    // Handle errors
    ws.on("error", (error) => {
      fastify.log.error({ err: error }, "WebSocket error");
      if (ws.userId) {
        activeConnections.delete(ws.userId.toString());
      }
    });
  });

  // Start heartbeat to detect dead connections
  startHeartbeat(fastify);

  fastify.log.info("✅ WebSocket setup complete");
}

// Handle different message types
async function handleMessage(
  ws: AuthenticatedWebSocket,
  message: WebSocketMessage,
  fastify: FastifyInstance
) {
  switch (message.type) {
    case "authenticate":
      await handleAuthentication(ws, message.payload, fastify);
      break;

    case "ping":
      sendMessage(ws, { type: "pong" });
      break;

    case "notification:read":
      await handleNotificationRead(ws, message.payload, fastify);
      break;

    case "notification:delivered":
      await handleNotificationDelivered(ws, message.payload, fastify);
      break;

    default:
      sendMessage(ws, {
        type: "error",
        payload: { message: `Unknown message type: ${message.type}` },
      });
  }
}

// Authenticate WebSocket connection
async function handleAuthentication(
  ws: AuthenticatedWebSocket,
  payload: { token: string },
  fastify: FastifyInstance
) {
  try {
    if (!payload?.token) {
      sendMessage(ws, {
        type: "auth:error",
        payload: { message: "Token is required" },
      });
      ws.close(1008, "Authentication required");
      return;
    }

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET || "tretrtterwttetretetdfgfgfggfgcvbvbvbxcvvbv";
    const decoded = jwt.verify(payload.token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    if (!decoded.userId) {
      throw new Error("Invalid token payload");
    }

    // Convert userId to ObjectId
    ws.userId = new Types.ObjectId(decoded.userId);
    const userId = ws.userId.toString();

    // Close existing connection for this user (if any)
    const existingConnection = activeConnections.get(userId);
    if (existingConnection && existingConnection.readyState === WebSocket.OPEN) {
      existingConnection.close(1000, "New connection established");
    }

    // Store new connection
    activeConnections.set(userId, ws);

    fastify.log.info({ userId }, "WebSocket authenticated");

    sendMessage(ws, {
      type: "auth:success",
      payload: {
        userId: decoded.userId,
        message: "Authentication successful",
      },
    });

    // Send any pending notifications
    await sendPendingNotifications(ws, fastify);
  } catch (error) {
    fastify.log.error({ err: error }, "Authentication failed");
    sendMessage(ws, {
      type: "auth:error",
      payload: { message: "Authentication failed" },
    });
    ws.close(1008, "Authentication failed");
  }
}

// Handle notification read acknowledgment
async function handleNotificationRead(
  ws: AuthenticatedWebSocket,
  payload: { notificationDeliveryId: string },
  fastify: FastifyInstance
) {
  if (!ws.userId) {
    sendMessage(ws, {
      type: "error",
      payload: { message: "Not authenticated" },
    });
    return;
  }

  try {
    const { NotificationDelivery } = await import("../models/index");

    const delivery = await NotificationDelivery.findByIdAndUpdate(
      payload.notificationDeliveryId,
      {
        status: "read",
        readAt: new Date(),
      },
      { new: true }
    );

    if (delivery) {
      fastify.log.info(
        { deliveryId: payload.notificationDeliveryId, userId: ws.userId },
        "Notification marked as read"
      );

      sendMessage(ws, {
        type: "notification:read:success",
        payload: { deliveryId: payload.notificationDeliveryId },
      });
    }
  } catch (error) {
    fastify.log.error({ err: error }, "Error marking notification as read");
    sendMessage(ws, {
      type: "error",
      payload: { message: "Failed to mark notification as read" },
    });
  }
}

// Handle notification delivered acknowledgment
async function handleNotificationDelivered(
  ws: AuthenticatedWebSocket,
  payload: { notificationDeliveryId: string },
  fastify: FastifyInstance
) {
  if (!ws.userId) {
    sendMessage(ws, {
      type: "error",
      payload: { message: "Not authenticated" },
    });
    return;
  }

  try {
    const { NotificationDelivery } = await import("../models/index");

    const delivery = await NotificationDelivery.findByIdAndUpdate(
      payload.notificationDeliveryId,
      {
        status: "delivered",
        deliveredAt: new Date(),
      },
      { new: true }
    );

    if (delivery) {
      fastify.log.info(
        { deliveryId: payload.notificationDeliveryId, userId: ws.userId },
        "Notification delivery confirmed"
      );
    }
  } catch (error) {
    fastify.log.error({ err: error }, "Error confirming notification delivery");
  }
}

// Send pending notifications to newly connected user
async function sendPendingNotifications(
  ws: AuthenticatedWebSocket,
  fastify: FastifyInstance
) {
  if (!ws.userId) return;

  try {
    const { NotificationDelivery, DeliveryStatus } = await import("../models/index");

    // Find undelivered notifications
    const pendingDeliveries = await NotificationDelivery.find({
      recipient: ws.userId,
      status: { $in: [DeliveryStatus.PENDING, DeliveryStatus.SENT] },
    })
      .populate("notification")
      .sort({ createdAt: -1 })
      .limit(50); // Limit to prevent overwhelming client

    if (pendingDeliveries.length > 0) {
      fastify.log.info(
        { userId: ws.userId, count: pendingDeliveries.length },
        "Sending pending notifications"
      );

      for (const delivery of pendingDeliveries) {
        const notification = delivery.notification as any;

        sendMessage(ws, {
          type: "notification:new",
          payload: {
            deliveryId: delivery._id.toString(),
            notificationId: notification._id.toString(),
            title: notification.title,
            message: notification.message,
            type: notification.type,
            createdAt: notification.createdAt,
            metadata: notification.metadata,
          },
        });

        // Update status to delivered
        delivery.status = DeliveryStatus.DELIVERED;
        delivery.deliveredAt = new Date();
        await delivery.save();
      }
    }
  } catch (error) {
    fastify.log.error({ err: error }, "Error sending pending notifications");
  }
}

// Send notification to specific user
export async function sendNotificationToUser(
  userId: string,
  notification: NotificationPayload,
  deliveryId: string,
  fastify: FastifyInstance
): Promise<boolean> {
  const ws = activeConnections.get(userId);

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    fastify.log.info({ userId }, "User not connected, marking as sent");
    return false;
  }

  try {
    sendMessage(ws, {
      type: "notification:new",
      payload: {
        deliveryId,
        ...notification,
      },
    });

    fastify.log.info({ userId, deliveryId }, "Notification sent via WebSocket");
    return true;
  } catch (error) {
    fastify.log.error({ err: error, userId }, "Error sending notification");
    return false;
  }
}

// Send notification status update
export async function sendNotificationStatus(
  userId: string,
  status: {
    notificationId: string;
    status: string;
    message?: string;
  },
  fastify: FastifyInstance
) {
  const ws = activeConnections.get(userId);

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  sendMessage(ws, {
    type: "notification:status",
    payload: status,
  });
}

// Check if user is online
export function isUserOnline(userId: string): boolean {
  const ws = activeConnections.get(userId);
  return ws !== undefined && ws.readyState === WebSocket.OPEN;
}

// Get all online users
export function getOnlineUsers(): string[] {
  return Array.from(activeConnections.keys());
}

// Get connection count
export function getConnectionCount(): number {
  return activeConnections.size;
}

// Send message helper
function sendMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Heartbeat to detect dead connections
function startHeartbeat(fastify: FastifyInstance) {
  // Clear existing interval if any
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    activeConnections.forEach((ws, userId) => {
      if (!ws.isAlive) {
        fastify.log.info({ userId }, "Terminating dead connection");
        activeConnections.delete(userId);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // Check every 30 seconds
}

// Cleanup on shutdown
export function cleanupWebSocket() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  activeConnections.forEach((ws) => {
    ws.close(1000, "Server shutting down");
  });

  activeConnections.clear();
}