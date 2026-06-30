import { Router } from "express";
import { verifyAdminOrManager, verifyAdmin } from "../../middleware/auth";
import {
  getEmployees,
  listPayrolls,
  generatePayrolls,
  createPayroll,
  updatePayroll,
  markAsPaid,
  revertToPending,
  trashPayroll,
  restorePayroll,
  permanentDeletePayroll,
  getPayrollSummary,
} from "./payroll.controller";

const router = Router();

router.get("/employees", verifyAdminOrManager, getEmployees);
router.get("/summary", verifyAdminOrManager, getPayrollSummary);
router.get("/", verifyAdminOrManager, listPayrolls);
router.post("/generate", verifyAdminOrManager, generatePayrolls);
router.post("/", verifyAdminOrManager, createPayroll);
router.put("/:id", verifyAdminOrManager, updatePayroll);
router.patch("/:id/pay", verifyAdminOrManager, markAsPaid);
router.patch("/:id/revert", verifyAdminOrManager, revertToPending);
router.delete("/:id", verifyAdminOrManager, trashPayroll);
router.patch("/:id/restore", verifyAdminOrManager, restorePayroll);
router.delete("/:id/permanent", verifyAdmin, permanentDeletePayroll);

export { router as payrollRoutes };
