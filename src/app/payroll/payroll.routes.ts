import { Router } from "express";
import { verifyAdmin } from "../../middleware/auth";
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

router.get("/employees", verifyAdmin, getEmployees);
router.get("/summary", verifyAdmin, getPayrollSummary);
router.get("/", verifyAdmin, listPayrolls);
router.post("/", verifyAdmin, createPayroll);
router.put("/:id", verifyAdmin, updatePayroll);
router.patch("/:id/pay", verifyAdmin, markAsPaid);
router.delete("/:id", verifyAdmin, trashPayroll);
router.patch("/:id/restore", verifyAdmin, restorePayroll);
router.delete("/:id/permanent", verifyAdmin, permanentDeletePayroll);

export { router as payrollRoutes };
