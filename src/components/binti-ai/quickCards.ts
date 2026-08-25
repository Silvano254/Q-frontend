import {
  TrendingUp,
  CreditCard,
  FileText,
  FileSpreadsheet,
  LucideIcon
} from "lucide-react";

export interface QuickCardItem {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  prompt: string;
}

export const QUICK_CARDS: QuickCardItem[] = [
  {
    icon: TrendingUp,
    title: "Business brief",
    subtitle: "Revenue, outstanding cash & what needs action",
    prompt:
      "Give me a business brief: revenue this month, who owes me money, and anything else that needs my attention."
  },
  {
    icon: CreditCard,
    title: "Chase payments",
    subtitle: "Overdue invoices & ready-to-send reminders",
    prompt:
      "List all overdue invoices with balances, then draft a short polite follow-up message for each client."
  },
  {
    icon: FileText,
    title: "Draft a quotation",
    subtitle: "Describe items — Binti structures & stages it",
    prompt:
      "Create a quotation for a corporate workshop: 30 dressed seats @350, 6 dressed rectangular tables @500 and a projector screen @8000."
  },
  {
    icon: FileSpreadsheet,
    title: "Import from a document",
    subtitle: "CSV/Excel client lists, sales & inventory",
    prompt:
      "I want to upload a document to import clients and their details into Binti Events."
  }
];
