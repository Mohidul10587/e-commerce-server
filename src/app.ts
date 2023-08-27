import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import routes from './app/routes';
import multer from 'multer';
import mongoose from 'mongoose';
const app: Application = express();
app.use(
  cors({
    // origin: 'http://localhost:3000',
    origin: 'https://main--cakencreamy.netlify.app',
    credentials: true,
  })
);

app.use(cookieParser());

//parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use('/api/v1/users/', UserRoutes);fdfdfdff
// app.use('/api/v1/academic-semesters', AcademicSemesterRoutes);
app.use('/api/v1', routes);

//global error handler
app.use(globalErrorHandler);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Specify the folder where images will be stored
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

export const upload = multer({ storage: storage });

type IImage = {
  path: string;
} & mongoose.Document;

export const Image = mongoose.model<IImage>(
  'Image',
  new mongoose.Schema({
    path: String,
  })
);

app.use('/uploads', express.static('uploads')); // Serve uploaded images

//handle not found
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'Not Found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'API Not Found',
      },
    ],
  });
  next();
});

export default app;
