/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

type Name = {
  firstName: string;
  lastName: string;
};
export type IAdminLoginResponse = {
  accessToken: string;
  refreshToken?: string;
};

export type IAdmin = {
  _id: string;
  name: Name;
  phoneNumber: string;
  role: 'admin';
  password: string;
  address: string;
};

export interface AdminModel extends Model<IAdmin> {
  isAdminExist(phoneNumber: string): Pick<IAdmin, '_id' | 'password' | 'role'>;
  isPasswordMatched(givenPass: string, savedPass: string): boolean;
}
export type ILoginAdmin = {
  phoneNumber: string;
  password: string;
};
