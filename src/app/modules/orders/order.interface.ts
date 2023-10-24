import { Model } from 'mongoose';
type ShippingAddress = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
};

type OrderSummary = {
  items: number;
  subtotal: number;
  shippingCharge: number;
  vat: number;
  total: number;
};

export type IOrder = {
  shippingAddress: ShippingAddress;
  orderSummary: OrderSummary;
};

export type OrderModel = Model<IOrder, Record<string, unknown>>;
