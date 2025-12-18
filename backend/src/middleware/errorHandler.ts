import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function globalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const statusCode = (error as any).statusCode || 500;

  reply.status(statusCode).send({
    success: false,
    message: error.message || "Internal Server Error",
  });
}
