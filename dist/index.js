"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
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
const landingPage_routes_1 = require("./app/landingPage/landingPage.routes");
const courier_routes_1 = require("./app/courier/courier.routes");
const steadfast_webhook_1 = require("./app/courier/steadfast.webhook");
const prisma_1 = __importDefault(require("./lib/prisma"));
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
app.get("/webhooks/whatsapp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("========== WHATSAPP WEBHOOK VERIFY ==========");
    console.log("Query:", req.query);
    try {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        const settings = yield prisma_1.default.generalSettings.findFirst();
        console.log("Mode:", mode);
        console.log("Received Token:", token);
        console.log("Expected Token:", settings === null || settings === void 0 ? void 0 : settings.whatsappApiToken);
        console.log("Challenge:", challenge);
        if (mode === "subscribe" && token === (settings === null || settings === void 0 ? void 0 : settings.whatsappApiToken)) {
            console.log("✅ Webhook verification successful");
            return res.status(200).send(challenge);
        }
        console.log("❌ Webhook verification failed");
        return res.sendStatus(403);
    }
    catch (err) {
        console.error("❌ Verification Error:", err);
        return res.sendStatus(500);
    }
}));
app.post("/webhooks/whatsapp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    console.log("\n========== NEW WHATSAPP WEBHOOK ==========");
    console.log("Time:", new Date().toISOString());
    console.log("Headers:");
    console.dir(req.headers, { depth: null });
    console.log("\nBody:");
    console.dir(req.body, { depth: null });
    try {
        const entry = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.entry) === null || _b === void 0 ? void 0 : _b[0];
        const change = (_c = entry === null || entry === void 0 ? void 0 : entry.changes) === null || _c === void 0 ? void 0 : _c[0];
        const value = change === null || change === void 0 ? void 0 : change.value;
        console.log("\nParsed:");
        if ((_d = value === null || value === void 0 ? void 0 : value.messages) === null || _d === void 0 ? void 0 : _d.length) {
            const message = value.messages[0];
            console.log("📩 New Message");
            console.log("From:", message.from);
            console.log("Message ID:", message.id);
            console.log("Type:", message.type);
            if (message.text) {
                console.log("Text:", message.text.body);
            }
        }
        if ((_e = value === null || value === void 0 ? void 0 : value.statuses) === null || _e === void 0 ? void 0 : _e.length) {
            const status = value.statuses[0];
            console.log("📤 Status Update");
            console.log("Recipient:", status.recipient_id);
            console.log("Status:", status.status);
            console.log("Message ID:", status.id);
            console.log("Timestamp:", status.timestamp);
        }
        res.sendStatus(200);
    }
    catch (err) {
        console.error("❌ Webhook Processing Error:", err);
        res.sendStatus(500);
    }
}));
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
app.use("/landing-pages", landingPage_routes_1.landingPageRoutes);
app.use("/webhooks", steadfast_webhook_1.steadfastWebhookRouter);
app.use(errorHandler_1.errorHandler);
httpServer.listen(port, () => console.log(`Server running on port ${port}`));
