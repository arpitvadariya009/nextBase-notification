import mongoose, { Schema, Document, Types } from "mongoose";

export interface GroupDocument extends Document {
  name: string;
  description?: string;
  members?: Types.ObjectId[];
  createdBy: Types.ObjectId;
}

const groupSchema = new Schema<GroupDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Group = mongoose.model<GroupDocument>("Group", groupSchema);
