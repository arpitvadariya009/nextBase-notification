import { FastifyReply, FastifyRequest } from "fastify";
import { Types } from "mongoose";
import { Group } from "../models/groupModel";
import { User } from "../models/userModel";


export const createGroup = async (request: any, reply: FastifyReply) => {
    try {
        const { name, description, members, createdBy } = request.body;

        if (!name) {
            return reply.code(400).send({ error: "Group name is required" });
        }

        if (members && members.length > 0) {
            const users = await User.find({ _id: { $in: members } });
            if (users.length !== members.length) {
                return reply.code(400).send({ error: "Some members do not exist" });
            }
        }

        const group = await Group.create({
            name,
            description,
            members,
            createdBy: new Types.ObjectId(createdBy),
        });

        return reply.code(200).send({
            success: true,
            message: "group created successfully"
        });
    } catch (error: any) {
        console.error(error);
        return reply.code(500).send({ error: "Failed to create group" });
    }
};

export const deleteGroup = async (request: any, reply: FastifyReply) => {
    try {
        const { id, userId } = request.body;

        const group = await Group.findById(id);
        if (!group) {
            return reply.code(404).send({ error: "Group not found" });
        }

        // Only creator can delete the group
        if (group.createdBy.toString() !== userId) {
            return reply.code(403).send({ error: "Not authorized to delete this group" });
        }

        await Group.findByIdAndDelete(id);

        return reply.code(200).send({
            success: true,
            message: "Group deleted successfully",
        });
    } catch (error: any) {
        console.error(error);
        return reply.code(500).send({ error: "Failed to delete group" });
    }
};

export const getGroupsByUser = async (request: any, reply: FastifyReply) => {
    try {
        const { userId } = request.query;

        if (!userId) {
            return reply.code(400).send({ error: "userId is required" });
        }

        const groups = await Group.find({ createdBy: userId })

        return reply.code(200).send({
            success: true,
            count: groups.length,
            data: groups,
        });

    } catch (error: any) {
        console.error(error);
        return reply.code(500).send({ error: "Failed to fetch groups" });
    }
};
