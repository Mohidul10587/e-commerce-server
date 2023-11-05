import { ICartProduct } from './cart.interface';
import { CartProduct } from './cart.model';

const addProduct = async (payload: ICartProduct) => {
  // create order
  const result = await CartProduct.create(payload);

  return result;
};

const getAllCartProducts = async (buyerEmail: string) => {
  const result = await CartProduct.find({ buyerEmail: buyerEmail });
  return result;
};

const deleteCartProduct = async (id: string) => {
  const result = await CartProduct.deleteOne({ _id: Object(id) });

  return result;
};
const deleteMultipleCartProduct = async (email: string) => {
  const result = await CartProduct.deleteMany({ buyerEmail: email });

  return result;
};

export const CartService = {
  addProduct,
  getAllCartProducts,
  deleteCartProduct,
  deleteMultipleCartProduct,
  // getSingleProduct,
  // updateProduct,
};
