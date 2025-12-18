import { FastifyInstance } from "fastify";
import {
  registerUser,
  loginUser,
  getAllUsers,
} from "../controllers/userController.js";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.post("/register", registerUser);
  fastify.post("/login", loginUser);

  fastify.get(
    "/all/users",
    { preHandler: [fastify.authenticate] },
    getAllUsers
  );
}
