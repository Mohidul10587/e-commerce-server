import { Schema, model } from 'mongoose';
import { CartProductModel, ICartProduct } from './cart.interface';

const cartProductSchema = new Schema(
  {
    product: {
      type: Object,
      required: true,
    },
    buyerEmail: {
      type: String,
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

export const CartProduct = model<ICartProduct, CartProductModel>(
  'CartProduct',
  cartProductSchema
);
