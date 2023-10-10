/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export type IUserLoginResponse = {
  accessToken: string;
  refreshToken?: string;
};

export type IUser = {
  _id: string;
  name: string;
  email: string;
  role: 'user';
  password: string;
};

export interface UserModel extends Model<IUser> {
  isUserExist(
    email: string
  ): Pick<IUser, '_id' | 'password' | 'role' | 'email' | 'name'>;
  isPasswordMatched(givenPass: string, savedPass: string): boolean;
}
export type ILoginUser = {
  email: string;
  password: string;
};
