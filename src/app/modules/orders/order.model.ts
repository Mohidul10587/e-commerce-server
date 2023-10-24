import { Schema, model } from 'mongoose';
import { IOrder, OrderModel } from './order.interface';

const OrderSchema = new Schema(
  {
    shippingAddress: {
      name: String,
      address: String,
      city: String,
      postalCode: String,
    },
    orderSummary: {
      items: Number,
      subtotal: Number,
      shippingCharge: Number,
      vat: Number,
      total: Number,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

export const Orders = model<IOrder, OrderModel>('Orders', OrderSchema);
