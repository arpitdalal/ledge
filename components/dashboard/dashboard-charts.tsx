"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/domain/format/currency";

const categoryColors: Record<string, string> = {
  slate: "#64748b",
  zinc: "#71717a",
  emerald: "#059669",
  teal: "#0d9488",
  sky: "#0284c7",
  indigo: "#4f46e5",
  violet: "#7c3aed",
  rose: "#e11d48",
  amber: "#d97706"
};

export function SpendByCategoryChart({
  data,
  currency,
  locale
}: {
  data: Array<{ name: string; amount: number; color: string }>;
  currency: string;
  locale: string;
}) {
  const mounted = useChartMounted();

  if (data.length === 0) {
    return <div className="grid h-72 place-items-center text-sm text-[hsl(var(--muted-foreground))]">No expenses this month.</div>;
  }

  if (!mounted) {
    return <div className="h-72" aria-hidden="true" />;
  }

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 1, height: 1 }}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="name" innerRadius={54} outerRadius={86} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={categoryColors[entry.color] ?? "#64748b"} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyIncomeExpenseChart({
  data,
  currency,
  locale
}: {
  data: Array<{ month: string; income: number; expenses: number }>;
  currency: string;
  locale: string;
}) {
  const mounted = useChartMounted();
  const formatAxisAmount = (value: number | string) =>
    formatCurrency(Math.round(Number(value)), currency, locale, { maximumFractionDigits: 0 });

  if (!mounted) {
    return <div className="h-72" aria-hidden="true" />;
  }

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 1, height: 1 }}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={formatAxisAmount} />
          <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} />
          <Legend />
          <Bar dataKey="income" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="#e11d48" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function useChartMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return mounted;
}
