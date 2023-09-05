import { IOrder } from './order.interface';
import { Orders } from './order.model';

const postOrder = async (payload: IOrder) => {
  const result = Orders.create(payload);
  return result;
};

const getOrder = async () => {
  const result = await Orders.find();
  return result;
};

export const OrderService = {
  postOrder,
  getOrder,
};
