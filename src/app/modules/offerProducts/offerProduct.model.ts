import { Schema, model } from 'mongoose';
import { OfferProductModel, IProduct } from './offerProduct.interface';

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },
    image: {
      type: Array,
    },

    quantity: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
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

export const OfferProduct = model<IProduct, OfferProductModel>(
  'OfferProduct',
  productSchema
);
