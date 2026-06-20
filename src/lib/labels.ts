import { Action, Category, Deadline, Priority } from "@prisma/client";

export const priorityLabel: Record<Priority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const priorityClasses: Record<Priority, string> = {
  CRITICAL:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
  MEDIUM:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  LOW: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

/** Solid accent color per priority — for the email card's left edge. */
export const priorityAccent: Record<Priority, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-400",
  MEDIUM: "bg-gold",
  LOW: "bg-border",
};

export const categoryLabel: Record<Category, string> = {
  FINANCE: "Finance",
  HR: "HR",
  OPERATIONS: "Operations",
  PRODUCTION: "Production",
  LEGAL: "Legal",
  PROCUREMENT: "Procurement",
  OTHER: "Other",
};

export const actionLabel: Record<Action, string> = {
  REPLY: "Reply",
  APPROVE: "Approve",
  DELEGATE: "Delegate",
  READ: "Read",
  IGNORE: "Ignore",
};

export const deadlineLabel: Record<Deadline, string> = {
  TODAY: "Today",
  TOMORROW: "Tomorrow",
  THIS_WEEK: "This Week",
  NONE: "No deadline",
};
