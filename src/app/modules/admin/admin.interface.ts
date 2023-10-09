/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export type IAdminLoginResponse = {
  accessToken: string;
  refreshToken?: string;
};

export type IAdmin = {
  _id: string;
  name: string;
  email: string;
  role: 'admin';
  password: string;
};

export interface AdminModel extends Model<IAdmin> {
  isAdminExist(
    email: string
  ): Pick<IAdmin, '_id' | 'password' | 'role' | 'email' | 'name'>;
  isPasswordMatched(givenPass: string, savedPass: string): boolean;
}
export type ILoginAdmin = {
  email: string;
  password: string;
};
