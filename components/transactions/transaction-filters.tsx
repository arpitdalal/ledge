import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type CategoryOption = {
  id: string;
  name: string;
  type: string;
};

const months = [
  ["", "Any month"],
  ["1", "January"],
  ["2", "February"],
  ["3", "March"],
  ["4", "April"],
  ["5", "May"],
  ["6", "June"],
  ["7", "July"],
  ["8", "August"],
  ["9", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"]
];

export function TransactionFilters({
  categories,
  searchParams
}: {
  categories: CategoryOption[];
  searchParams: Record<string, string | undefined>;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <form className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))_auto]" action="/transactions">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input name="q" defaultValue={searchParams.q} placeholder="Search payee, note, category" className="pl-9" />
      </div>
      <Select name="month" defaultValue={searchParams.month ?? ""} aria-label="Month">
        {months.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Input name="year" type="number" defaultValue={searchParams.year ?? String(currentYear)} aria-label="Year" min="2000" max="2100" />
      <Select name="type" defaultValue={searchParams.type ?? "ALL"} aria-label="Type">
        <option value="ALL">All types</option>
        <option value="INCOME">Income</option>
        <option value="EXPENSE">Expense</option>
      </Select>
      <Select name="categoryId" defaultValue={searchParams.categoryId ?? ""} aria-label="Category">
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Select name="sort" defaultValue={searchParams.sort ?? "newest"} aria-label="Sort">
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="amount-desc">Amount desc</option>
        <option value="amount-asc">Amount asc</option>
      </Select>
      <Button type="submit">Apply</Button>
    </form>
  );
}
