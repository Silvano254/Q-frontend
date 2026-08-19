import { 
  TrendingUp, 
  FileSpreadsheet, 
  FileText, 
  CreditCard,
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
    title: "Binti Business Brief",
    subtitle: "Money, open proposals & attention items",
    prompt: "Provide a complete business brief covering money collected, open quotes, and items needing attention."
  },
  {
    icon: FileSpreadsheet,
    title: "Upload & restructure business data",
    subtitle: "Import CSV client lists, sales & inventory",
    prompt: "I want to upload a document to import clients and data into Binti Events."
  },
  {
    icon: FileText,
    title: "Create or convert a quote",
    subtitle: "Draft proposal & convert to invoice",
    prompt: "How do I create a quotation and convert it into a tax invoice?"
  },
  {
    icon: CreditCard,
    title: "Payment & debt recovery",
    subtitle: "Track unpaid balances & reminder drafts",
    prompt: "Show me all overdue invoices and draft a follow-up reminder for overdue clients."
  }
];
