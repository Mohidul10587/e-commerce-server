import { Schema, model } from 'mongoose';
import { CowModel, IProduct } from './product.interface';

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    categoryName: {
      type: String,
      required: true,
    },

    flavorName: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    weight: {
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

export const Product = model<IProduct, CowModel>('Product', productSchema);
