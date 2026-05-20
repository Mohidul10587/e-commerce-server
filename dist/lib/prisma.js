"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.prisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL + "?connection_limit=5&pool_timeout=30&connect_timeout=30",
        },
    },
    transactionOptions: {
        timeout: 30000,
    },
});
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.prisma;
exports.default = exports.prisma;
