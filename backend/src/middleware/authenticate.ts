import { FastifyRequest, FastifyReply } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // This will now properly type request.user
    await request.jwtVerify();
  } catch (error) {
    reply.status(401).send({
      success: false,
      message: "Unauthorized",
    });
  }
}