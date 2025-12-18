import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCookie from "@fastify/cookie";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { setupWebSocket, cleanupWebSocket } from "./connections/websocket.js";
import { startWorker } from "./workers/notificationWorker.js";

dotenv.config();

async function createServer(): Promise<{ fastify: FastifyInstance }> {
  const fastify = Fastify({ logger: true });

  // Plugins
  await fastify.register(fastifyCors, { origin: "*" });
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "SUPER_SECRET_KEY",
  });

  // Middleware - Auth decorator
  fastify.decorate(
    "authenticate",
    async function (req: any, reply: any) {
      try {
        await req.jwtVerify();
      } catch (err) {
        return reply.status(401).send({
          success: false,
          message: "Unauthorized",
        });
      }
    }
  );

  await setupWebSocket(fastify);

  // ✅ Per-user rate limit: 3 requests per minute
  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "5 minute",
    hook: "onRequest",

    keyGenerator: (request) => {
      try {
        const decoded: any = request.jwtDecode();
        return decoded?.userId || request.ip;
      } catch (e) {
        return request.ip;
      }
    },

    errorResponseBuilder: (req, context) => {
      return {
        success: false,
        message: `Rate limit exceeded. Try again in ${Math.ceil(
          context.ttl / 1000
        )} seconds.`,
      };
    }
  });

  // MongoDB connection
  const MONGO_URL = process.env.MONGO_URL as string;
  try {
    await mongoose.connect(MONGO_URL);
    fastify.log.info("✅ MongoDB connected");
  } catch (error) {
    fastify.log.error({ err: error }, "❌ MongoDB connection error");
    process.exit(1);
  }

  // Routes
  fastify.register(userRoutes, { prefix: "/api/v1" });
  fastify.register(groupRoutes, { prefix: "/api/v1" });
  fastify.register(notificationRoutes, { prefix: "/api/v1" });

  return { fastify };
}

async function main() {
  const { fastify } = await createServer();
  const PORT = 9000;

  const gracefulShutdown = async () => {
    fastify.log.info("Shutting down gracefully...");
    cleanupWebSocket();
    await fastify.close();
    process.exit(0);
  };

  await startWorker();

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
    if (err) {
      fastify.log.error({ err }, "Failed to start server");
      process.exit(1);
    }
    console.log(`🚀 Server running at: ${address}`);
    console.log(`🔌 WebSocket available at: ws://0.0.0.0:${PORT}/ws`);
  });
}

main();
