import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import mongoose from "mongoose";
import {
    Notification,
    NotificationDelivery,
    Group,
    NotificationStatus,
    NotificationType,
    DeliveryStatus,
} from "../models/index.js";

const connection = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
});

interface NotificationJobData {
    notificationId: string;
}

// Import WebSocket functions dynamically (worker might run separately from API)
let sendNotificationToUser: any;
let isUserOnline: any;

// Try to import WebSocket functions if available
(async () => {
    try {
        const wsModule = await import("../connections/websocket.js");
        sendNotificationToUser = wsModule.sendNotificationToUser;
        isUserOnline = wsModule.isUserOnline;
        console.log("✅ WebSocket functions loaded in worker");
    } catch (error) {
        console.log("⚠️  Worker running without WebSocket functions (standalone mode)");
        // Worker can still mark notifications as sent for offline users
        sendNotificationToUser = null;
        isUserOnline = () => false;
    }
})();

export async function startWorker(fastify?: any) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔧 Starting Notification Worker...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
        const MONGO_URL = process.env.MONGO_URL as string;

        if (!MONGO_URL) {
            console.error("❌ MONGO_URL environment variable is not set");
            process.exit(1);
        }

        try {
            await mongoose.connect(MONGO_URL);
            console.log("✅ Worker MongoDB connected");
        } catch (error) {
            console.error("❌ MongoDB connection failed:", error);
            process.exit(1);
        }
    }

    // Create Worker
    const worker = new Worker<NotificationJobData>(
        "notifications",
        async (job: Job<NotificationJobData>) => {
            const startTime = Date.now();
            console.log(`\n📨 Processing job ${job.id}`);
            console.log(`   Notification ID: ${job.data.notificationId}`);
            console.log(`   Attempt: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`);

            try {
                await processNotification(job.data.notificationId, fastify);

                const duration = Date.now() - startTime;
                console.log(`✅ Job ${job.id} completed in ${duration}ms`);

                return {
                    success: true,
                    notificationId: job.data.notificationId,
                    duration
                };
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`❌ Job ${job.id} failed after ${duration}ms:`, error);
                throw error; // Will trigger retry
            }
        },
        {
            connection,
            concurrency: Number(process.env.WORKER_CONCURRENCY) || 10, // Process 10 jobs concurrently
            limiter: {
                max: Number(process.env.WORKER_MAX_RATE) || 50, // Max 50 jobs
                duration: Number(process.env.WORKER_RATE_WINDOW) || 60000, // Per 60 seconds
            },
            removeOnComplete: {
                count: 1000, // Keep last 1000 completed jobs
                age: 24 * 3600, // Keep for 24 hours
            },
            removeOnFail: {
                count: 9000, // Keep last 9000 failed jobs
                age: 7 * 24 * 3600, // Keep for 7 days
            },
        }
    );

    // Worker event handlers
    worker.on("completed", (job, result) => {
        console.log(`✅ Job ${job.id} completed successfully`);
        console.log(`   Result:`, result);
    });

    worker.on("failed", (job, err) => {
        console.error(`❌ Job ${job?.id} failed:`, err.message);
        console.error(`   Attempts made: ${job?.attemptsMade}`);

        if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
            console.error(`   ⚠️  Max retries reached, giving up on job ${job.id}`);
        }
    });

    worker.on("error", (err) => {
        console.error("❌ Worker error:", err);
    });

    worker.on("stalled", (jobId) => {
        console.warn(`⚠️  Job ${jobId} has stalled`);
    });

    worker.on("progress", (job, progress) => {
        console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
        console.log(`\n🛑 ${signal} received, shutting down worker gracefully...`);

        try {
            await worker.close();
            console.log("✅ Worker closed");

            await connection.quit();
            console.log("✅ Redis connection closed");

            await mongoose.connection.close();
            console.log("✅ MongoDB connection closed");

            console.log("✅ Graceful shutdown completed");
            process.exit(0);
        } catch (error) {
            console.error("❌ Error during shutdown:", error);
            process.exit(1);
        }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Worker started and listening for jobs");
    console.log(`   Concurrency: ${worker.opts.concurrency}`);
    console.log(`   Rate limit: ${worker.opts.limiter?.max} jobs per ${(worker.opts.limiter?.duration || 0) / 1000}s`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return worker;
}

// ============================================
// PROCESS NOTIFICATION
// ============================================
async function processNotification(notificationId: string, fastify?: any) {
    console.log(`\n📋 Processing notification ${notificationId}`);

    const notification = await Notification.findById(notificationId);

    if (!notification) {
        console.error(`❌ Notification ${notificationId} not found`);
        throw new Error(`Notification ${notificationId} not found`);
    }

    console.log(`   Type: ${notification.type}`);
    console.log(`   Status: ${notification.status}`);
    console.log(`   Title: ${notification.title}`);

    // Skip if already delivered or cancelled
    if (
        notification.status === NotificationStatus.DELIVERED ||
        notification.status === NotificationStatus.CANCELLED
    ) {
        console.log(`   ⏭️  Notification already ${notification.status}, skipping`);
        return;
    }

    // Update to processing
    notification.status = NotificationStatus.PROCESSING;
    notification.processedAt = new Date();
    await notification.save();

    console.log(`   ⚙️  Status updated to PROCESSING`);

    try {
        if (notification.type === NotificationType.SINGLE) {
            await processSingleUser(notification, fastify);
        } else if (notification.type === NotificationType.GROUP) {
            await processGroup(notification, fastify);
        }

        // Check if all deliveries are complete
        const pendingDeliveries = await NotificationDelivery.countDocuments({
            notification: notification._id,
            status: { $in: [DeliveryStatus.PENDING] },
        });

        console.log(`   📊 Pending deliveries: ${pendingDeliveries}`);

        if (pendingDeliveries === 0) {
            notification.status = NotificationStatus.DELIVERED;
            notification.deliveredAt = new Date();
            await notification.save();
            console.log(`   ✅ All deliveries completed, notification status: DELIVERED`);
        } else {
            console.log(`   ⏳ Some deliveries still pending`);
        }
    } catch (error) {
        console.error(`   ❌ Error processing notification:`, error);

        notification.retryCount += 1;
        notification.lastError = (error as Error).message;

        if (notification.retryCount >= notification.maxRetries) {
            notification.status = NotificationStatus.FAILED;
            notification.failedAt = new Date();
            console.error(`   ⚠️  Max retries (${notification.maxRetries}) reached, marking as FAILED`);
        }

        await notification.save();
        throw error;
    }
}

// ============================================
// PROCESS SINGLE USER
// ============================================
async function processSingleUser(notification: any, fastify?: any) {
    const recipientId = notification.recipientUser.toString();
    console.log(`\n👤 Processing single user notification`);
    console.log(`   Recipient ID: ${recipientId}`);

    // Find or create delivery record
    let delivery = await NotificationDelivery.findOne({
        notification: notification._id,
        recipient: notification.recipientUser,
    });

    if (!delivery) {
        delivery = await NotificationDelivery.create({
            notification: notification._id,
            recipient: notification.recipientUser,
            status: DeliveryStatus.PENDING,
        });
        console.log(`   📝 Created delivery record: ${delivery._id}`);
    } else {
        console.log(`   📝 Found existing delivery record: ${delivery._id}`);
    }

    // Skip if already delivered
    if (
        delivery.status === DeliveryStatus.DELIVERED ||
        delivery.status === DeliveryStatus.SENT ||
        delivery.status === DeliveryStatus.READ
    ) {
        console.log(`   ✅ Delivery already ${delivery.status}, skipping`);
        return;
    }

    // Check if user is online (if WebSocket available)
    const online = isUserOnline ? isUserOnline(recipientId) : false;
    console.log(`   🔌 User online: ${online}`);

    if (online && sendNotificationToUser && fastify) {
        console.log(`   📤 Attempting to send via WebSocket...`);

        // Try to send via WebSocket
        const sent = await sendNotificationToUser(
            recipientId,
            {
                notificationId: notification._id.toString(),
                title: notification.title,
                message: notification.message,
                type: notification.type,
                createdAt: notification.createdAt.toISOString(),
                metadata: notification.metadata,
            },
            delivery._id.toString(),
            fastify
        );

        if (sent) {
            delivery.status = DeliveryStatus.SENT;
            delivery.sentAt = new Date();
            await delivery.save();
            console.log(`   ✅ Sent via WebSocket successfully`);
        } else {
            // Increment retry count
            delivery.retryCount += 1;
            delivery.error = "Failed to send via WebSocket";
            await delivery.save();

            console.log(`   ⚠️  WebSocket send failed, retry count: ${delivery.retryCount}`);

            if (delivery.retryCount < 3) {
                throw new Error("WebSocket send failed, will retry");
            } else {
                delivery.status = DeliveryStatus.FAILED;
                delivery.failedAt = new Date();
                await delivery.save();
                console.error(`   ❌ Failed after ${delivery.retryCount} retries, marking as FAILED`);
            }
        }
    } else {
        // User offline, mark as sent (will be delivered when they connect)
        delivery.status = DeliveryStatus.SENT;
        delivery.sentAt = new Date();
        await delivery.save();
        console.log(`   📧 User offline, marked as SENT (will deliver on next connection)`);
    }
}

// ============================================
// PROCESS GROUP
// ============================================
async function processGroup(notification: any, fastify?: any) {
    console.log(`\n👥 Processing group notification`);
    console.log(`   Group ID: ${notification.recipientGroup}`);

    const group = await Group.findById(notification.recipientGroup).populate("members");

    if (!group || !group.members.length) {
        const error = "Group not found or has no members";
        console.error(`   ❌ ${error}`);
        throw new Error(error);
    }

    console.log(`   📢 Group has ${group.members.length} members`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const member of group.members) {
        const memberId = (member as any)._id.toString();
        console.log(`\n   Processing member: ${memberId}`);

        try {
            // Find or create delivery
            let delivery = await NotificationDelivery.findOne({
                notification: notification._id,
                recipient: memberId,
            });

            if (!delivery) {
                delivery = await NotificationDelivery.create({
                    notification: notification._id,
                    recipient: memberId,
                    status: DeliveryStatus.PENDING,
                });
                console.log(`   📝 Created delivery record`);
            }

            // Skip if already delivered
            if (
                delivery.status === DeliveryStatus.DELIVERED ||
                delivery.status === DeliveryStatus.SENT ||
                delivery.status === DeliveryStatus.READ
            ) {
                console.log(`   ✅ Already ${delivery.status}, skipping`);
                successCount++;
                skippedCount++;
                continue;
            }

            // Check if user online
            const online = isUserOnline ? isUserOnline(memberId) : false;
            console.log(`   🔌 User online: ${online}`);

            if (online && sendNotificationToUser && fastify) {
                console.log(`   📤 Sending via WebSocket...`);

                const sent = await sendNotificationToUser(
                    memberId,
                    {
                        notificationId: notification._id.toString(),
                        title: notification.title,
                        message: notification.message,
                        type: notification.type,
                        createdAt: notification.createdAt.toISOString(),
                        metadata: notification.metadata,
                    },
                    delivery._id.toString(),
                    fastify
                );

                if (sent) {
                    delivery.status = DeliveryStatus.SENT;
                    delivery.sentAt = new Date();
                    await delivery.save();
                    successCount++;
                    console.log(`   ✅ Sent successfully`);
                } else {
                    delivery.retryCount += 1;
                    await delivery.save();
                    failCount++;
                    console.log(`   ⚠️  Send failed`);
                }
            } else {
                // User offline
                delivery.status = DeliveryStatus.SENT;
                delivery.sentAt = new Date();
                await delivery.save();
                successCount++;
                console.log(`   📧 Marked as SENT (offline)`);
            }
        } catch (error) {
            console.error(`   ❌ Error processing member:`, error);
            failCount++;
        }
    }

    console.log(`\n   📊 Group processing summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
}