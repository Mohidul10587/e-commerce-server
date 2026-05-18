/**
 * One-time fix script for double balance deduction bug.
 *
 * The bug: When a withdraw was Approved, the amount was deducted TWICE —
 * once at request creation, and again in updateStatus (Approved block).
 *
 * This script finds all affected approved withdrawals and refunds the
 * extra deduction back to each user's wallet.
 *
 * Run once: npx ts-node scripts/fixDoubleDeduction.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Wallet } from "../src/app/wallet/model";
import { Transaction } from "../src/app/transaction/model";
import WithdrawRequest from "../src/app/withdraw/withdraw.model";

dotenv.config();

async function fixDoubleDeduction() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("Connected to DB");

  // Find all approved withdrawals that have a "Withdrawal Approved" transaction
  // (this transaction was the buggy second deduction)
  const buggyTransactions = await Transaction.find({
    description: "Withdrawal Approved",
    recentAmount: { $lt: 0 }, // only the old buggy ones (negative amount = deduction)
  });

  console.log(`Found ${buggyTransactions.length} affected transaction(s)`);

  let fixed = 0;

  for (const tx of buggyTransactions) {
    const refundAmount = Math.abs(tx.recentAmount); // the extra amount that was wrongly deducted

    const wallet = await Wallet.findOne({ userId: tx.userId });
    if (!wallet) {
      console.warn(`Wallet not found for userId: ${tx.userId}`);
      continue;
    }

    const previousBalance = wallet.earnedBalance;
    wallet.earnedBalance += refundAmount;
    await wallet.save();

    await Transaction.create({
      userId: tx.userId,
      withdrawId: tx.withdrawId,
      previousAmount: previousBalance,
      recentAmount: refundAmount,
      currentTotal: wallet.earnedBalance,
      description: "Double Deduction Fix - Refund",
      type: "credit",
    });

    console.log(
      `✅ userId: ${tx.userId} | refunded: ${refundAmount} | new balance: ${wallet.earnedBalance}`
    );
    fixed++;
  }

  console.log(`\nDone. Fixed ${fixed} wallet(s).`);
  await mongoose.disconnect();
}

fixDoubleDeduction().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
