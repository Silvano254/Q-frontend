import React, { useState } from "react";
import { CreditCard, Search, DollarSign, Calendar, Download, Eye, Receipt, FileSpreadsheet } from "lucide-react";
import { Invoice, PaymentRecord } from "../../../shared/types.js";

interface PaymentsModuleProps {
  invoices: Invoice[];
  currency: string;
  onSelectInvoice: (invoice: Invoice) => void;
  onNavigateToModule: (moduleName: string) => void;
}

export default function PaymentsModule({
  invoices,
  currency,
  onSelectInvoice,
  onNavigateToModule
}: PaymentsModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  // Flat map all payments with invoice info
  const allPayments = invoices.flatMap(inv => 
    (inv.payments || []).map(p => ({
      ...p,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName
    }))
  ).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  // Filter payments
  const filteredPayments = allPayments.filter(p => {
    const matchesSearch = p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMethod = methodFilter === "all" || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  // Calculate quick totals
  const totalReceived = filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalBank = filteredPayments.filter(p => p.paymentMethod === "bank_transfer").reduce((sum, p) => sum + p.amountPaid, 0);
  const totalMobile = filteredPayments.filter(p => p.paymentMethod === "mobile_transfer").reduce((sum, p) => sum + p.amountPaid, 0);
  const totalCash = filteredPayments.filter(p => p.paymentMethod === "cash").reduce((sum, p) => sum + p.amountPaid, 0);

  // Export payments list to CSV
  const exportPaymentsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Payment ID,Payment Date,Invoice Number,Client Name,Payment Method,Reference Number,Amount Paid,Notes\n";
    
    filteredPayments.forEach(p => {
      const row = [
        p.id,
        p.paymentDate,
        p.invoiceNumber,
        `"${p.clientName.replace(/"/g, '""')}"`,
        p.paymentMethod,
        p.referenceNumber || "N/A",
        p.amountPaid,
        `"${(p.notes || "").replace(/"/g, '""')}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `binti_manual_payments_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <span>Manual Payments Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Audit log of payments received, cash collections, bank checks, and transaction identifiers.</p>
        </div>
        <button
          onClick={exportPaymentsCSV}
          className="px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow flex items-center space-x-2 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-[#D4AF37]" />
          <span>Export Ledger (CSV)</span>
        </button>
      </div>

      {/* Aggregate Stats widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Ledger */}
        <div className="glass-card p-5 border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Audited Receipts</span>
            <span className="text-xl font-bold text-emerald-900 block mt-1">{currency} {totalReceived.toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Bank Wire */}
        <div className="glass-card p-5 border-l-4 border-l-blue-500 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Bank Transfers Wire</span>
            <span className="text-lg font-bold text-gray-800 block mt-1">{currency} {totalBank.toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
            Bank
          </div>
        </div>

        {/* Mobile Transfer */}
        <div className="glass-card p-5 border-l-4 border-l-purple-500 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">M-Pesa / Mobile</span>
            <span className="text-lg font-bold text-gray-800 block mt-1">{currency} {totalMobile.toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-bold text-xs uppercase">
            Mobile
          </div>
        </div>

        {/* Cash */}
        <div className="glass-card p-5 border-l-4 border-l-amber-500 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Direct Cash Settlements</span>
            <span className="text-lg font-bold text-gray-800 block mt-1">{currency} {totalCash.toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-bold text-xs uppercase">
            Cash
          </div>
        </div>
      </div>

      {/* Ledger Directory Table */}
      <div className="glass-card p-6 space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipts by client, invoice ID, transaction reference..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center space-x-2">
            {["all", "bank_transfer", "mobile_transfer", "cash", "cheque"].map(method => (
              <button
                key={method}
                onClick={() => setMethodFilter(method)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize tracking-wide ${
                  methodFilter === method ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {method.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table Grid */}
        <div className="overflow-x-auto border border-gray-50 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                <th className="p-4">Receipt Date</th>
                <th className="p-4">Statement Invoice ID</th>
                <th className="p-4">Billed Client Account</th>
                <th className="p-4">Settlement Method</th>
                <th className="p-4">Reference / TX ID</th>
                <th className="p-4">Audited Log Note</th>
                <th className="p-4 text-right">Settled Amount</th>
                <th className="p-4 text-right">Invoice Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No matching payment receipt slips found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const correlatedInvoice = invoices.find(inv => inv.id === p.invoiceId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-semibold text-gray-800">{p.paymentDate}</td>
                      <td className="p-4 font-bold text-[#6B46C1]">{p.invoiceNumber}</td>
                      <td className="p-4 font-semibold text-gray-800">{p.clientName}</td>
                      <td className="p-4 capitalize">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                          p.paymentMethod === "bank_transfer" ? "bg-blue-50 text-blue-700 border-blue-100" :
                          p.paymentMethod === "mobile_transfer" ? "bg-purple-50 text-purple-700 border-purple-100" :
                          p.paymentMethod === "cash" ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-gray-50 text-gray-600 border-gray-200"
                        }`}>
                          {p.paymentMethod.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-600 text-[11px]">{p.referenceNumber || "N/A"}</td>
                      <td className="p-4 text-gray-500 truncate max-w-xs">{p.notes || "-"}</td>
                      <td className="p-4 text-right font-bold text-emerald-600">+{currency} {p.amountPaid.toLocaleString()}</td>
                      <td className="p-4 text-right">
                        {correlatedInvoice ? (
                          <button
                            onClick={() => {
                              onSelectInvoice(correlatedInvoice);
                              onNavigateToModule("Invoices");
                            }}
                            className="p-1.5 text-gray-400 hover:text-[#6B46C1] hover:bg-purple-50 rounded-lg transition-all"
                            title="Inspect Linked Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Stale Ref</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
