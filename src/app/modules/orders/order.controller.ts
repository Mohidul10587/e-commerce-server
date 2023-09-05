import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
// import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
// import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
// import { cowFilterableFields } from './product.constant';
import { OrderService } from './order.service';
import { IOrder } from './order.interface';

const postOrder: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const payloads: IOrder = req.body;
    console.log('from controller', payloads);
    try {
      const result = await OrderService.postOrder(payloads);
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Successfully created a order',
        data: result,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error creating order' });
    }
  }
);

const getAllOrders: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    // const filters = pick(req.query, cowFilterableFields);

    const results = await OrderService.getOrder();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully retrieve Cows',
      data: results,
    });
  }
);

export const OrderController = {
  postOrder,
  getAllOrders,
};
