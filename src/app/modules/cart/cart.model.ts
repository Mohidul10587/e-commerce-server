import { Schema, model } from 'mongoose';
import { CartProductModel, ICartProduct } from './cart.interface';

const cartProductSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
