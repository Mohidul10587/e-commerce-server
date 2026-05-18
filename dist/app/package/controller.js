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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivePackages = exports.deletePackage = exports.updatePackage = exports.getAllPackages = exports.createPackage = void 0;
const model_1 = require("./model");
const validation_1 = require("./validation");
// Admin: Create package
const createPackage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = validation_1.packageSchema.parse(req.body);
        const newPackage = yield model_1.Package.create(validatedData);
        res.status(201).json({
            message: { en: "Package created successfully" },
            package: newPackage,
        });
    }
    catch (error) {
        if (error.name === "ZodError") {
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors,
            });
        }
        next(error);
    }
});
exports.createPackage = createPackage;
// Admin: Get all packages
const getAllPackages = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const packages = yield model_1.Package.find().sort({ createdAt: -1 });
        res.json(packages);
    }
    catch (error) {
        next(error);
    }
});
exports.getAllPackages = getAllPackages;
// Admin: Update package
const updatePackage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const validatedData = validation_1.packageSchema.partial().parse(req.body);
        const updated = yield model_1.Package.findByIdAndUpdate(id, validatedData, {
            new: true,
        });
        res.json({
            message: { en: "Package updated successfully" },
            package: updated,
        });
    }
    catch (error) {
        if (error.name === "ZodError") {
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors,
            });
        }
        next(error);
    }
});
exports.updatePackage = updatePackage;
// Admin: Delete package
const deletePackage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield model_1.Package.findByIdAndDelete(id);
        res.json({ message: { en: "Package deleted successfully" } });
    }
    catch (error) {
        next(error);
    }
});
exports.deletePackage = deletePackage;
// User: Get active packages
const getActivePackages = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const packages = yield model_1.Package.find({ isActive: true }).sort({
            createdAt: -1,
        });
        res.json(packages);
    }
    catch (error) {
        next(error);
    }
});
exports.getActivePackages = getActivePackages;
