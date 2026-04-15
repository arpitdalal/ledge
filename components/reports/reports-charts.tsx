"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/domain/format/currency";

const colors: Record<string, string> = {
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

export function CategoryBreakdownChart({
  data,
  currency,
  locale
}: {
  data: Array<{ name: string; amount: number; color: string }>;
  currency: string;
  locale: string;
}) {
  const mounted = useChartMounted();
  const formatAxisAmount = (value: number | string) =>
    formatCurrency(Math.round(Number(value)), currency, locale, { maximumFractionDigits: 0 });

  if (data.length === 0) {
    return <div className="grid h-72 place-items-center text-sm text-[hsl(var(--muted-foreground))]">No category spending in this period.</div>;
  }

  if (!mounted) {
    return <div className="h-72" aria-hidden="true" />;
  }

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 1, height: 1 }}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={formatAxisAmount} />
          <YAxis dataKey="name" type="category" width={92} />
          <Tooltip formatter={(value) => formatCurrency(Number(value), currency, locale)} />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={colors[entry.color] ?? colors.slate} />
            ))}
          </Bar>
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
