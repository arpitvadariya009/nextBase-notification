import { FastifyInstance } from "fastify";
import {
  createGroup,
  deleteGroup,
  getGroupsByUser,
} from "../controllers/groupController.js";
import {
  CreateGroupBody,
  DeleteGroupBody,
  GetGroupsQuery,
} from "../types/group.js";

export default async function groupRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateGroupBody }>(
    "/create/group",
    { preHandler: [fastify.authenticate] },
    createGroup
  );

  fastify.post<{ Body: DeleteGroupBody }>(
    "/delete/group",
    { preHandler: [fastify.authenticate] },
    deleteGroup
  );

  fastify.get<{ Querystring: GetGroupsQuery }>(
    "/get/groups",
    { preHandler: [fastify.authenticate] },
    getGroupsByUser
  );
}
