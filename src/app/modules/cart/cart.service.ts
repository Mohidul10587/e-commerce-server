import { startSession } from 'mongoose';
import { ICartProduct } from './cart.interface';
import { CartProduct } from './cart.model';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';

const addProduct = async (payload: ICartProduct) => {
  // create order
  const result = await CartProduct.create(payload);

  return result;
};

const getAllCartProducts = async (userId: string) => {
  const result = await CartProduct.find({ buyer: Object(userId) });
  return result;
};

const deleteCartProduct = async (id: string) => {
  const result = await CartProduct.deleteOne({ _id: Object(id) });

  return result;
};

export const CartService = {
  addProduct,
  getAllCartProducts,
  deleteCartProduct,
  // getSingleProduct,
  // updateCow,
};
