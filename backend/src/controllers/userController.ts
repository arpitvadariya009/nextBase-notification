import { FastifyRequest, FastifyReply } from "fastify";
import { User } from "../models/userModel.js";
import bcrypt from "bcryptjs";

export const registerUser = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { email, password, username } = req.body as {
            email: string;
            password: string;
            username: string;
        };

        // check existing user
        const existing = await User.findOne({ email });
        if (existing) {
            return reply.status(203).send({
                success: false,
                message: "Email already exists",
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // create user
        const user = await User.create({
            email,
            password: hashedPassword,
            username,
        });

        // generate jwt
        const token = await reply.jwtSign(
            { userId: user._id.toString(), email: user.email },
            { expiresIn: "1d" }
        );


        // save token
        user.jwtToken = token;
        await user.save();

        return reply.status(200).send({
            success: true,
            message: "User registered successfully",
            token: token,
            id: user._id,
            username: user.username
        });
    } catch (err) {
        console.error(err);
        return reply.status(500).send({
            success: false,
            message: "Internal server error",
        });
    }
};

export const loginUser = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { email, password } = req.body as {
            email: string;
            password: string;
        };

        // check email exists
        const user = await User.findOne({ email });
        if (!user) {
            return reply.status(203).send({
                success: false,
                message: "Email not found",
            });
        }

        // check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return reply.status(203).send({
                success: false,
                message: "Incorrect password",
            });
        }

        // generate new jwt token
        const token = await reply.jwtSign(
            { userId: user._id.toString(), email: user.email },
            { expiresIn: "1d" }
        );

        // save token in db
        user.jwtToken = token;
        await user.save();

        return reply.status(200).send({
            success: true,
            message: "Login successful",
            token: token,
            id: user._id,
            username: user.username

        });

    } catch (err) {
        console.error(err);
        return reply.status(500).send({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getAllUsers = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const users = await User.find({}, { password: 0, jwtToken: 0 });

        return reply.status(200).send({
            success: true,
            count: users.length,
            users,
        });
    } catch (err) {
        console.error(err);
        return reply.status(500).send({
            success: false,
            message: "Internal server error",
        });
    }
};