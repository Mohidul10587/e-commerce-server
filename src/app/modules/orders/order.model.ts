import { Schema, model } from 'mongoose';
import { IOrder, OrderModel } from './order.interface';

const OrderSchema = new Schema(
  {
    currentUser: {
      type: String,
      required: true,
    },
    bkashNo: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    phoneNo: {
      type: Number,
      required: true,
    },
    cartProducts: {
      type: Schema.Types.Mixed,
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

export const Orders = model<IOrder, OrderModel>('Orders', OrderSchema);
