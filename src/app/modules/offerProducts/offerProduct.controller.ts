import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
// import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IProduct } from './offerProduct.interface';
import { OfferProductService } from './offerProduct.service';
import pick from '../../../shared/pick';
import { productFilterableFields } from './offerProduct.constant';

const createOfferProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const payloads: IProduct = req.body;
    const id = req.params.id;

    console.log(payloads, id);
    try {
      const result = await OfferProductService.createOfferProduct(payloads);
      sendResponse<IProduct>(res, {
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

const getAllOfferProducts: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const filters = pick(req.query, productFilterableFields);
    const results = await OfferProductService.getAllOfferProducts(filters);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully retrieve Products',
      data: results,
    });
  }
);

// const getSingleCategoryProduct: RequestHandler = catchAsync(
//   async (req: Request, res: Response) => {
//     const categoryName = req.params.categoryName;
//     const filters = pick(req.query, productFilterableFields);
//     const result = await ProductService.getSingleCategoryProduct(
//       categoryName,
//       filters
//     );
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: `Successfully retrieve Products of ${categoryName}`,
//       data: result,
//     });
//   }
// );

// const getSingleSubCategoryProduct: RequestHandler = catchAsync(
//   async (req: Request, res: Response) => {
//     const sub_category = req.params.sub_category;
//     const filters = pick(req.query, productFilterableFields);
//     const result = await ProductService.getSingleSubCategoryProduct(
//       sub_category,
//       filters
//     );
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: `Successfully retrieve Products of ${sub_category}`,
//       data: result,
//     });
//   }
// );

// const getSingleProduct: RequestHandler = catchAsync(
//   async (req: Request, res: Response) => {
//     const id = req.params.id;
//     const result = await ProductService.getSingleProduct(id);
//     sendResponse<IProduct>(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: `Successfully retrieve Products of ${id}`,
//       data: result,
//     });
//   }
// );
// const updateProduct: RequestHandler = catchAsync(
//   async (req: Request, res: Response) => {
//     const updatedProduct = req.body;
//     const id = req.params.id;

//     console.log(updatedProduct, id);
//     const result = await ProductService.updateProduct(updatedProduct, id);
//     sendResponse<IProduct>(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: `Successfully  Product updated`,
//       data: result,
//     });
//   }
// );

// const deleteSingleProduct: RequestHandler = catchAsync(
//   async (req: Request, res: Response) => {
//     const id = req.params.id;
//     const products = await ProductService.deleteSingleProduct(id);
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: 'Successfully deleted the Products',
//       data: products,
//     });
//   }
// );

export const OfferProductController = {
  createOfferProduct,
  getAllOfferProducts,
  // getSingleProduct,
  // getSingleCategoryProduct,
  // deleteSingleProduct,
  // getSingleSubCategoryProduct,
  // updateProduct,
};
