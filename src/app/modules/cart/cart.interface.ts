import { Model, Types } from 'mongoose';
import { IProduct } from '../products/product.interface';
import { IUser } from '../user/user.interface';

export const label = ['For sale', 'Sold out'];
export const category = ['Dairy', 'Beef', 'Dual Purpose'];

export type ICartProduct = {
  product: Types.ObjectId | IProduct;
  buyerEmail: string;
};

export type IProductFilters = {
  searchTerm?: string;
  name?: string;
  breed?: string;
  category?: string;
  maxPrice?: string;
  minPrice?: string;
  maxWeight?: string;
  minWeight?: string;
};

export type CartProductModel = Model<ICartProduct, Record<string, unknown>>;
