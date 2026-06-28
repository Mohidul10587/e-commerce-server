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
import { landingPageRoutes } from "./app/landingPage/landingPage.routes";
import { courierRoutes } from "./app/courier/courier.routes";
import { steadfastWebhookRouter } from "./app/courier/steadfast.webhook";

import prisma from "./lib/prisma";

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
app.get("/webhooks/whatsapp", async (req, res) => {
  console.log("========== WHATSAPP WEBHOOK VERIFY ==========");
  console.log("Query:", req.query);

  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const settings = await prisma.generalSettings.findFirst();

    console.log("Mode:", mode);
    console.log("Received Token:", token);
    console.log("Expected Token:", settings?.whatsappApiToken);
    console.log("Challenge:", challenge);

    if (mode === "subscribe" && token === settings?.whatsappApiToken) {
      console.log("✅ Webhook verification successful");
      return res.status(200).send(challenge);
    }

    console.log("❌ Webhook verification failed");
    return res.sendStatus(403);
  } catch (err) {
    console.error("❌ Verification Error:", err);
    return res.sendStatus(500);
  }
});

app.post("/webhooks/whatsapp", async (req, res) => {
  console.log("\n========== NEW WHATSAPP WEBHOOK ==========");
  console.log("Time:", new Date().toISOString());
  console.log("Headers:");
  console.dir(req.headers, { depth: null });

  console.log("\nBody:");
  console.dir(req.body, { depth: null });

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    console.log("\nParsed:");

    if (value?.messages?.length) {
      const message = value.messages[0];

      console.log("📩 New Message");
      console.log("From:", message.from);
      console.log("Message ID:", message.id);
      console.log("Type:", message.type);

      if (message.text) {
        console.log("Text:", message.text.body);
      }
    }

    if (value?.statuses?.length) {
      const status = value.statuses[0];

      console.log("📤 Status Update");
      console.log("Recipient:", status.recipient_id);
      console.log("Status:", status.status);
      console.log("Message ID:", status.id);
      console.log("Timestamp:", status.timestamp);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook Processing Error:", err);
    res.sendStatus(500);
  }
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
app.use("/landing-pages", landingPageRoutes);
app.use("/webhooks", steadfastWebhookRouter);

app.use(errorHandler);

httpServer.listen(port, () => console.log(`Server running on port ${port}`));
