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
exports.resolveReport = exports.deleteReport = exports.getReports = exports.updateReport = exports.getMyReports = exports.createReport = void 0;
const model_1 = require("./model");
const model_2 = require("../user/model");
const createReport = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const auditorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { seniorTeamLeaderId, teamLeaderId, trainerId, description } = req.body;
        yield model_1.Report.create({ auditorId, seniorTeamLeaderId, teamLeaderId, trainerId, description });
        res.status(201).json({ message: { en: "Report submitted successfully", bn: "রিপোর্ট সফলভাবে জমা হয়েছে" } });
    }
    catch (error) {
        next(error);
    }
});
exports.createReport = createReport;
const getMyReports = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const reports = yield model_1.Report.find({ auditorId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }).sort({ createdAt: -1 }).lean();
        res.json(reports);
    }
    catch (error) {
        next(error);
    }
});
exports.getMyReports = getMyReports;
const updateReport = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const report = yield model_1.Report.findOne({ _id: req.params.id, auditorId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!report)
            return res.status(404).json({ message: "Report not found" });
        if (report.status === "resolved")
            return res.status(400).json({ message: "Cannot edit a resolved report" });
        const { seniorTeamLeaderId, teamLeaderId, trainerId, description } = req.body;
        yield model_1.Report.findByIdAndUpdate(req.params.id, { seniorTeamLeaderId, teamLeaderId, trainerId, description });
        res.json({ message: { en: "Report updated successfully" } });
    }
    catch (error) {
        next(error);
    }
});
exports.updateReport = updateReport;
const getReports = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const query = {};
        if (status)
            query.status = status;
        const [reports, total] = yield Promise.all([
            model_1.Report.find(query)
                .populate("auditorId", "userId name")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            model_1.Report.countDocuments(query),
        ]);
        // collect all userIds to look up names
        const userIds = [...new Set(reports.flatMap((r) => [r.seniorTeamLeaderId, r.teamLeaderId, r.trainerId].filter(Boolean)))];
        const users = yield model_2.User.find({ userId: { $in: userIds } }, "userId name").lean();
        const nameMap = Object.fromEntries(users.map((u) => [u.userId, u.name]));
        const enriched = reports.map((r) => (Object.assign(Object.assign({}, r), { seniorTeamLeaderName: nameMap[r.seniorTeamLeaderId] || null, teamLeaderName: nameMap[r.teamLeaderId] || null, trainerName: nameMap[r.trainerId] || null })));
        res.json({ reports: enriched, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        next(error);
    }
});
exports.getReports = getReports;
const deleteReport = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const report = yield model_1.Report.findOne({ _id: req.params.id, auditorId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!report)
            return res.status(404).json({ message: "Report not found" });
        if (report.status === "resolved")
            return res.status(400).json({ message: "Cannot delete a resolved report" });
        yield model_1.Report.findByIdAndDelete(req.params.id);
        res.json({ message: "Report deleted" });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteReport = deleteReport;
const resolveReport = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield model_1.Report.findByIdAndUpdate(req.params.id, { status: "resolved" });
        res.json({ message: { en: "Report resolved", bn: "রিপোর্ট সমাধান হয়েছে" } });
    }
    catch (error) {
        next(error);
    }
});
exports.resolveReport = resolveReport;
