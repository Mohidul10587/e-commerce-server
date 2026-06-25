import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler";
import { userRoutes } from "./app/user/routes";
import { settingsRoutes } from "./app/settings/routes";
import { productRoutes } from "./app/product/product.routes";
import { orderRoutes } from "./app/order/order.routes";
import { supplierRoutes } from "./app/supplier/supplier.routes";
import { purchaseRoutes } from "./app/purchase/purchase.routes";
import { inventoryRoutes } from "./app/inventory/inventory.routes";
import { financeRoutes } from "./app/finance/finance.routes";
import { expenseRoutes } from "./app/expense/expense.routes";
import { payrollRoutes } from "./app/payroll/payroll.routes";
import { courierRoutes } from "./app/courier/courier.routes";
import { steadfastWebhookRouter } from "./app/courier/steadfast.webhook";

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.get("/", (_req: Request, res: Response) => res.send("Server is running"));
app.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});
app.post("/webhooks/whatsapp", (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));

  res.sendStatus(200);
});
app.use("/user", userRoutes);
app.use("/settings", settingsRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/purchases", purchaseRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/finances", financeRoutes);
app.use("/expenses", expenseRoutes);
app.use("/payroll", payrollRoutes);
app.use("/courier", courierRoutes);
app.use("/webhooks", steadfastWebhookRouter);

app.use(errorHandler);

httpServer.listen(port, () => console.log(`Server running on port ${port}`));
