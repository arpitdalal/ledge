import { format } from "date-fns";

export function formatDate(date: Date | string, pattern = "MMM d, yyyy") {
  return format(new Date(date), pattern);
}

export function formatMonthLabel(date: Date | string) {
  return format(new Date(date), "MMM yyyy");
}

export function toDateInputValue(date: Date | string) {
  return format(new Date(date), "yyyy-MM-dd");
}
