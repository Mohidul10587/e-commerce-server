import { Router } from "express";
import { verifyAdminOrManager } from "../../middleware/auth";
import {
  getEmployees,
  listPayrolls,
  createPayroll,
  updatePayroll,
  markAsPaid,
  trashPayroll,
  restorePayroll,
  permanentDeletePayroll,
  getPayrollSummary,
} from "./payroll.controller";

const router = Router();

router.get("/employees", verifyAdminOrManager, getEmployees);
router.get("/summary", verifyAdminOrManager, getPayrollSummary);
router.get("/", verifyAdminOrManager, listPayrolls);
router.post("/", verifyAdminOrManager, createPayroll);
router.put("/:id", verifyAdminOrManager, updatePayroll);
router.patch("/:id/pay", verifyAdminOrManager, markAsPaid);
router.delete("/:id", verifyAdminOrManager, trashPayroll);
router.patch("/:id/restore", verifyAdminOrManager, restorePayroll);
router.delete("/:id/permanent", verifyAdminOrManager, permanentDeletePayroll);

export { router as payrollRoutes };
