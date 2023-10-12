import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
// import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
// import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
// import { productFilterableFields } from './product.constant';
import { ICartProduct } from './cart.interface';
import { CartService } from './cart.service';

const addProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const payloads: ICartProduct = req.body;
    try {
      const result = await CartService.addProduct(payloads);
      sendResponse<ICartProduct>(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Successfully created a product',
        data: result,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: 'Error creating product' });
    }
  }
);

const getAllCartProducts: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    // const filters = pick(req.query, productFilterableFields);

    // const paginationOptions = pick(req.query, paginationFields);
    const buyerEmail = req.params.buyerEmail;
    const results = await CartService.getAllCartProducts(buyerEmail);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully retrieve Products',
      data: results,
    });
  }
);

const deleteCartProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const deletedOrder = await CartService.deleteCartProduct(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully deleted the order',
      data: deletedOrder,
    });
  }
);

export const CartController = {
  addProduct,
  getAllCartProducts,
  deleteCartProduct,
};
