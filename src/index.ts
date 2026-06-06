import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler";
import { userRoutes } from "./app/user/routes";
import { settingsRoutes } from "./app/settings/routes";
import { productRoutes } from "./app/product/product.routes";
import { orderRoutes } from "./app/order/order.routes";
import { supplierRoutes } from "./app/supplier/supplier.routes";

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "https://seal-client.vercel.app",
  "https://nextcareit.com",
  "https://www.nextcareit.com",
];

export const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));
});

const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], credentials: true }));

app.get("/", (_req: Request, res: Response) =>
  res.send("Server is running")
);

app.use("/user", userRoutes);
app.use("/settings", settingsRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/suppliers", supplierRoutes);

app.use(errorHandler);

httpServer.listen(port, () => console.log(`Server running on port ${port}`));
