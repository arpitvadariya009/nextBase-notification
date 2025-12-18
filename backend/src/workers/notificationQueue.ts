import { Queue, Job } from "bullmq";
import Redis from "ioredis";

const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

export const notificationQueue = new Queue("notifications", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 9000, // 5 seconds base delay
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 9000, // Keep last 9000 failed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
});

export async function addNotificationToQueue(notificationId: string, delay: number = 0) {
  const jobId = `notification-${notificationId}-${Date.now()}`;
  
  console.log(`➕ Adding notification to queue:`);
  console.log(`   Notification ID: ${notificationId}`);
  console.log(`   Job ID: ${jobId}`);
  console.log(`   Delay: ${delay}ms`);

  return await notificationQueue.add(
    "process-notification",
    { notificationId },
    {
      delay,
      jobId,
    }
  );
}

export async function removeJobFromQueue(jobId: string) {
  console.log(`🗑️  Removing job from queue: ${jobId}`);
  const job = await notificationQueue.getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`   ✅ Job removed`);
  } else {
    console.log(`   ⚠️  Job not found`);
  }
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount(),
    notificationQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function getRecentJobs(
  status: "completed" | "failed" | "active" | "waiting",
  limit: number = 10
) {
  let jobs: Job[] = [];

  switch (status) {
    case "completed":
      jobs = await notificationQueue.getCompleted(0, limit - 1);
      break;
    case "failed":
      jobs = await notificationQueue.getFailed(0, limit - 1);
      break;
    case "active":
      jobs = await notificationQueue.getActive(0, limit - 1);
      break;
    case "waiting":
      jobs = await notificationQueue.getWaiting(0, limit - 1);
      break;
  }

  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    data: job.data,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    progress: job.progress,
  }));
}
