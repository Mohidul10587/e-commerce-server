import { Router } from "express";
import { verifyAdmin } from "../../middleware/auth";
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

// Summary & Activity Log
router.get("/summary", verifyAdmin, getExpenseSummary);
router.get("/activity-log", verifyAdmin, getFinancialActivityLog);

// Office Expense Categories
router.get("/office-expense-categories", verifyAdmin, listOfficeExpenseCategories);
router.post("/office-expense-categories", verifyAdmin, createOfficeExpenseCategory);
router.put("/office-expense-categories/:id", verifyAdmin, updateOfficeExpenseCategory);
router.delete("/office-expense-categories/:id", verifyAdmin, trashOfficeExpenseCategory);
router.patch("/office-expense-categories/:id/restore", verifyAdmin, restoreOfficeExpenseCategory);
router.delete("/office-expense-categories/:id/permanent", verifyAdmin, permanentDeleteOfficeExpenseCategory);

// Marketing Expense Categories
router.get("/marketing-expense-categories", verifyAdmin, listMarketingExpenseCategories);
router.post("/marketing-expense-categories", verifyAdmin, createMarketingExpenseCategory);
router.put("/marketing-expense-categories/:id", verifyAdmin, updateMarketingExpenseCategory);
router.delete("/marketing-expense-categories/:id", verifyAdmin, trashMarketingExpenseCategory);
router.patch("/marketing-expense-categories/:id/restore", verifyAdmin, restoreMarketingExpenseCategory);
router.delete("/marketing-expense-categories/:id/permanent", verifyAdmin, permanentDeleteMarketingExpenseCategory);

// Office Expenses
router.get("/office-expenses", verifyAdmin, listOfficeExpenses);
router.post("/office-expenses", verifyAdmin, createOfficeExpense);
router.put("/office-expenses/:id", verifyAdmin, updateOfficeExpense);
router.delete("/office-expenses/:id", verifyAdmin, trashOfficeExpense);
router.patch("/office-expenses/:id/restore", verifyAdmin, restoreOfficeExpense);
router.delete("/office-expenses/:id/permanent", verifyAdmin, permanentDeleteOfficeExpense);

// Marketing Expenses
router.get("/marketing-expenses", verifyAdmin, listMarketingExpenses);
router.post("/marketing-expenses", verifyAdmin, createMarketingExpense);
router.put("/marketing-expenses/:id", verifyAdmin, updateMarketingExpense);
router.delete("/marketing-expenses/:id", verifyAdmin, trashMarketingExpense);
router.patch("/marketing-expenses/:id/restore", verifyAdmin, restoreMarketingExpense);
router.delete("/marketing-expenses/:id/permanent", verifyAdmin, permanentDeleteMarketingExpense);

export { router as expenseRoutes };
