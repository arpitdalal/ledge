import type { PrismaClient } from "@prisma/client";
import { addMonths, setDate, startOfMonth, subMonths } from "date-fns";

import type { RecurringFrequency, TransactionType } from "@/lib/domain/constants";

const workspaceSeed = {
  name: "Personal",
  currency: "CAD",
  locale: "en-CA"
};

const categorySeeds: Array<{
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}> = [
  { name: "Rent", type: "EXPENSE", color: "rose", icon: "home" },
  { name: "Groceries", type: "EXPENSE", color: "emerald", icon: "cart" },
  { name: "Utilities", type: "EXPENSE", color: "amber", icon: "bolt" },
  { name: "Transport", type: "EXPENSE", color: "sky", icon: "car" },
  { name: "Dining", type: "EXPENSE", color: "violet", icon: "utensils" },
  { name: "Shopping", type: "EXPENSE", color: "indigo", icon: "bag" },
  { name: "Insurance", type: "EXPENSE", color: "teal", icon: "shield" },
  { name: "Entertainment", type: "EXPENSE", color: "zinc", icon: "ticket" },
  { name: "Subscriptions", type: "EXPENSE", color: "slate", icon: "repeat" },
  { name: "Salary", type: "INCOME", color: "emerald", icon: "briefcase" },
  { name: "Freelance", type: "INCOME", color: "sky", icon: "laptop" },
  { name: "Refund", type: "INCOME", color: "teal", icon: "rotate-ccw" }
];

const cents = (amount: number) => Math.round(amount * 100);

export async function seedDemoData(db: PrismaClient) {
  await db.recurringOccurrence.deleteMany();
  await db.recurringRule.deleteMany();
  await db.transaction.deleteMany();
  await db.category.deleteMany();
  await db.workspace.deleteMany();

  const workspace = await db.workspace.create({
    data: workspaceSeed
  });

  const categories = await Promise.all(
    categorySeeds.map((category) =>
      db.category.create({
        data: {
          ...category,
          isDefault: true,
          workspaceId: workspace.id
        }
      })
    )
  );

  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  const currentMonth = startOfMonth(new Date());
  const monthStarts = [-3, -2, -1, 0].map((offset) => addMonths(currentMonth, offset));

  const transactions = monthStarts.flatMap((month, index) => {
    const monthLabel = month.toLocaleString("en-CA", { month: "short" });
    const rows: Array<[string, TransactionType, number, number, string, string | null, string]> = [
      ["Salary", "INCOME", 4650, 1, "Northstar Studio", "Payroll deposit", "Bank transfer"],
      ["Rent", "EXPENSE", 1850, 2, "Harrington Lofts", "Monthly rent", "Pre-authorized"],
      ["Groceries", "EXPENSE", 132.46 + index * 8, 4, "Farm Boy", null, "Credit card"],
      ["Transport", "EXPENSE", 156, 5, "PRESTO", "Monthly pass", "Credit card"],
      ["Subscriptions", "EXPENSE", 18.99, 7, "Streaming Co.", null, "Credit card"],
      ["Utilities", "EXPENSE", 118.24 + index * 5, 10, "Toronto Hydro", null, "Bank transfer"],
      ["Dining", "EXPENSE", 64.2 + index * 3, 12, "Bar Isabel", null, "Credit card"],
      ["Groceries", "EXPENSE", 94.33 + index * 6, 16, "No Frills", null, "Debit"],
      ["Shopping", "EXPENSE", 142.15, 20, "Uniqlo", `${monthLabel} wardrobe basics`, "Credit card"],
      ["Entertainment", "EXPENSE", 48, 22, "TIFF Lightbox", null, "Credit card"],
      ["Insurance", "EXPENSE", 92.5, 24, "Co-operators", "Tenant insurance", "Pre-authorized"]
    ];

    if (index === 1) {
      rows.push(["Freelance", "INCOME", 740, 14, "Atlas Labs", "Landing page copy", "Bank transfer"]);
    }

    if (index === 2) {
      rows.push(["Refund", "INCOME", 86.42, 18, "IKEA", "Returned lamp", "Credit card"]);
    }

    if (index === 3) {
      rows.push(["Freelance", "INCOME", 520, 9, "Maple Works", "Consulting session", "Bank transfer"]);
      rows.push(["Dining", "EXPENSE", 82.8, 25, "Pai", "Dinner with friends", "Credit card"]);
    }

    return rows.map(([categoryName, type, amount, day, payee, note, paymentMethod]) => ({
      workspaceId: workspace.id,
      categoryId: categoryByName.get(categoryName)!.id,
      type,
      amount: cents(amount),
      date: setDate(month, day),
      payee,
      note,
      paymentMethod
    }));
  });

  await db.transaction.createMany({ data: transactions });

  const recurringStart = subMonths(currentMonth, 2);
  const recurringSeeds: Array<{
    categoryName: string;
    type: TransactionType;
    amount: number;
    frequency: RecurringFrequency;
    dayOfMonth?: number;
    payee: string;
    note?: string;
    paymentMethod?: string;
  }> = [
    {
      categoryName: "Salary",
      type: "INCOME",
      amount: 4650,
      frequency: "MONTHLY",
      dayOfMonth: 1,
      payee: "Northstar Studio",
      note: "Monthly payroll",
      paymentMethod: "Bank transfer"
    },
    {
      categoryName: "Rent",
      type: "EXPENSE",
      amount: 1850,
      frequency: "MONTHLY",
      dayOfMonth: 2,
      payee: "Harrington Lofts",
      note: "Rent",
      paymentMethod: "Pre-authorized"
    },
    {
      categoryName: "Subscriptions",
      type: "EXPENSE",
      amount: 18.99,
      frequency: "MONTHLY",
      dayOfMonth: 7,
      payee: "Streaming Co.",
      paymentMethod: "Credit card"
    },
    {
      categoryName: "Transport",
      type: "EXPENSE",
      amount: 156,
      frequency: "MONTHLY",
      dayOfMonth: 5,
      payee: "PRESTO monthly pass",
      paymentMethod: "Credit card"
    }
  ];

  for (const seed of recurringSeeds) {
    const category = categoryByName.get(seed.categoryName);
    if (!category) continue;
    await db.recurringRule.create({
      data: {
        workspaceId: workspace.id,
        categoryId: category.id,
        type: seed.type,
        amount: cents(seed.amount),
        frequency: seed.frequency,
        startDate: setDate(recurringStart, seed.dayOfMonth ?? 1),
        status: "ACTIVE",
        payee: seed.payee,
        note: seed.note ?? null,
        paymentMethod: seed.paymentMethod ?? null
      }
    });
  }

  return workspace;
}
