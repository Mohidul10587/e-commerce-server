import { Model } from 'mongoose';

export type IOrder = {
  currentUser: string;
  bkashNo: string;
  transactionId: string;
  amount: string;
  deliveryAddress: string;
  phoneNo: number;
  cartProducts: any;
};

export type OrderModel = Model<IOrder, Record<string, unknown>>;
