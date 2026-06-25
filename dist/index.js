"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const errorHandler_1 = require("./middleware/errorHandler");
const routes_1 = require("./app/user/routes");
const routes_2 = require("./app/settings/routes");
const product_routes_1 = require("./app/product/product.routes");
const order_routes_1 = require("./app/order/order.routes");
const supplier_routes_1 = require("./app/supplier/supplier.routes");
const purchase_routes_1 = require("./app/purchase/purchase.routes");
const inventory_routes_1 = require("./app/inventory/inventory.routes");
const finance_routes_1 = require("./app/finance/finance.routes");
const expense_routes_1 = require("./app/expense/expense.routes");
const payroll_routes_1 = require("./app/payroll/payroll.routes");
const courier_routes_1 = require("./app/courier/courier.routes");
const steadfast_webhook_1 = require("./app/courier/steadfast.webhook");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const allowedOrigins = [
    "http://localhost:3000",
    "https://seal-client.vercel.app",
    "https://nextcareit.com",
    "https://www.nextcareit.com",
];
exports.io = new socket_io_1.Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
});
exports.io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));
});
const port = process.env.PORT || 5000;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
}));
app.get("/", (_req, res) => res.send("Server is running"));
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
app.use("/user", routes_1.userRoutes);
app.use("/settings", routes_2.settingsRoutes);
app.use("/products", product_routes_1.productRoutes);
app.use("/orders", order_routes_1.orderRoutes);
app.use("/suppliers", supplier_routes_1.supplierRoutes);
app.use("/purchases", purchase_routes_1.purchaseRoutes);
app.use("/inventory", inventory_routes_1.inventoryRoutes);
app.use("/finances", finance_routes_1.financeRoutes);
app.use("/expenses", expense_routes_1.expenseRoutes);
app.use("/payroll", payroll_routes_1.payrollRoutes);
app.use("/courier", courier_routes_1.courierRoutes);
app.use("/webhooks", steadfast_webhook_1.steadfastWebhookRouter);
app.use(errorHandler_1.errorHandler);
httpServer.listen(port, () => console.log(`Server running on port ${port}`));
