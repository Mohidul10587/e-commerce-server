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

// Manager can read payroll but not edit/delete
router.get("/employees", verifyAdminOrManager, getEmployees);
router.get("/summary", verifyAdminOrManager, getPayrollSummary);
router.get("/", verifyAdminOrManager, listPayrolls);

// Write operations: admin only
router.post("/generate", verifyAdmin, generatePayrolls);
router.post("/", verifyAdmin, createPayroll);
router.put("/:id", verifyAdmin, updatePayroll);
router.patch("/:id/pay", verifyAdmin, markAsPaid);
router.patch("/:id/revert", verifyAdmin, revertToPending);
router.delete("/:id", verifyAdmin, trashPayroll);
router.patch("/:id/restore", verifyAdmin, restorePayroll);
router.delete("/:id/permanent", verifyAdmin, permanentDeletePayroll);

export { router as payrollRoutes };
