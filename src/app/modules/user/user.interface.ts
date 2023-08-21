import { Model } from 'mongoose';

export type IUser = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export type UserModel = Model<IUser, Record<string, unknown>>;

export const role = ['seller', 'buyer'];
