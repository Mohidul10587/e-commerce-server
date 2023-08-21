/* eslint-disable @typescript-eslint/no-this-alias */
import { Schema, model } from 'mongoose';
import { IUser, UserModel } from './user.interface';
import bcrypt from 'bcrypt';
import config from '../../../config';

const userSchema = new Schema(
  {
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Check user exit's
userSchema.methods.isUserExit = async function (
  phoneNumber: string
): Promise<Partial<IUser> | null> {
  return await User.findOne({ phoneNumber }, { role: 1, password: 1 });
};

// check or compare password
userSchema.methods.isPasswordMatched = async function (
  textPassword: string,
  hashPassword: string
): Promise<boolean> {
  return await bcrypt.compare(textPassword, hashPassword);
};

// Hash password using prehook middleware
userSchema.pre('save', async function (next) {
  const user = this;
  user.password = await bcrypt.hash(
    this.password,
    Number(config.bycrypt_salt_rounds)
  );

  next();
});

export const User = model<IUser, UserModel>('User', userSchema);
