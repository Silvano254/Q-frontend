import React, { useState } from "react";
import { 
  TrendingUp, 
  Download, 
  BarChart3, 
  PieChart as PieIcon, 
  FileSpreadsheet, 
  DollarSign, 
  AlertTriangle, 
  Activity, 
  Award, 
  CheckCircle2, 
  CalendarCheck2, 
  Loader2, 
  Check 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from "recharts";
import { Invoice, Quote, Client, ProductService } from "../types";

interface ReportsAnalyticsModuleProps {
  invoices: Invoice[];
  quotes: Quote[];
  clients: Client[];
  products: ProductService[];
  currency: string;
}

export default function ReportsAnalyticsModule({
  invoices,
  quotes,
  clients,
  products,
  currency
}: ReportsAnalyticsModuleProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports'>('analytics');
  const [downloadingReport, setDownloadingReport] = useState<'aging' | 'sales' | 'ledger' | null>(null);

  // ==========================================
  // DATA PREPARATION FOR VISUALS
  // ==========================================

  // Chart 1: Revenue & Cash Flow Over Time (Monthly)
  const monthlyDataMap: { [key: string]: { invoiced: number; paid: number } } = {};
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  months.forEach(m => {
    monthlyDataMap[m] = { invoiced: 0, paid: 0 };
  });

  (invoices || []).forEach(inv => {
    const rawDate = inv.issueDate || (inv as any).date;
    if (!rawDate) return;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return;
    const mName = months[d.getMonth()];
    
    if (monthlyDataMap[mName]) {
      monthlyDataMap[mName].invoiced += Number(inv.grandTotal) || 0;
      const totalPaid = (inv.payments || []).reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
      monthlyDataMap[mName].paid += totalPaid;
    }
  });

  const chartMonthlyPerformance = months.map(m => ({
    month: m,
    "Grand Invoiced Amount": Math.round(monthlyDataMap[m].invoiced),
    "Manual Cash Collected": Math.round(monthlyDataMap[m].paid)
  }));

  // Chart 2: Accounts Receivable By Client (Top unpaid accounts)
  const clientARData = clients.map(c => {
    const clientInvs = invoices.filter(i => i.clientId === c.id);
    const outstanding = clientInvs.reduce((sum, i) => sum + i.balanceRemaining, 0);
    return {
      name: c.company || c.name,
      "Outstanding Balance": Math.round(outstanding)
    };
  }).filter(c => c["Outstanding Balance"] > 0)
    .sort((a, b) => b["Outstanding Balance"] - a["Outstanding Balance"])
    .slice(0, 5); // top 5 unpaid clients

  // Chart 3: Service Categories billing popularity
  const categoryBillingMap: { [key: string]: number } = {};
  (invoices || []).forEach(inv => {
    (inv.items || []).forEach(item => {
      const itemDesc = (item.description || "").toLowerCase();
      const matched = (products || []).find(p => (p.name || "").toLowerCase() === itemDesc);
      const catName = matched ? (matched.category || "Decor Styling") : "Decor Styling";
      categoryBillingMap[catName] = (categoryBillingMap[catName] || 0) + (Number(item.amount) || 0);
    });
  });

  const COLORS = ["#6B46C1", "#D4AF37", "#10B981", "#3B82F6", "#EC4899", "#F59E0B", "#1F2937"];
  const chartCategoryData = Object.keys(categoryBillingMap).map((cat, idx) => ({
    name: cat,
    value: Math.round(categoryBillingMap[cat]),
    color: COLORS[idx % COLORS.length]
  }));

  // Overall statistics summaries
  const totalInvoicedSum = (invoices || []).reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
  const totalPaidSum = (invoices || []).reduce((sum, i) => sum + ((Number(i.grandTotal) || 0) - (Number(i.balanceRemaining) || 0)), 0);
  const totalOutstandingSum = (invoices || []).reduce((sum, i) => sum + (Number(i.balanceRemaining) || 0), 0);

  // ==========================================
  // CSV SPREADSHEET GENERATORS
  // ==========================================

  const downloadAgingReportCSV = async () => {
    setDownloadingReport('aging');
    try {
      await new Promise(r => setTimeout(r, 80));
      let csv = "data:text/csv;charset=utf-8,";
      csv += "Client Representative,Company / Organization,Total Outstanding Balance,Email,Phone,Issued Invoices Count\n";
      
      clients.forEach(c => {
        const clientInvs = invoices.filter(i => i.clientId === c.id);
        const outstanding = clientInvs.reduce((sum, i) => sum + i.balanceRemaining, 0);
        if (outstanding > 0) {
          csv += `"${c.name}","${c.company || 'Private'}",${outstanding},"${c.email}","${c.phone || ''}",${clientInvs.length}\n`;
        }
      });

      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", `binti_accounts_receivable_aging_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingReport(null);
    }
  };

  const downloadServiceSalesCSV = async () => {
    setDownloadingReport('sales');
    try {
      await new Promise(r => setTimeout(r, 80));
      let csv = "data:text/csv;charset=utf-8,";
      csv += "Category Line,Total Billed Value,Popularity Segment\n";
      
      Object.keys(categoryBillingMap).forEach(cat => {
        csv += `"${cat}",${categoryBillingMap[cat]},"Event Hire"\n`;
      });

      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", `binti_sales_category_performance_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingReport(null);
    }
  };

  const downloadAnnualLedgerCSV = async () => {
    setDownloadingReport('ledger');
    try {
      await new Promise(r => setTimeout(r, 80));
      let csv = "data:text/csv;charset=utf-8,";
      csv += "Invoice Number,Client Representative,Issue Date,Due Date,Invoiced Grand Total,Outstanding Balance,Status\n";
      
      invoices.forEach(i => {
        csv += `"${i.invoiceNumber}","${i.clientName}","${i.issueDate}","${i.dueDate}",${i.grandTotal},${i.balanceRemaining},"${i.status}"\n`;
      });

      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", `binti_tax_invoice_ledger_${new Date().getFullYear()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingReport(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-[#6B46C1]" />
            <span>Executive Business Analytics & Reports</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Review organizational liquidity, outstanding invoices, service popularity, and compile auditing reports.</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'analytics' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#6B46C1]" />
            <span>Interactive Charts</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'reports' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Spreadsheet Reports</span>
          </button>
        </div>
      </div>

      {/* VIEW A: INTERACTIVE CHARTS & ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1 */}
            <div className="glass-card p-5 border-l-4 border-l-[#6B46C1] flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-50 text-[#6B46C1] rounded-xl flex items-center justify-center font-bold">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Billed Volume</span>
                <span className="text-lg font-bold text-gray-800 block mt-1">{currency} {totalInvoicedSum.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 mt-0.5 block font-semibold">{quotes.length} proposal drafts</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="glass-card p-5 border-l-4 border-l-emerald-500 flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Audited Liquid Cash Received</span>
                <span className="text-lg font-bold text-emerald-600 block mt-1">{currency} {totalPaidSum.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 mt-0.5 block font-semibold">
                  {Math.round((totalPaidSum / (totalInvoicedSum || 1)) * 100)}% recovery rate
                </span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="glass-card p-5 border-l-4 border-l-red-500 flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Accounts Receivables Outstanding</span>
                <span className="text-lg font-bold text-red-600 block mt-1">{currency} {totalOutstandingSum.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 mt-0.5 block font-semibold">Pending follow-ups</span>
              </div>
            </div>
          </div>

          {/* Recharts Row 1 */}
          <div className="glass-card p-6 space-y-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Annual Financial Performance Timeline</span>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartMonthlyPerformance} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value) => `${currency} ${Number(value).toLocaleString()}`} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Grand Invoiced Amount" stroke="#6B46C1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInvoiced)" />
                  <Area type="monotone" dataKey="Manual Cash Collected" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPaid)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recharts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 space-y-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Top 5 Accounts Receivable (Debtors Ledger)</span>
              {clientARData.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-gray-400 text-xs">
                  Outstanding ledger is completely clear. Outstanding balance: KES 0.
                </div>
              ) : (
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientARData} layout="vertical" margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                      <XAxis type="number" stroke="#9CA3AF" fontSize={9} />
                      <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={9} width={100} tickLine={false} />
                      <Tooltip formatter={(value) => `${currency} ${Number(value).toLocaleString()}`} />
                      <Bar dataKey="Outstanding Balance" fill="#6B46C1" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="glass-card p-6 space-y-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Service Category Performance Breakdown</span>
              {chartCategoryData.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-gray-400 text-xs">
                  Add invoices line items to populate category popularity metrics.
                </div>
              ) : (
                <div className="h-60 flex items-center justify-between">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${currency} ${Number(value).toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2 text-xs overflow-y-auto max-h-[220px] pr-2">
                    {chartCategoryData.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between space-x-1 border-b border-gray-50 pb-1">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-gray-600 truncate font-semibold">{entry.name}</span>
                        </div>
                        <span className="font-bold text-gray-800">{currency} {entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: SPREADSHEET REPORTS LIST */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="glass-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 bg-purple-50 text-[#6B46C1] rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h4 className="font-bold text-sm text-gray-800">Accounts Receivable Debtors Aging</h4>
              <p className="text-xs text-gray-400">Extracts a complete breakdown of clients with unpaid outstanding balances, their company/organization, phone numbers, and aged ledger values.</p>
            </div>
            <button
              disabled={downloadingReport !== null}
              onClick={downloadAgingReportCSV}
              className="w-full py-2 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-[#6B46C1]/10 disabled:opacity-75"
            >
              {downloadingReport === 'aging' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting Aging CSV...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Aging CSV</span>
                </>
              )}
            </button>
          </div>

          <div className="glass-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="font-bold text-sm text-gray-800">Event Asset Performance Sheet</h4>
              <p className="text-xs text-gray-400">Analyzes sales revenue generated per event hire asset category (Stretch Tents, Ambient Fairylights, Wooden structures) to see where the highest margins occur.</p>
            </div>
            <button
              disabled={downloadingReport !== null}
              onClick={downloadServiceSalesCSV}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow shadow-emerald-600/10 disabled:opacity-75"
            >
              {downloadingReport === 'sales' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting Sales CSV...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sales CSV</span>
                </>
              )}
            </button>
          </div>

          <div className="glass-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 bg-[#1F2937] text-[#D4AF37] rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h4 className="font-bold text-sm text-gray-800">Annual Tax Ledger</h4>
              <p className="text-xs text-gray-400">Downloads a complete chronologically-sorted table of every issued tax invoice, client name, tax PIN, total amount, and balance due for the current year.</p>
            </div>
            <button
              disabled={downloadingReport !== null}
              onClick={downloadAnnualLedgerCSV}
              className="w-full py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all disabled:opacity-75"
            >
              {downloadingReport === 'ledger' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                  <span>Exporting Ledger CSV...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Ledger CSV</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
