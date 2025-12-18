import { FastifyReply, FastifyRequest } from "fastify";
import { Types } from "mongoose";
import { Group } from "../models/groupModel.js";
import { User } from "../models/userModel.js";
import { HttpError } from "../utils/httpError.js";
import {
    CreateGroupBody,
    DeleteGroupBody,
    GetGroupsQuery,
} from "../types/group.js";

/**
 * CREATE GROUP
 */
export const createGroup = async (
    request: FastifyRequest<{ Body: CreateGroupBody }>,
    reply: FastifyReply
) => {
    try {
        const { name, description, members, createdBy } = request.body;

        if (!name) {
            throw new HttpError("Group name is required", 400);
        }

        if (members && members.length > 0) {
            const users = await User.find({ _id: { $in: members } });
            if (users.length !== members.length) {
                throw new HttpError("Some members do not exist", 400);
            }
        }

        await Group.create({
            name,
            description,
            members: members?.map((id) => new Types.ObjectId(id)),
            createdBy: new Types.ObjectId(createdBy),
        });


        return reply.code(200).send({
            success: true,
            message: "group created successfully",
        });
    } catch (error) {
        const err = error as HttpError;
        return reply.code(err.statusCode || 500).send({
            error: err.message || "Failed to create group",
        });
    }
};

/**
 * DELETE GROUP
 */
export const deleteGroup = async (
    request: FastifyRequest<{ Body: DeleteGroupBody }>,
    reply: FastifyReply
) => {
    try {
        const { id, userId } = request.body;

        const group = await Group.findById(id);
        if (!group) {
            throw new HttpError("Group not found", 404);
        }

        // only creator can delete
        if (group.createdBy.toString() !== userId) {
            throw new HttpError("Not authorized to delete this group", 403);
        }

        await Group.findByIdAndDelete(id);

        return reply.code(200).send({
            success: true,
            message: "Group deleted successfully",
        });
    } catch (error) {
        const err = error as HttpError;
        return reply.code(err.statusCode || 500).send({
            error: err.message || "Failed to delete group",
        });
    }
};

/**
 * GET GROUPS BY USER
 */
export const getGroupsByUser = async (
    request: FastifyRequest<{ Querystring: GetGroupsQuery }>,
    reply: FastifyReply
) => {
    try {
        const { userId } = request.query;

        if (!userId) {
            throw new HttpError("userId is required", 400);
        }

        const groups = await Group.find({ createdBy: userId });

        return reply.code(200).send({
            success: true,
            count: groups.length,
            data: groups,
        });
    } catch (error) {
        const err = error as HttpError;
        return reply.code(err.statusCode || 500).send({
            error: err.message || "Failed to fetch groups",
        });
    }
};
