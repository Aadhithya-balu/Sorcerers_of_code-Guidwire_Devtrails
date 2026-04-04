import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "MMM dd, yyyy");
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    return format(parseISO(dateString), "MMM dd, yyyy HH:mm");
  } catch (e) {
    return dateString;
  }
}

export function getRiskLabel(score: number): string {
  if (score < 0.34) return "Low";
  if (score < 0.67) return "Medium";
  return "High";
}

export function getRiskColor(score: number): "green" | "yellow" | "red" {
  if (score < 0.34) return "green";
  if (score < 0.67) return "yellow";
  return "red";
}

export function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return "text-destructive border-destructive bg-destructive/10";
    case "high":
      return "text-primary border-primary bg-primary/10";
    case "medium":
      return "text-warning border-warning bg-warning/10";
    case "info":
    case "low":
      return "text-success border-success bg-success/10";
    default:
      return "text-muted-foreground border-muted bg-muted/10";
  }
}
