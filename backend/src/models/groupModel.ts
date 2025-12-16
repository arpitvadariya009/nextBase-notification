import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  members: Types.ObjectId[]; // references to User
  createdBy: Types.ObjectId; // reference to User
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

GroupSchema.index({ members: 1 });
GroupSchema.index({ createdBy: 1 });

export const Group = mongoose.model<IGroup>('Group', GroupSchema);