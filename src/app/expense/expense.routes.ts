import { Router } from "express";
import { verifyAdminOrManager } from "../../middleware/auth";
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

router.get("/office-expense-categories", verifyAdminOrManager, listOfficeExpenseCategories);
router.post("/office-expense-categories", verifyAdminOrManager, createOfficeExpenseCategory);
router.put("/office-expense-categories/:id", verifyAdminOrManager, updateOfficeExpenseCategory);
router.delete("/office-expense-categories/:id", verifyAdminOrManager, trashOfficeExpenseCategory);
router.patch("/office-expense-categories/:id/restore", verifyAdminOrManager, restoreOfficeExpenseCategory);
router.delete("/office-expense-categories/:id/permanent", verifyAdminOrManager, permanentDeleteOfficeExpenseCategory);

router.get("/marketing-expense-categories", verifyAdminOrManager, listMarketingExpenseCategories);
router.post("/marketing-expense-categories", verifyAdminOrManager, createMarketingExpenseCategory);
router.put("/marketing-expense-categories/:id", verifyAdminOrManager, updateMarketingExpenseCategory);
router.delete("/marketing-expense-categories/:id", verifyAdminOrManager, trashMarketingExpenseCategory);
router.patch("/marketing-expense-categories/:id/restore", verifyAdminOrManager, restoreMarketingExpenseCategory);
router.delete("/marketing-expense-categories/:id/permanent", verifyAdminOrManager, permanentDeleteMarketingExpenseCategory);

router.get("/office-expenses", verifyAdminOrManager, listOfficeExpenses);
router.post("/office-expenses", verifyAdminOrManager, createOfficeExpense);
router.put("/office-expenses/:id", verifyAdminOrManager, updateOfficeExpense);
router.delete("/office-expenses/:id", verifyAdminOrManager, trashOfficeExpense);
router.patch("/office-expenses/:id/restore", verifyAdminOrManager, restoreOfficeExpense);
router.delete("/office-expenses/:id/permanent", verifyAdminOrManager, permanentDeleteOfficeExpense);

router.get("/marketing-expenses", verifyAdminOrManager, listMarketingExpenses);
router.post("/marketing-expenses", verifyAdminOrManager, createMarketingExpense);
router.put("/marketing-expenses/:id", verifyAdminOrManager, updateMarketingExpense);
router.delete("/marketing-expenses/:id", verifyAdminOrManager, trashMarketingExpense);
router.patch("/marketing-expenses/:id/restore", verifyAdminOrManager, restoreMarketingExpense);
router.delete("/marketing-expenses/:id/permanent", verifyAdminOrManager, permanentDeleteMarketingExpense);

export { router as expenseRoutes };
