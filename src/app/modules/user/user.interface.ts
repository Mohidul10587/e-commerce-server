/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export type IUser = {
  _id?: string;
  password: string;
  role: string;
  name: string;
  email: string;
};

export type IUserMethods = {
  isUserExit(phoneNumber: string): Promise<Partial<IUser> | null>;
  isPasswordMatched(
    textPassword: string,
    hashPassword: string
  ): Promise<boolean>;
};

export type UserModel = Model<IUser, Record<string, unknown>, IUserMethods>;

export const role = ['seller', 'buyer'];
