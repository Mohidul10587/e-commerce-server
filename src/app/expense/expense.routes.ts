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

// Office Expense Categories
router.get("/office-expense-categories", verifyAdminOrManager, listOfficeExpenseCategories);
router.post("/office-expense-categories", verifyAdminOrManager, createOfficeExpenseCategory);
router.put("/office-expense-categories/:id", verifyAdminOrManager, updateOfficeExpenseCategory);
router.delete("/office-expense-categories/:id", verifyAdminOrManager, trashOfficeExpenseCategory);
router.patch("/office-expense-categories/:id/restore", verifyAdminOrManager, restoreOfficeExpenseCategory);
router.delete("/office-expense-categories/:id/permanent", verifyAdmin, permanentDeleteOfficeExpenseCategory);

// Marketing Expense Categories
router.get("/marketing-expense-categories", verifyAdminOrManager, listMarketingExpenseCategories);
router.post("/marketing-expense-categories", verifyAdminOrManager, createMarketingExpenseCategory);
router.put("/marketing-expense-categories/:id", verifyAdminOrManager, updateMarketingExpenseCategory);
router.delete("/marketing-expense-categories/:id", verifyAdminOrManager, trashMarketingExpenseCategory);
router.patch("/marketing-expense-categories/:id/restore", verifyAdminOrManager, restoreMarketingExpenseCategory);
router.delete("/marketing-expense-categories/:id/permanent", verifyAdmin, permanentDeleteMarketingExpenseCategory);

// Office Expenses
router.get("/office-expenses", verifyAdminOrManager, listOfficeExpenses);
router.post("/office-expenses", verifyAdminOrManager, createOfficeExpense);
router.put("/office-expenses/:id", verifyAdminOrManager, updateOfficeExpense);
router.delete("/office-expenses/:id", verifyAdminOrManager, trashOfficeExpense);
router.patch("/office-expenses/:id/restore", verifyAdminOrManager, restoreOfficeExpense);
router.delete("/office-expenses/:id/permanent", verifyAdmin, permanentDeleteOfficeExpense);

// Marketing Expenses
router.get("/marketing-expenses", verifyAdminOrManager, listMarketingExpenses);
router.post("/marketing-expenses", verifyAdminOrManager, createMarketingExpense);
router.put("/marketing-expenses/:id", verifyAdminOrManager, updateMarketingExpense);
router.delete("/marketing-expenses/:id", verifyAdminOrManager, trashMarketingExpense);
router.patch("/marketing-expenses/:id/restore", verifyAdminOrManager, restoreMarketingExpense);
router.delete("/marketing-expenses/:id/permanent", verifyAdmin, permanentDeleteMarketingExpense);

export { router as expenseRoutes };
