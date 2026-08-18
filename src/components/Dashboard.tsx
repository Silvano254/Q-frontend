import React, { useState } from "react";
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  FileText, 
  Receipt, 
  Users, 
  Percent, 
  Sparkles, 
  ArrowUpRight, 
  TrendingUp,
  Activity,
  ArrowRight
} from "lucide-react";
import { Client, Quote, Invoice } from "../types";
import { askGeminiAssistant } from "../services/geminiService";

interface DashboardProps {
  currentUser?: { name: string; role: string; email: string } | null;
  stats: {
    totalInvoicesValue: number;
    totalPaid: number;
    totalOutstanding: number;
    totalQuotes: number;
    totalInvoices: number;
    activeClientsCount: number;
    averageInvoiceValue: number;
    conversionRate: number;
  };
  clients: Client[];
  quotes: Quote[];
  invoices: Invoice[];
  currency: string;
  setActiveTab: (tab: string) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onSelectQuote: (quote: Quote) => void;
}

export default function Dashboard({ 
  currentUser,
  stats, 
  clients, 
  quotes, 
  invoices, 
  currency, 
  setActiveTab,
  onSelectInvoice,
  onSelectQuote
}: DashboardProps) {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Dynamic Time-of-Day Greeting Helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Helper to format currency
  const formatCur = (val: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Static Sparkline trend generators
  const renderSparkline = (type: "up" | "down" | "flat") => {
    const color = type === "up" ? "#10B981" : type === "down" ? "#EF4444" : "#F59E0B";
    const points = type === "up" 
      ? "0,20 15,18 30,12 45,15 60,8 75,10 90,2"
      : type === "down"
      ? "0,2 15,6 30,15 45,10 60,18 75,14 90,20"
      : "0,12 15,10 30,14 45,12 60,11 75,13 90,12";
    return (
      <svg className="w-16 h-8 overflow-visible" viewBox="0 0 90 20">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // State for metric timeframe filter
  const [timeframe, setTimeframe] = useState<"all" | "this_month" | "last_month">("all");

  // Dynamic Month-over-Month (MoM) calculations
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
  const prevYear = curMonth === 0 ? curYear - 1 : curYear;

  // Monthly Paid
  let curMonthPaid = 0;
  let prevMonthPaid = 0;

  (invoices || []).forEach(inv => {
    if (inv.payments && inv.payments.length > 0) {
      inv.payments.forEach(p => {
        if (!p.paymentDate) return;
        const d = new Date(p.paymentDate);
        if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
          curMonthPaid += p.amountPaid || 0;
        } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
          prevMonthPaid += p.amountPaid || 0;
        }
      });
    } else {
      const dateStr = inv.issueDate || (inv as any).date;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const paidAmt = Math.max(0, (inv.grandTotal || 0) - (inv.balanceRemaining || 0));
      if (paidAmt > 0) {
        if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
          curMonthPaid += paidAmt;
        } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
          prevMonthPaid += paidAmt;
        }
      }
    }
  });

  const paidMomPct = prevMonthPaid > 0 
    ? ((curMonthPaid - prevMonthPaid) / prevMonthPaid) * 100 
    : curMonthPaid > 0 ? 100 : 0;

  // Monthly Invoiced & Invoice Counts
  let curMonthInvoiced = 0;
  let prevMonthInvoiced = 0;
  let curMonthInvoicesCount = 0;
  let prevMonthInvoicesCount = 0;
  let curMonthOutstanding = 0;
  let prevMonthOutstanding = 0;

  (invoices || []).forEach(inv => {
    const dateStr = inv.issueDate || (inv as any).date;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
      curMonthInvoiced += inv.grandTotal || 0;
      curMonthInvoicesCount += 1;
      curMonthOutstanding += inv.balanceRemaining || 0;
    } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
      prevMonthInvoiced += inv.grandTotal || 0;
      prevMonthInvoicesCount += 1;
      prevMonthOutstanding += inv.balanceRemaining || 0;
    }
  });

  const invoicedMomPct = prevMonthInvoiced > 0 
    ? ((curMonthInvoiced - prevMonthInvoiced) / prevMonthInvoiced) * 100 
    : curMonthInvoiced > 0 ? 100 : 0;

  const curAvgInvoiceValue = curMonthInvoicesCount > 0 ? curMonthInvoiced / curMonthInvoicesCount : 0;
  const prevAvgInvoiceValue = prevMonthInvoicesCount > 0 ? prevMonthInvoiced / prevMonthInvoicesCount : 0;

  // Monthly Quotes
  let curMonthQuotes = 0;
  let prevMonthQuotes = 0;

  (quotes || []).forEach(q => {
    const dateStr = q.quoteDate || (q as any).date;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
      curMonthQuotes += 1;
    } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
      prevMonthQuotes += 1;
    }
  });

  const quotesMomPct = prevMonthQuotes > 0 
    ? ((curMonthQuotes - prevMonthQuotes) / prevMonthQuotes) * 100 
    : curMonthQuotes > 0 ? 100 : 0;

  // Dynamic Value based on Timeframe filter
  const displayPaid = timeframe === "this_month" ? curMonthPaid : timeframe === "last_month" ? prevMonthPaid : stats.totalPaid;
  const displayInvoiced = timeframe === "this_month" ? curMonthInvoiced : timeframe === "last_month" ? prevMonthInvoiced : stats.totalInvoicesValue;
  const displayOutstanding = timeframe === "this_month" ? curMonthOutstanding : timeframe === "last_month" ? prevMonthOutstanding : stats.totalOutstanding;
  const displayQuotes = timeframe === "this_month" ? curMonthQuotes : timeframe === "last_month" ? prevMonthQuotes : stats.totalQuotes;
  const displayAvgInvoiceValue = timeframe === "this_month" ? curAvgInvoiceValue : timeframe === "last_month" ? prevAvgInvoiceValue : stats.averageInvoiceValue;

  const outstandingRatio = displayInvoiced > 0 ? (displayOutstanding / displayInvoiced) * 100 : 0;

  // Card definitions with Month-over-Month indicators
  const statCards = [
    {
      title: "Payments Received",
      value: formatCur(displayPaid),
      momValue: `${paidMomPct >= 0 ? '+' : ''}${paidMomPct.toFixed(1)}% vs last mo`,
      momIsPositive: paidMomPct >= 0,
      sparkline: paidMomPct >= 0 ? "up" : "down",
      icon: DollarSign,
      color: "from-emerald-50 to-teal-50 border-emerald-100 text-emerald-600",
      accent: "#10B981"
    },
    {
      title: "Invoiced Volume",
      value: formatCur(displayInvoiced),
      momValue: `${invoicedMomPct >= 0 ? '+' : ''}${invoicedMomPct.toFixed(1)}% vs last mo`,
      momIsPositive: invoicedMomPct >= 0,
      sparkline: invoicedMomPct >= 0 ? "up" : "down",
      icon: Receipt,
      color: "from-purple-50 to-indigo-50 border-purple-100 text-purple-600",
      accent: "#6B46C1"
    },
    {
      title: "Total Outstanding",
      value: formatCur(displayOutstanding),
      momValue: `${outstandingRatio.toFixed(1)}% of billed`,
      momIsPositive: outstandingRatio <= 25,
      sparkline: outstandingRatio <= 25 ? "down" : "up",
      icon: Clock,
      color: "from-amber-50 to-orange-50 border-amber-100 text-amber-600",
      accent: "#D4AF37"
    },
    {
      title: "Active Clients",
      value: stats.activeClientsCount.toString(),
      momValue: `Active Accounts`,
      momIsPositive: true,
      sparkline: "up",
      icon: Users,
      color: "from-blue-50 to-cyan-50 border-blue-100 text-blue-600",
      accent: "#3B82F6"
    },
    {
      title: "Quotes Created",
      value: displayQuotes.toString(),
      momValue: `${quotesMomPct >= 0 ? '+' : ''}${quotesMomPct.toFixed(1)}% vs last mo`,
      momIsPositive: quotesMomPct >= 0,
      sparkline: quotesMomPct >= 0 ? "up" : "down",
      icon: FileText,
      color: "from-pink-50 to-rose-50 border-pink-100 text-pink-600",
      accent: "#EC4899"
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate.toFixed(1)}%`,
      momValue: `${quotes.filter(q => q.status === "converted").length} Converted`,
      momIsPositive: true,
      sparkline: "flat",
      icon: Percent,
      color: "from-indigo-50 to-violet-50 border-indigo-100 text-indigo-600",
      accent: "#8B5CF6"
    },
    {
      title: "Avg Invoice Value",
      value: formatCur(displayAvgInvoiceValue),
      momValue: `Per Deal`,
      momIsPositive: true,
      sparkline: "up",
      icon: TrendingUp,
      color: "from-[#80237E]/10 to-purple-50 border-[#80237E]/20 text-[#80237E]",
      accent: "#80237E"
    }
  ];

  // Request Gemini report
  const handleGenerateAiReport = async () => {
    setLoadingAi(true);
    try {
      const prompt = `Provide a high-level executive financial and operations report for Binti Events.
Metrics:
- Total Invoices: ${stats.totalInvoices}
- Realized Revenue: ${currency}${stats.totalPaid.toLocaleString()}
- Pending Balances: ${currency}${stats.totalOutstanding.toLocaleString()}
- Total Quotes: ${stats.totalQuotes}
- Quote Conversion Rate: ${stats.conversionRate.toFixed(1)}%
- Active Clients: ${stats.activeClientsCount}

Provide 3 key business insights and 2 actionable recommendations for increasing booking conversion and revenue collection.`;
      const report = await askGeminiAssistant(prompt, [], {
        clientCount: stats.activeClientsCount,
        totalQuotes: stats.totalQuotes,
        totalInvoices: stats.totalInvoices,
        totalRevenue: stats.totalPaid,
        pendingBalance: stats.totalOutstanding,
        currency
      });
      setAiReport(report);
    } catch (err) {
      setAiReport("Unable to load business report. Please try again.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero Panel */}
      <div className="bg-gradient-to-r from-[#1F2937] via-[#2F3349] to-[#6B46C1] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-[#6B46C1]/20">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="max-w-2xl relative z-10 space-y-3">
          <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            Binti Events Management System
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            {getGreeting()}, {currentUser?.name || "Executive Admin"}
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Manage your event operations, stretch tents hire, quotations, and invoicing from a single, beautiful unified workspace.
          </p>
          <div className="pt-2 flex items-center space-x-4">
            <button
              onClick={() => setActiveTab("quotes")}
              className="px-5 py-2.5 bg-gradient-to-r from-[#6B46C1] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6B46C1] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#6B46C1]/30 transition-all flex items-center space-x-2"
            >
              <span>Create New Quote</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab("invoices")}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-semibold transition-all"
            >
              Manage Invoices
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Metric Cards with Timeframe Selector */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h3 className="text-base font-bold text-gray-800 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#6B46C1]" />
            <span>Core Billing Metrics</span>
          </h3>

          {/* Timeframe Filter Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTimeframe("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${timeframe === "all" ? "bg-white text-[#80237E] shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("this_month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${timeframe === "this_month" ? "bg-white text-[#80237E] shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("last_month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${timeframe === "last_month" ? "bg-white text-[#80237E] shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              Last Month
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx}
                className="glass-card p-6 border-l-4 hover:shadow-md transition-all flex flex-col justify-between"
                style={{ borderLeftColor: card.accent }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.title}</span>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <h4 className="text-2xl font-bold text-gray-800 tracking-tight">{card.value}</h4>
                  {card.momValue && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${card.momIsPositive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {card.momValue}
                    </span>
                  )}
                </div>

                {/* Mini trendline sparkline */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">Activity Sparkline</span>
                  {renderSparkline(card.sparkline as any)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Business Insights Panel */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-[#6B46C1] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800">Binti Business Analyst</h4>
              <p className="text-xs text-gray-500 mt-1">
                Generate instant strategic insights about events cash flows, outstanding balances, and customized recommendations.
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateAiReport}
            disabled={loadingAi}
            className="shrink-0 px-5 py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#6B46C1]/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {loadingAi ? (
              <span className="flex items-center space-x-2">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing data...</span>
              </span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Generate Business Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* AI Insight Result text */}
        {aiReport && (
          <div className="mt-5 p-5 bg-white rounded-2xl border border-purple-100 shadow-inner prose prose-purple prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
            <div className="font-bold text-xs text-[#6B46C1] uppercase tracking-widest mb-3 flex items-center space-x-1.5">
              <span>● CURRENT REPORT GENERATED</span>
            </div>
            {aiReport}
          </div>
        )}
      </div>

      {/* Split layout: Recent Quotes & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Quotes */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="text-sm font-bold text-gray-800">Recent Event Quotes</h4>
              <p className="text-xs text-gray-500 mt-1">Status of proposed event & hire packages.</p>
            </div>
            <button 
              onClick={() => setActiveTab("quotes")} 
              className="text-[#6B46C1] hover:text-purple-800 text-xs font-semibold flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Quote #</th>
                  <th className="pb-3 font-semibold">Client</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Total</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotes.slice(0, 5).map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-3.5">
                      <button
                        onClick={() => onSelectQuote(quote)}
                        className="text-xs font-semibold text-[#6B46C1] hover:underline"
                      >
                        {quote.quoteNumber}
                      </button>
                    </td>
                    <td className="py-3.5">
                      <p className="text-xs font-medium text-gray-700">{quote.clientName}</p>
                    </td>
                    <td className="py-3.5 text-xs text-gray-500">{quote.quoteDate}</td>
                    <td className="py-3.5 text-xs font-bold text-gray-800">{formatCur(quote.grandTotal)}</td>
                    <td className="py-3.5 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        quote.status === "converted" ? "bg-green-50 text-green-600" :
                        quote.status === "sent" ? "bg-blue-50 text-blue-600" :
                        quote.status === "draft" ? "bg-gray-100 text-gray-600" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {quote.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="text-sm font-bold text-gray-800">Recent Event Invoices</h4>
              <p className="text-xs text-gray-500 mt-1">Real-time status of pending, partial & settled invoices.</p>
            </div>
            <button 
              onClick={() => setActiveTab("invoices")} 
              className="text-[#6B46C1] hover:text-purple-800 text-xs font-semibold flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Invoice #</th>
                  <th className="pb-3 font-semibold">Client</th>
                  <th className="pb-3 font-semibold">Due Date</th>
                  <th className="pb-3 font-semibold">Total</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="text-xs font-semibold text-[#6B46C1] hover:underline"
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="py-3.5">
                      <p className="text-xs font-medium text-gray-700">{inv.clientName}</p>
                    </td>
                    <td className="py-3.5 text-xs text-gray-500">{inv.dueDate}</td>
                    <td className="py-3.5 text-xs font-bold text-gray-800">{formatCur(inv.grandTotal)}</td>
                    <td className="py-3.5 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        inv.status === "paid" ? "bg-green-100 text-green-700" :
                        inv.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
                        inv.status === "overdue" ? "bg-red-100 text-red-700" :
                        inv.status === "pending" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {(inv.status || 'draft').replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
