import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
// import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { cowFilterableFields } from './product.constant';
import { IProduct } from './product.interface';
import { ProductService } from './product.service';
import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage }).single('image');

const createProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    upload(req, res, async err => {
      if (err) {
        return res.status(500).json({ message: 'Error uploading image' });
      }

      const payloads: IProduct = req.body;
      console.log('this is data', req.file);

      payloads.image = req.file?.filename; // Attach the image filename to the payloads

      try {
        const result = await ProductService.createProduct(payloads);
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
    });
  }
);

const getAllProducts: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const filters = pick(req.query, cowFilterableFields);

    // const paginationOptions = pick(req.query, paginationFields);

    const results = await ProductService.getAllProducts(filters);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully retrieve Cows',
      data: results,
    });
  }
);

const getSingleProduct: RequestHandler = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const cows = await ProductService.getSingleProduct(id);
    sendResponse<IProduct>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully retrieve Cows',
      data: cows,
    });
  }
);

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

export const ProductController = {
  createProduct,
  getAllProducts,
  getSingleProduct,
};
