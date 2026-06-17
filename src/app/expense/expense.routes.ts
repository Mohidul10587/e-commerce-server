import { Router } from "express";
import { verifyAdminOrManager, verifyAdmin } from "../../middleware/auth";
import {
  getExpenseSummary,
  getFinancialActivityLog,
  listOfficeExpenseCategories,
  createOfficeExpenseCategory,
  updateOfficeExpenseCategory,
  trashOfficeExpenseCategory,
  restoreOfficeExpenseCategory,
  permanentDeleteOfficeExpenseCategory,
  listOfficeExpenses,
  createOfficeExpense,
  updateOfficeExpense,
  trashOfficeExpense,
  restoreOfficeExpense,
  permanentDeleteOfficeExpense,
  listMarketingExpenseCategories,
  createMarketingExpenseCategory,
  updateMarketingExpenseCategory,
  trashMarketingExpenseCategory,
  restoreMarketingExpenseCategory,
  permanentDeleteMarketingExpenseCategory,
  listMarketingExpenses,
  createMarketingExpense,
  updateMarketingExpense,
  trashMarketingExpense,
  restoreMarketingExpense,
  permanentDeleteMarketingExpense,
} from "./expense.controller";

const router = Router();

router.get("/summary", verifyAdminOrManager, getExpenseSummary);
router.get("/activity-log", verifyAdminOrManager, getFinancialActivityLog);

// Categories: admin only can create/edit/delete
router.get("/office-expense-categories", verifyAdminOrManager, listOfficeExpenseCategories);
router.post("/office-expense-categories", verifyAdmin, createOfficeExpenseCategory);
router.put("/office-expense-categories/:id", verifyAdmin, updateOfficeExpenseCategory);
router.delete("/office-expense-categories/:id", verifyAdmin, trashOfficeExpenseCategory);
router.patch("/office-expense-categories/:id/restore", verifyAdmin, restoreOfficeExpenseCategory);
router.delete("/office-expense-categories/:id/permanent", verifyAdmin, permanentDeleteOfficeExpenseCategory);

router.get("/marketing-expense-categories", verifyAdminOrManager, listMarketingExpenseCategories);
router.post("/marketing-expense-categories", verifyAdmin, createMarketingExpenseCategory);
router.put("/marketing-expense-categories/:id", verifyAdmin, updateMarketingExpenseCategory);
router.delete("/marketing-expense-categories/:id", verifyAdmin, trashMarketingExpenseCategory);
router.patch("/marketing-expense-categories/:id/restore", verifyAdmin, restoreMarketingExpenseCategory);
router.delete("/marketing-expense-categories/:id/permanent", verifyAdmin, permanentDeleteMarketingExpenseCategory);

// Expenses: admin and manager can manage
router.get("/office-expenses", verifyAdminOrManager, listOfficeExpenses);
router.post("/office-expenses", verifyAdminOrManager, createOfficeExpense);
router.put("/office-expenses/:id", verifyAdminOrManager, updateOfficeExpense);
router.delete("/office-expenses/:id", verifyAdminOrManager, trashOfficeExpense);
router.patch("/office-expenses/:id/restore", verifyAdminOrManager, restoreOfficeExpense);
router.delete("/office-expenses/:id/permanent", verifyAdmin, permanentDeleteOfficeExpense);

router.get("/marketing-expenses", verifyAdminOrManager, listMarketingExpenses);
router.post("/marketing-expenses", verifyAdminOrManager, createMarketingExpense);
router.put("/marketing-expenses/:id", verifyAdminOrManager, updateMarketingExpense);
router.delete("/marketing-expenses/:id", verifyAdminOrManager, trashMarketingExpense);
router.patch("/marketing-expenses/:id/restore", verifyAdminOrManager, restoreMarketingExpense);
router.delete("/marketing-expenses/:id/permanent", verifyAdmin, permanentDeleteMarketingExpense);

export { router as expenseRoutes };
