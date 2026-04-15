export function formatCurrency(
  amountCents: number,
  currency = "CAD",
  locale = "en-CA",
  options: Intl.NumberFormatOptions = {}
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    ...options
  }).format(amountCents / 100);
}

export function parseCurrencyToCents(value: string | number) {
  if (typeof value === "number") {
    return Math.round(value * 100);
  }

  const normalized = normalizeCurrencyInput(value);
  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
    return Number.NaN;
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

function normalizeCurrencyInput(value: string) {
  const raw = value
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "");

  if (!raw) {
    return "";
  }

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma && hasDot) {
    const decimalSeparator = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    return raw.replaceAll(thousandsSeparator, "").replace(decimalSeparator, ".");
  }

  if (hasComma) {
    return normalizeSingleSeparator(raw, ",");
  }

  if (hasDot) {
    return normalizeSingleSeparator(raw, ".");
  }

  return raw;
}

function normalizeSingleSeparator(value: string, separator: "," | ".") {
  const separatorCount = value.split(separator).length - 1;
  if (separatorCount > 1) {
    return value.replaceAll(separator, "");
  }

  const [left = "", right = ""] = value.split(separator);
  if (right.length === 3 && left.length > 0) {
    return `${left}${right}`;
  }

  return `${left}.${right}`;
}
