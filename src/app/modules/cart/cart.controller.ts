import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
// import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
// import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
// import { cowFilterableFields } from './product.constant';
import { ICartProduct } from './cart.interface';
import { CartService } from './cart.service';

const addProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const payloads: ICartProduct = req.body;
    console.log('from controller', payloads);
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
    // const filters = pick(req.query, cowFilterableFields);

    // const paginationOptions = pick(req.query, paginationFields);

    const results = await CartService.getAllCartProducts();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully retrieve Cows',
      data: results,
    });
  }
);

// const getSingleProduct: RequestHandler = catchAsync(
//   async (req: Request, res: Response) => {
//     const id = req.params.id;
//     const cows = await ProductService.getSingleProduct(id);
//     sendResponse<IProduct>(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: 'Successfully retrieve Cows',
//       data: cows,
//     });
//   }
// );

// const deleteCow: RequestHandler = catchAsync(
//   async (req: Request, res: Response) => {
//     const id = req.params.id;
//     const cows = await CowService.deleteCow(id);
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: 'Successfully deleted the Cow',
//       data: cows,
//     });
//   }
// );

// const updateCow: RequestHandler = catchAsync(
//   async (req: Request, res: Response) => {
//     const id = req.params.id;
//     const updatedData = req.body;

//     const result = await CowService.updateCow(id, updatedData);

//     sendResponse<IProduct>(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: 'Student updated successfully !',
//       data: result,
//     });
//   }
// );

export const CartController = {
  addProduct,
  getAllCartProducts,
  // getSingleProduct,
};
