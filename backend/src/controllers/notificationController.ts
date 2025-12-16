import { FastifyReply } from "fastify";
import { Types } from "mongoose";
import { addNotificationToQueue } from "../workers/notificationQueue.js";
import {
    Notification,
    NotificationDelivery,
    Group,
    User,
    NotificationType,
    NotificationStatus,
    DeliveryStatus,
} from "../models/index.js";
import { sendNotificationToUser, isUserOnline } from "../connections/websocket.js";
import { notificationQueue } from "../workers/notificationQueue.js";
import { getQueueStats, getRecentJobs } from "../workers/notificationQueue.js";


export const createNotification = async (request: any, reply: FastifyReply) => {
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
            return reply.code(400).send({ error: "Title and message are required" });
        }

        if (type === "single" && !recipientUserId) {
            return reply.code(400).send({ error: "recipientUserId is required for single notifications" });
        }

        if (type === "group" && !recipientGroupId) {
            return reply.code(400).send({ error: "recipientGroupId is required for group notifications" });
        }

        if (type === "single") {
            const user = await User.findById(recipientUserId);
            if (!user) return reply.code(404).send({ error: "Recipient user not found" });
        }

        if (type === "group") {
            const group = await Group.findById(recipientGroupId);
            if (!group) return reply.code(404).send({ error: "Recipient group not found" });
        }

        const parsedDate = scheduledFor ? new Date(scheduledFor) : null;

        const isScheduled =
            parsedDate instanceof Date &&
            !isNaN(parsedDate.getTime()) &&
            parsedDate > new Date();

        const scheduleDate = isScheduled ? parsedDate : undefined;

        const notification = await Notification.create({
            type,
            title,
            message,
            createdBy: new Types.ObjectId(createdBy),
            recipientUser: type === "single" ? new Types.ObjectId(recipientUserId) : undefined,
            recipientGroup: type === "group" ? new Types.ObjectId(recipientGroupId) : undefined,
            scheduledFor: scheduleDate,
            status: isScheduled ? NotificationStatus.SCHEDULED : NotificationStatus.PENDING,
            metadata,
        });

        if (!isScheduled) {
            // send immediately
            await processImmediateNotification(notification, request.server);
        } else {
            // send later
            if (!scheduleDate) {
                return reply.code(400).send({ error: "Invalid schedule date" });
            }
            const delay = scheduleDate.getTime() - Date.now();
            const job = await addNotificationToQueue(notification._id.toString(), delay);
            notification.jobId = job.id;
            await notification.save();
        }

        return reply.code(201).send({
            success: true,
            notification: {
                id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                status: notification.status,
                scheduledFor: notification.scheduledFor,
                createdAt: notification.createdAt,
            },
        });

    } catch (error) {
        console.error(error);
        return reply.code(500).send({ error: "Failed to create notification" });
    }
};

export const updateNotification = async (request: any, reply: FastifyReply) => {
    try {
        const { id } = request.params;
        const { title, message, scheduledFor } = request.body;
        const userId = request.user!.userId;

        const notification = await Notification.findById(id);
        if (!notification) return reply.code(404).send({ error: "Notification not found" });

        if (notification.createdBy.toString() !== userId) {
            return reply.code(403).send({ error: "Not authorized" });
        }

        if (
            notification.status !== NotificationStatus.PENDING &&
            notification.status !== NotificationStatus.SCHEDULED
        ) {
            return reply.code(400).send({
                error: "Can only update pending or scheduled notifications",
            });
        }

        if (title) notification.title = title;
        if (message) notification.message = message;

        if (scheduledFor !== undefined) {
            const newDate = scheduledFor ? new Date(scheduledFor) : null;

            if (newDate && newDate > new Date()) {
                notification.scheduledFor = newDate;
                notification.status = NotificationStatus.SCHEDULED;

                if (notification.jobId) {
                    const { removeJobFromQueue } = await import("../workers/notificationQueue.js");
                    await removeJobFromQueue(notification.jobId);
                }

                const delay = newDate.getTime() - Date.now();
                const job = await addNotificationToQueue(notification._id.toString(), delay);
                notification.jobId = job.id;
            } else {
                notification.scheduledFor = undefined;
                notification.status = NotificationStatus.PENDING;

                if (notification.jobId) {
                    const { removeJobFromQueue } = await import("../workers/notificationQueue.js");
                    await removeJobFromQueue(notification.jobId);
                    notification.jobId = undefined;
                }

                await notification.save();
                await processImmediateNotification(notification, request.server);
            }
        }

        await notification.save();

        return reply.send({
            success: true,
            notification,
        });
    } catch (error) {
        console.error(error);
        return reply.code(500).send({ error: "Failed to update notification" });
    }
};

export const getSentNotifications = async (request: any, reply: FastifyReply) => {
    try {
        const { page = 1, limit = 20, userId } = request.query;

        const notifications = await Notification.find({
            createdBy: new Types.ObjectId(userId),
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate("recipientUser", "username email")
            .populate("recipientGroup", "name");

        const total = await Notification.countDocuments({ createdBy: userId });

        return reply.send({
            success: true,
            notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error(error);
        return reply.code(500).send({ error: "Failed to fetch sent notifications" });
    }
};

export const getReceivedNotifications = async (request: any, reply: FastifyReply) => {
    try {
        const { page = 1, limit = 20, status, userId } = request.query;

        const query: any = { recipient: userId };
        if (status) query.status = status;

        const deliveries = await NotificationDelivery.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate({
                path: "notification",
                populate: { path: "createdBy", select: "username email" },
            });

        const total = await NotificationDelivery.countDocuments(query);

        return reply.send({
            success: true,
            notifications: deliveries,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error(error);
        return reply.code(500).send({ error: "Failed to fetch received notifications" });
    }
};

export const getSingleNotification = async (request: any, reply: FastifyReply) => {
    try {
        const { id } = request.params;
        const userId = request.user!.userId;

        const notification = await Notification.findById(id)
            .populate("createdBy", "username email")
            .populate("recipientUser", "username email")
            .populate("recipientGroup", "name");

        if (!notification) {
            return reply.code(404).send({ error: "Notification not found" });
        }

        const isCreator = notification.createdBy._id.toString() === userId;
        const isRecipient =
            notification.recipientUser?._id.toString() === userId ||
            (await isUserInGroup(userId, notification.recipientGroup?._id.toString()));

        if (!isCreator && !isRecipient) {
            return reply.code(403).send({ error: "Not authorized" });
        }

        let delivery = null;
        if (isRecipient) {
            delivery = await NotificationDelivery.findOne({
                notification: notification._id,
                recipient: new Types.ObjectId(userId),
            });
        }

        return reply.send({ success: true, notification, delivery });
    } catch (error) {
        console.error(error);
        return reply.code(500).send({ error: "Failed to fetch notification" });
    }
};

export const cancelNotification = async (request: any, reply: FastifyReply) => {
    try {
        const { id } = request.params;
        const userId = request.user!.userId;

        const notification = await Notification.findById(id);
        if (!notification) return reply.code(404).send({ error: "Notification not found" });

        if (notification.createdBy.toString() !== userId) {
            return reply.code(403).send({ error: "Not authorized" });
        }

        if (
            notification.status !== NotificationStatus.PENDING &&
            notification.status !== NotificationStatus.SCHEDULED
        ) {
            return reply.code(400).send({
                error: "Can only cancel pending or scheduled notifications",
            });
        }

        if (notification.jobId) {
            const { removeJobFromQueue } = await import("../workers/notificationQueue.js");
            await removeJobFromQueue(notification.jobId);
        }

        notification.status = NotificationStatus.CANCELLED;
        await notification.save();

        return reply.send({ success: true, message: "Notification cancelled" });
    } catch (error) {
        console.error(error);
        return reply.code(500).send({ error: "Failed to cancel notification" });
    }
};

export const getNotificationStats = async (request: any, reply: FastifyReply) => {
    try {
        const { userId } = request.query;

        if (!userId) {
            return reply.code(400).send({ error: "Missing userId" });
        }

        const userObjectId = new Types.ObjectId(userId);

        const [
            totalSent,
            pending,
            scheduled,
            processing,
            delivered,
            failed,
            cancelled,
            queueWaiting,
            queueActive
        ] = await Promise.all([
            Notification.countDocuments({ createdBy: userObjectId }),
            Notification.countDocuments({ createdBy: userObjectId, status: NotificationStatus.PENDING }),
            Notification.countDocuments({ createdBy: userObjectId, status: NotificationStatus.SCHEDULED }),
            Notification.countDocuments({ createdBy: userObjectId, status: NotificationStatus.PROCESSING }),
            Notification.countDocuments({ createdBy: userObjectId, status: NotificationStatus.DELIVERED }),
            Notification.countDocuments({ createdBy: userObjectId, status: NotificationStatus.FAILED }),
            Notification.countDocuments({ createdBy: userObjectId, status: NotificationStatus.CANCELLED }),
            notificationQueue.getWaitingCount(),
            notificationQueue.getActiveCount()
        ]);

        return reply.send({
            success: true,
            stats: {
                totalSent,
                pending,
                scheduled,
                processing,
                delivered,
                failed,
                cancelled,
                waiting: queueWaiting,
                active: queueActive,
            },
        });

    } catch (error) {
        console.error("Stats Error:", error);
        return reply.code(500).send({ error: "Failed to fetch notification stats" });
    }
};

export const getQueueStatus = async (request: any, reply: FastifyReply) => {
    try {
        const { userId } = request.query;

        if (!userId) {
            return reply.code(400).send({
                success: false,
                error: "Missing userId",
            });
        }

        // Fetch all jobs from different statuses
        const [
            waitingJobs,
            activeJobs,
            completedJobs,
            failedJobs,
            delayedJobs,
        ] = await Promise.all([
            notificationQueue.getWaiting(),
            notificationQueue.getActive(),
            notificationQueue.getCompleted(),
            notificationQueue.getFailed(),
            notificationQueue.getDelayed(),
        ]);

        // Fetch notifications created by this user
        const userNotifications = await Notification.find(
            { createdBy: userId },
            { _id: 1 }
        ).lean();

        const userNotificationIds = new Set(
            userNotifications.map((n) => n._id.toString())
        );

        const filterByUser = (jobs: any[]) => {
            return jobs.filter((job) =>
                userNotificationIds.has(job.data.notificationId)
            ).length;
        };

        // Final stats
        const stats = {
            waiting: filterByUser(waitingJobs),
            active: filterByUser(activeJobs),
            completed: filterByUser(completedJobs),
            failed: filterByUser(failedJobs),
            scheduled: filterByUser(delayedJobs),
        };

        return reply.send({
            success: true,
            ...stats,
            total:
                stats.waiting +
                stats.active +
                stats.completed +
                stats.failed +
                stats.scheduled,

        });
    } catch (error) {
        console.error("❌ Error fetching queue stats:", error);
        return reply.code(500).send({
            success: false,
            error: "Failed to fetch user-wise queue statistics",
        });
    }
};


async function processImmediateNotification(notification: any, fastify: any) {
    try {
        notification.status = NotificationStatus.PROCESSING;
        await notification.save();

        if (notification.type === NotificationType.SINGLE) {
            await processSingleUserNotification(notification, fastify);
        } else if (notification.type === NotificationType.GROUP) {
            await processGroupNotification(notification, fastify);
        }
    } catch (error: any) {
        notification.status = NotificationStatus.FAILED;
        notification.failedAt = new Date();
        notification.lastError = error.message;
        await notification.save();
    }
}

async function processSingleUserNotification(notification: any, fastify: any) {
    const recipientId = notification.recipientUser.toString();

    const delivery = await NotificationDelivery.create({
        notification: notification._id,
        recipient: notification.recipientUser,
        status: DeliveryStatus.PENDING,
    });

    const online = isUserOnline(recipientId);

    if (online) {
        const sent = await sendNotificationToUser(
            recipientId,
            {
                notificationId: notification._id.toString(),
                title: notification.title,
                message: notification.message,
                type: notification.type,
                createdAt: notification.createdAt,
                metadata: notification.metadata,
            },
            delivery._id.toString(),
            fastify
        );

        if (sent) {
            delivery.status = DeliveryStatus.SENT;
            delivery.sentAt = new Date();
            await delivery.save();

            notification.status = NotificationStatus.DELIVERED;
            notification.deliveredAt = new Date();
            await notification.save();
            return;
        }
    }

    await addNotificationToQueue(notification._id.toString(), 0);
}

async function processGroupNotification(notification: any, fastify: any) {
    const group = await Group.findById(notification.recipientGroup).populate("members");
    if (!group || !group.members.length) {
        notification.status = NotificationStatus.FAILED;
        notification.failedAt = new Date();
        notification.lastError = "Group invalid";
        await notification.save();
        return;
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const member of group.members) {
        const memberId = member._id.toString();

        const existing = await NotificationDelivery.findOne({
            notification: notification._id,
            recipient: memberId,
        });

        if (existing) continue;

        const delivery = await NotificationDelivery.create({
            notification: notification._id,
            recipient: memberId,
            status: DeliveryStatus.PENDING,
        });

        const online = isUserOnline(memberId);
        if (online) {
            const sent = await sendNotificationToUser(
                memberId,
                {
                    notificationId: notification._id.toString(),
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    createdAt: notification.createdAt,
                    metadata: notification.metadata,
                },
                delivery._id.toString(),
                fastify
            );

            if (sent) {
                delivery.status = DeliveryStatus.SENT;
                delivery.sentAt = new Date();
                await delivery.save();
                sentCount++;
                continue;
            }
        }

        failedCount++;
    }

    if (failedCount > 0) {
        await addNotificationToQueue(notification._id.toString(), 0);
    }

    if (sentCount === group.members.length) {
        notification.status = NotificationStatus.DELIVERED;
        notification.deliveredAt = new Date();
    } else {
        notification.status = NotificationStatus.PROCESSING;
    }

    await notification.save();
}

async function isUserInGroup(userId: string, groupId?: string) {
    if (!groupId) return false;

    const group = await Group.findById(groupId);
    if (!group) return false;

    return group.members.some((id) => id.toString() === userId);
}
