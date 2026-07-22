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
  ArrowDownRight,
  TrendingUp,
  Activity,
  ArrowRight
} from "lucide-react";
import { Client, Quote, Invoice } from "../../../shared/types.js";

interface DashboardProps {
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

  // Card definitions
  const statCards = [
    {
      title: "Total Payments Paid",
      value: formatCur(stats.totalPaid),
      percentage: "+15.8%",
      isPositive: true,
      compare: "vs last month (KES 820K)",
      sparkline: "up",
      icon: DollarSign,
      color: "from-emerald-50 to-teal-50 border-emerald-100 text-emerald-600",
      accent: "#10B981"
    },
    {
      title: "Total Invoiced Value",
      value: formatCur(stats.totalInvoicesValue),
      percentage: "+21.4%",
      isPositive: true,
      compare: "vs last month (KES 940K)",
      sparkline: "up",
      icon: Receipt,
      color: "from-purple-50 to-indigo-50 border-purple-100 text-purple-600",
      accent: "#6B46C1"
    },
    {
      title: "Total Outstanding",
      value: formatCur(stats.totalOutstanding),
      percentage: "-4.2%",
      isPositive: true, // positive meaning balance went down
      compare: "vs last month (KES 440K)",
      sparkline: "down",
      icon: Clock,
      color: "from-amber-50 to-orange-50 border-amber-100 text-amber-600",
      accent: "#D4AF37"
    },
    {
      title: "Active Clients",
      value: stats.activeClientsCount.toString(),
      percentage: "+2 new",
      isPositive: true,
      compare: "this billing quarter",
      sparkline: "up",
      icon: Users,
      color: "from-blue-50 to-cyan-50 border-blue-100 text-blue-600",
      accent: "#3B82F6"
    },
    {
      title: "Total Quotes Created",
      value: stats.totalQuotes.toString(),
      percentage: "+12.0%",
      isPositive: true,
      compare: "vs last month (15 quotes)",
      sparkline: "up",
      icon: FileText,
      color: "from-pink-50 to-rose-50 border-pink-100 text-pink-600",
      accent: "#EC4899"
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate.toFixed(1)}%`,
      percentage: "+3.5%",
      isPositive: true,
      compare: "Quote → Invoice conversions",
      sparkline: "flat",
      icon: Percent,
      color: "from-indigo-50 to-violet-50 border-indigo-100 text-indigo-600",
      accent: "#8B5CF6"
    },
    {
      title: "Avg Invoice Value",
      value: formatCur(stats.averageInvoiceValue),
      percentage: "-1.8%",
      isPositive: false,
      compare: "vs annual average",
      sparkline: "down",
      icon: Activity,
      color: "from-sky-50 to-slate-50 border-sky-100 text-sky-600",
      accent: "#0EA5E9"
    }
  ];

  // Request Gemini report (now local template engine)
  const handleGenerateAiReport = async () => {
    setLoadingAi(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success) {
        setAiReport(data.analysis);
      } else {
        setAiReport("Unable to load AI analytics report: " + data.message);
      }
    } catch (err) {
      setAiReport("Connection failure. Make sure the server is fully running.");
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
            Binti Events Suite
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            Welcome Back, Executive Admin
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Manage your high-end corporate events, stretch tents hire, and creative consulting invoicing from a single, beautiful unified workspace.
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

      {/* Grid of Metric Cards */}
      <div>
        <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-[#6B46C1]" />
          <span>Core Billing Metrics</span>
        </h3>
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

                <div className="mt-4">
                  <h4 className="text-2xl font-bold text-gray-800 tracking-tight">{card.value}</h4>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`text-xs font-bold flex items-center ${card.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                      {card.isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                      {card.percentage}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate">{card.compare}</span>
                  </div>
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
              <h4 className="text-sm font-bold text-gray-800">Binti AI Executive Business Analyst</h4>
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
              <p className="text-xs text-gray-500 mt-1">Status of proposed weddings & corporate packages.</p>
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
                        {inv.status.replace("_", " ")}
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
