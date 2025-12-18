import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { User } from "../models/userModel.js";
import { HttpError } from "../utils/httpError.js";
import {
  RegisterUserBody,
  LoginUserBody,
} from "../types/user.js";

export const registerUser = async (
  req: FastifyRequest<{ Body: RegisterUserBody }>,
  reply: FastifyReply
) => {
  try {
    const { email, password, username } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw new HttpError("Email already exists", 203);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      username,
    });

    const token = await reply.jwtSign(
      { userId: user._id.toString(), email: user.email },
      { expiresIn: "1d" }
    );

    user.jwtToken = token;
    await user.save();

    return reply.status(200).send({
      success: true,
      message: "User registered successfully",
      token,
      id: user._id,
      username: user.username,
    });
  } catch (error) {
    const err = error as HttpError;
    return reply.status(err.statusCode || 500).send({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

export const loginUser = async (
  req: FastifyRequest<{ Body: LoginUserBody }>,
  reply: FastifyReply
) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new HttpError("Email not found", 203);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new HttpError("Incorrect password", 203);
    }

    const token = await reply.jwtSign(
      { userId: user._id.toString(), email: user.email },
      { expiresIn: "1d" }
    );

    user.jwtToken = token;
    await user.save();

    return reply.status(200).send({
      success: true,
      message: "Login successful",
      token,
      id: user._id,
      username: user.username,
    });
  } catch (error) {
    const err = error as HttpError;
    return reply.status(err.statusCode || 500).send({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

export const getAllUsers = async (
  _req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const users = await User.find({}, { password: 0, jwtToken: 0 });

    return reply.status(200).send({
      success: true,
      count: users.length,
      users,
    });
  } catch {
    return reply.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};
