import mongoose, { Document, Schema } from 'mongoose';

export interface IAuthUser extends Document {
  email: string;
  passwordHash?: string;
  googleId?: string;
  displayName: string;
}

const AuthUserSchema = new Schema<IAuthUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, sparse: true, index: true },
    displayName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<IAuthUser>('AuthUser', AuthUserSchema);
