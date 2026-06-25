# ব্যাকএন্ড পারফরম্যান্স রিপোর্ট

**তারিখ:** ২৫ জুন ২০২৬  
**প্রজেক্ট:** Seal/NextCareIT Backend (Node.js + Express + Prisma + PostgreSQL)

---

## ১. Auth Middleware — প্রতিটি রিকোয়েস্টে DB কল

**ফাইল:** `src/middleware/auth.ts`

**সমস্যা:**  
প্রতিটি প্রোটেক্টেড রিকোয়েস্টে `getUserFromToken()` ফাংশন একটি করে `prisma.user.findUnique()` কল করে। মানে প্রতিটি API কলে একটি অতিরিক্ত DB query যাচ্ছে শুধুমাত্র user verify করতে।

**একাধিক middleware আছে যেগুলো সবগুলো একই কাজ করে:**
- `verifyUser`
- `verifyAdmin`
- `verifyAdminOrManager`
- `verifyAdminManagerOrSupport`
- `verifyAdminManagerSupportDesignerOrProduction`
- `verifyAdminManagerSupportOrProduction`
- `verifyAdminManagerSupportOrDesigner`

প্রতিটি আলাদাভাবে DB হিট করছে।

**সমাধান:**  
JWT-তে role সহ পুরো user info embed করুন। DB call করার দরকার নেই শুধু role check করতে। User deactivation check দরকার হলে Redis cache বা short-lived token ব্যবহার করুন।

```typescript
// JWT-তে role embed থাকলে DB call ছাড়াই check করা যায়
const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
if (decoded.role !== "admin") return res.status(403)...
```

---

## ২. `getOrderStatusCounts` — ২৬টি আলাদা DB Query

**ফাইল:** `src/app/order/order.controller.ts`

**সমস্যা:**  
`VALID_STATUSES`-এ ২৩টি status আছে। এই ফাংশনটি `Promise.all`-এ করলেও **২৬টি আলাদা COUNT query** পাঠাচ্ছে:
- ১টি all
- ১টি trash
- ২৩টি status
- ৩টি payment status

**সমাধান:**  
একটি `groupBy` query দিয়ে সব কাউন্ট এক ট্রিপে আনা যায়:

```typescript
const [statusGroups, paymentGroups] = await Promise.all([
  prisma.order.groupBy({ by: ["status", "isTrashed"], _count: true }),
  prisma.order.groupBy({ by: ["paymentStatus"], where: { isTrashed: false }, _count: true }),
]);
```

---

## ৩. `createOrder` ও `updateOrder` — Loop-এর ভেতর DB Query (N+1 Problem)

**ফাইল:** `src/app/order/order.controller.ts`

**সমস্যা:**  
`createOrder` এবং `updateOrder`-এ items loop করার ভেতর প্রতিটি item-এর জন্য আলাদাভাবে `prisma.productVariant.findUnique()` কল হচ্ছে:

```typescript
for (const item of items) {
  const variant = await prisma.productVariant.findUnique(...); // N বার DB query
}
```

৫টি আইটেম থাকলে ৫টি আলাদা query।

**সমাধান:**  
একসাথে সব variantId নিয়ে একটি `findMany` কল করুন:

```typescript
const variantIds = items.map(i => Number(i.variantId));
const variants = await prisma.productVariant.findMany({
  where: { id: { in: variantIds } },
  include: { product: true },
});
const variantMap = Object.fromEntries(variants.map(v => [v.id, v]));
```

---

## ৪. `bulkUpdateOrderStatus` — Loop-এর ভেতর Transaction (Critical)

**ফাইল:** `src/app/order/order.controller.ts`

**সমস্যা:**  
প্রতিটি order-এর জন্য আলাদা `prisma.$transaction()` কল হচ্ছে। ১০০টি order bulk update করলে ১০০টি আলাদা transaction।

```typescript
for (const rawId of ids) {
  await prisma.$transaction(async (tx) => { ... }); // প্রতিটির জন্য আলাদা
}
```

এটি সবচেয়ে বড় পারফরম্যান্স সমস্যা।

**সমাধান:**  
stock deduction ছাড়া simple status update গুলো একটি `updateMany`-এ করুন। Stock-related orders আলাদাভাবে batch করুন।

---

## ৫. `getInventoryStats` — monthStart থেকে সব StockHistory লোড

**ফাইল:** `src/app/inventory/inventory.controller.ts`

**সমস্যা:**  
```typescript
prisma.stockHistory.findMany({
  where: { createdAt: { gte: monthStart } }, // পুরো মাসের সব রেকর্ড মেমোরিতে লোড
  select: { action: true, quantity: true, createdAt: true },
})
```

এরপর JavaScript-এ filter করে daily/weekly/monthly movement আলাদা করা হচ্ছে। StockHistory বড় হলে এটি খুব বেশি মেমোরি নেবে।

**সমাধান:**  
DB-তেই aggregate করুন:

```typescript
prisma.stockHistory.groupBy({
  by: ["action"],
  where: { createdAt: { gte: monthStart } },
  _sum: { quantity: true },
})
```

---

## ৬. `getMonthlyChartData` — Loop-এ ৬ বার DB Query

**ফাইল:** `src/app/inventory/inventory.controller.ts`

**সমস্যা:**  
৬ মাসের ডেটার জন্য loop-এ প্রতি iteration-এ `Promise.all` দিয়ে ২টি query করা হচ্ছে = **১২টি sequential query pairs**:

```typescript
for (let i = 5; i >= 0; i--) {
  const [history, purchaseAmt] = await Promise.all([...]); // ৬ বার
}
```

**সমাধান:**  
সব ৬ মাসের queries একসাথে পাঠান:

```typescript
const allQueries = Array.from({length: 6}, (_, i) => {
  // start/end calculate করুন
  return [historyQuery(start, end), purchaseQuery(start, end)];
}).flat();
const results = await Promise.all(allQueries); // একটি batch-এ সব
```

---

## ৭. `listPayrolls` — N+1: আলাদাভাবে Employee Info ফেচ

**ফাইল:** `src/app/payroll/payroll.controller.ts`

**সমস্যা:**  
Payroll list আনার পরে আলাদাভাবে employee info আনা হচ্ছে — এটি দুটি serial query:

```typescript
const [payrolls, total] = await Promise.all([...]); // query 1 & 2
const users = await prisma.user.findMany({...});     // query 3 (আলাদা)
```

এছাড়া `role` filter টি **DB-তে না করে JavaScript-এ** করা হচ্ছে:
```typescript
if (role) result = result.filter((p) => p.employee?.role === role);
```

মানে DB থেকে বেশি ডেটা এনে JS-এ ফিল্টার করা হচ্ছে।

**সমাধান:**  
Prisma-তে `include` দিয়ে join করুন এবং `role` filter DB-তেই পাঠান।

---

## ৮. `getFinancialLog` — আনলিমিটেড রেকর্ড ফেচ

**ফাইল:** `src/app/finance/finance.controller.ts`

**সমস্যা:**  
`paymentTransaction.findMany()`, `officeExpense.findMany()`, `marketingExpense.findMany()` — কোনো `take` limit নেই। একটি বড় date range দিলে লক্ষাধিক রেকর্ড মেমোরিতে লোড হতে পারে।

**সমাধান:**  
সব financial query-তে pagination যোগ করুন অথবা date range বাধ্যতামূলক ও সীমিত করুন (যেমন: সর্বোচ্চ ৩১ দিন)।

---

## ৯. `purchase` — Loop-এর ভেতর Sequential Stock Update

**ফাইল:** `src/app/purchase/purchase.controller.ts`

**সমস্যা:**  
`applyStockForPurchase` ফাংশনে প্রতিটি item-এর জন্য:
1. `findUnique` — productId পেতে
2. `adjustStock` — যা আবার `findUniqueOrThrow` + `update` + `stockHistory.create` করে
3. `syncProductStock` — আবার `aggregate` + `update`

সব sequential। ১০টি item মানে ৩০+ DB operations।

**সমাধান:**  
- সব variantId একসাথে `findMany`-তে নিন
- `syncProductStock` কে loop-এর বাইরে একবার করুন (unique productIds-এর জন্য)

---

## ১০. `getProductBySlug` — দুটি আলাদা Query

**ফাইল:** `src/app/product/product.controller.ts`

**সমস্যা:**  
Seal product হলে free gift product-এর জন্য আলাদা DB query:

```typescript
const product = await prisma.product.findUnique({...});
if (product.type === "seal") {
  freeGiftProduct = await prisma.product.findFirst({...}); // আলাদা query
}
```

**সমাধান:**  
দুটি query `Promise.all`-এ parallel-এ পাঠান:

```typescript
const [product, freeGiftProduct] = await Promise.all([
  prisma.product.findUnique({ where: { slug } }),
  prisma.product.findFirst({ where: { isFreeGift: true, isTrashed: false } }),
]);
```

---

## ১১. Missing Database Indexes

**ফাইল:** `prisma/schema.prisma`

**সমস্যা:**  
Schema-তে কোনো `@@index` নেই, অথচ এই fields-এ বারবার query হচ্ছে:

| Table | Field | কেন দরকার |
|-------|-------|-----------|
| `Order` | `status` | Status filter ও count |
| `Order` | `isTrashed` | সব list query-তে |
| `Order` | `paymentStatus` | Payment filter |
| `Order` | `assignedDesignerId` | Designer dashboard |
| `Order` | `createdAt` | Date range queries |
| `StockHistory` | `createdAt` | Monthly/daily stats |
| `StockHistory` | `variantId` | Stock history lookup |
| `OfficeExpense` | `createdAt`, `isTrashed` | Expense list |
| `MarketingExpense` | `createdAt`, `isTrashed` | Expense list |
| `Payroll` | `salaryMonth`, `employeeId` | Payroll queries |
| `Order` | `courier` (jsonb path) | Webhook lookup |

**সমাধান (উদাহরণ):**
```prisma
model Order {
  @@index([isTrashed, status])
  @@index([isTrashed, paymentStatus])
  @@index([assignedDesignerId])
  @@index([createdAt])
}

model StockHistory {
  @@index([variantId, createdAt])
}
```

---

## ১২. Webhook-এ JSON Path Query — Index নেই

**ফাইল:** `src/app/courier/steadfast.webhook.ts`

**সমস্যা:**  
```typescript
prisma.order.findFirst({
  where: {
    courier: {
      path: ["consignment_id"],
      equals: Number(consignment_id),
    },
  },
});
```

PostgreSQL-এ JSONB field-এ path query করা হচ্ছে কিন্তু কোনো GIN index নেই। প্রতিটি webhook call-এ full table scan হচ্ছে।

**সমাধান:**  
`consignment_id` কে আলাদা column হিসেবে রাখুন অথবা PostgreSQL-এ GIN index তৈরি করুন:

```sql
CREATE INDEX idx_order_courier_cid ON "Order" USING GIN ((courier->'consignment_id'));
```

---

## ১৩. `mongoose` Dependency — অব্যবহৃত

**ফাইল:** `package.json`

**সমস্যা:**  
`mongoose: ^8.3.4` dependency হিসেবে আছে কিন্তু কোডে কোথাও ব্যবহার নেই। এটি শুধু bundle size বাড়াচ্ছে।

**সমাধান:**  
```bash
npm uninstall mongoose
```

---

## ১৪. `bodyParser` Dup + Socket.IO-তে কোনো Room নেই

**ফাইল:** `src/index.ts`

**সমস্যা ১:**  
`body-parser` আলাদাভাবে import করা হয়েছে, কিন্তু Express 4.16+ এ এটি built-in:
```typescript
app.use(bodyParser.json()); // পুরনো পদ্ধতি
// এর বদলে: app.use(express.json());
```

**সমস্যা ২:**  
Socket.IO-তে সব order event broadcast করা হচ্ছে সব connected client-কে। বড় ট্রাফিকে এটি inefficient।

**সমাধান:**  
Role-based room ব্যবহার করুন যাতে শুধু relevant users event পান।

---

## সারসংক্ষেপ — অগ্রাধিকার অনুযায়ী

| অগ্রাধিকার | সমস্যা | প্রভাব |
|------------|--------|--------|
| 🔴 Critical | Database Index নেই | সব query slow হবে ডেটা বাড়লে |
| 🔴 Critical | Auth middleware-এ প্রতি request-এ DB call | সার্ভার load ২x বেশি |
| 🔴 Critical | `bulkUpdateOrderStatus`-এ N টি transaction | Timeout হওয়ার সম্ভাবনা |
| 🟠 High | `getOrderStatusCounts`-এ ২৬ query | Dashboard slow |
| 🟠 High | `createOrder`/`updateOrder`-এ N+1 | Order create slow |
| 🟠 High | `getFinancialLog`-এ no pagination limit | Memory overflow সম্ভব |
| 🟡 Medium | `getMonthlyChartData`-এ sequential loops | Chart load slow |
| 🟡 Medium | `listPayrolls`-এ JS-level role filter | Unnecessary data transfer |
| 🟡 Medium | Webhook-এ JSONB full table scan | Webhook slow |
| 🟢 Low | `mongoose` unused dependency | Bundle bloat |
| 🟢 Low | `bodyParser` redundant | Minor cleanup |
