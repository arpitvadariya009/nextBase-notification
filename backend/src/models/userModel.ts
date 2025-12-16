import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
    _id: Types.ObjectId;
    email: string;
    password: string; // hashed
    username: string;
    groups: Types.ObjectId[]; // references to Group
    createdAt: Date;
    updatedAt: Date;
    jwtToken: string;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
        },
        groups: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Group',
            },
        ],
        jwtToken: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

UserSchema.index({ email: 1 });
UserSchema.index({ groups: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);