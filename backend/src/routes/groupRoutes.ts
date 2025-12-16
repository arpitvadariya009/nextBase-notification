import { FastifyInstance } from "fastify";
import { createGroup, deleteGroup, getGroupsByUser } from "../controllers/groupController";

export default async function groupRoutes(fastify: FastifyInstance) {

    fastify.post("/create/group", { preHandler: [fastify.authenticate] }, createGroup);
    fastify.post("/delete/group", { preHandler: [fastify.authenticate] }, deleteGroup);
    fastify.get("/get/groups", { preHandler: [fastify.authenticate] }, getGroupsByUser);
    
}
