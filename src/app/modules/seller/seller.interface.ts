/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export type ISellerLoginResponse = {
  accessToken: string;
  refreshToken?: string;
};

export type ISeller = {
  _id: string;
  name: string;
  email: string;
  role: 'seller';
  password: string;
};

export interface SellerModel extends Model<ISeller> {
  isSellerExist(
    email: string
  ): Pick<ISeller, '_id' | 'password' | 'role' | 'email' | 'name'>;
  isPasswordMatched(givenPass: string, savedPass: string): boolean;
}
export type ILoginSeller = {
  email: string;
  password: string;
};
