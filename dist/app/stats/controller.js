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
exports.getStats = void 0;
const model_1 = require("../user/model");
const getStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const year = req.query.year;
        let dateFilter = {};
        let activeDateFilter = {};
        if (year) {
            const start = new Date(parseInt(year), 0, 1);
            const end = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
            dateFilter = { createdAt: { $gte: start, $lte: end } };
            activeDateFilter = { activationDate: { $gte: start, $lte: end } };
        }
        const [totalUsers, activeUsers, inactiveUsers, studentCount, trainerCount, teacherCount, teamLeaderCount, seniorTeamLeaderCount, superAdminCount, councilorCount, controllerCount, checkerCount, auditorCount, adminCount,] = yield Promise.all([
            model_1.User.countDocuments(dateFilter),
            model_1.User.countDocuments(Object.assign({ isActive: true }, activeDateFilter)),
            model_1.User.countDocuments(Object.assign({ isActive: false }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "student" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "trainer" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "teacher" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "team-leader" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "senior-team-leader" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "super-admin" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "councilor" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "controller" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "checker" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "auditor" }, dateFilter)),
            model_1.User.countDocuments(Object.assign({ role: "admin" }, dateFilter)),
        ]);
        res.json({
            totalUsers,
            activeUsers,
            inactiveUsers,
            studentCount,
            trainerCount,
            teacherCount,
            teamLeaderCount,
            seniorTeamLeaderCount,
            superAdminCount,
            councilorCount,
            controllerCount,
            checkerCount,
            auditorCount,
            adminCount,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getStats = getStats;
