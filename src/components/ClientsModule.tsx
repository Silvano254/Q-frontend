import React, { useState } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  ChevronLeft, 
  FileText, 
  Receipt, 
  CreditCard, 
  Mail, 
  Phone, 
  MapPin, 
  TrendingUp, 
  DollarSign, 
  Notebook,
  UserCheck,
  Award
} from "lucide-react";
import { Client, Quote, Invoice } from "../types.js";

interface ClientsModuleProps {
  clients: Client[];
  quotes: Quote[];
  invoices: Invoice[];
  currency: string;
  onCreateClient: (client: Partial<Client>) => Promise<void>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  showToast: (message: string, type?: "success" | "warning") => void;
}

export default function ClientsModule({
  clients,
  quotes,
  invoices,
  currency,
  onCreateClient,
  onUpdateClient,
  onDeleteClient,
  showToast
}: ClientsModuleProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<'active' | 'inactive'>("active");

  const startEdit = (client: Client) => {
    setSelectedClient(client);
    setIsEditing(true);
    setName(client.name);
    setCompany(client.company || "");
    setPhone(client.phone || "");
    setEmail(client.email || "");
    setAddress(client.address || "");
    setTaxNumber(client.taxNumber || "");
    setNotes(client.notes || "");
    setStatus(client.status);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      showToast("Name and email are required.", "warning");
      return;
    }

    const payload: Partial<Client> = {
      name,
      company,
      phone,
      email,
      address,
      taxNumber,
      notes,
      status
    };

    if (isEditing && selectedClient) {
      await onUpdateClient(selectedClient.id, payload);
      setIsEditing(false);
      const updated = clients.find(c => c.id === selectedClient.id);
      if (updated) setSelectedClient({ ...updated, ...payload });
    } else {
      await onCreateClient(payload);
      setIsCreating(false);
    }
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setCompany("");
    setPhone("");
    setEmail("");
    setAddress("");
    setTaxNumber("");
    setNotes("");
    setStatus("active");
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clientQuotes = selectedClient ? quotes.filter(q => q.clientId === selectedClient.id) : [];
  const clientInvoices = selectedClient ? invoices.filter(i => i.clientId === selectedClient.id) : [];
  const clientPayments = selectedClient ? invoices.filter(i => i.clientId === selectedClient.id).flatMap(inv => 
    (inv.payments || []).map(p => ({
      ...p,
      invoiceNumber: inv.invoiceNumber
    }))
  ) : [];

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#6B46C1]" />
            <span>Corporate Client Management</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Nurture event leads, track account statements, and view historical revenues.</p>
        </div>
        {!selectedClient && !isCreating && (
          <button
            onClick={() => {
              setIsCreating(true);
              setIsEditing(false);
              resetForm();
            }}
            className="px-4 py-2 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Corporate Client</span>
          </button>
        )}
      </div>

      {/* VIEW 1: CREATION / EDITING FORM */}
      {(isCreating || isEditing) && (
        <div className="glass-card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="font-bold text-sm text-gray-800">{isEditing ? "Edit Corporate Client File" : "Create New Client Portfolio"}</h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setIsEditing(false);
              }}
              className="text-gray-400 hover:text-gray-600 text-xs flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>

          <form onSubmit={handleSaveClient} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Representative Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Silvan Otieno"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Company Name / Organization</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Safaricom PLC"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Primary Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@safaricom.co.ke"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Active Mobile Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +254 700 111222"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Physical Location Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Waiyaki Way, Nairobi"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Company Tax PIN Number (KRA PIN)</label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="e.g. P051234567A"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Status Flag</label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-48 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-700"
              >
                <option value="active">Active Business</option>
                <option value="inactive">Inactive / On Hold</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Confidential Client Notes & Specifics</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferences on decor colors, tent requirements, transport limits, or credit allowance settings."
                rows={4}
                className="w-full p-4 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow shadow-[#6B46C1]/20 transition-all"
              >
                {isEditing ? "Save Updated Profile" : "Register Corporate Client"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition-all"
              >
                Go Back
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 2: DETAILED CLIENT PROFILE TIMELINE */}
      {selectedClient && !isCreating && !isEditing && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between glass-card p-4">
            <button
              onClick={() => setSelectedClient(null)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center space-x-1"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
              <span>Back to Clients Directory</span>
            </button>
            <button
              onClick={() => startEdit(selectedClient)}
              className="text-xs font-semibold text-[#6B46C1] hover:underline"
            >
              Edit Profile details
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 text-[#6B46C1] rounded-full flex items-center justify-center font-bold text-lg">
                  {selectedClient.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-800">{selectedClient.name}</h3>
                  <p className="text-xs text-gray-400 capitalize">{selectedClient.company || "Private Entity"}</p>
                </div>
              </div>

              <div className="pt-2">
                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedClient.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {selectedClient.status} Client
                </span>
              </div>

              <div className="space-y-4 border-t border-gray-50 pt-4 text-xs text-gray-600">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{selectedClient.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{selectedClient.phone || "No phone listed"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{selectedClient.address || "No physical address"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Award className="w-4 h-4 text-gray-400" />
                  <span>PIN: {selectedClient.taxNumber || "Non-VAT registered"}</span>
                </div>
              </div>

              <div className="bg-purple-50/20 p-4 border border-purple-100/40 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-[#6B46C1] uppercase tracking-wider block">Financial Performance</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Manual Settled Revenue:</span>
                  <span className="font-bold text-emerald-600">{currency} {selectedClient.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Invoices Count:</span>
                  <span className="font-semibold text-gray-800">{selectedClient.invoicesCount} issued</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Quotes Proposals:</span>
                  <span className="font-semibold text-gray-800">{selectedClient.quotesCount} quotes</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-50 pt-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Director Notes & Directives</span>
                <p className="text-xs text-gray-600 bg-gray-50/50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed">{selectedClient.notes || "No custom profile notes entered."}</p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 space-y-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Historical Proposals & Quotes ({clientQuotes.length})</span>
                {clientQuotes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No historical quotes proposals logged for this client.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px]">
                          <th className="pb-2">Quote #</th>
                          <th className="pb-2">Created Date</th>
                          <th className="pb-2">Expiry Date</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Quote Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {clientQuotes.map(q => (
                          <tr key={q.id}>
                            <td className="py-2.5 font-semibold text-[#6B46C1]">{q.quoteNumber}</td>
                            <td className="py-2.5">{q.quoteDate}</td>
                            <td className="py-2.5">{q.expiryDate}</td>
                            <td className="py-2.5 capitalize">{q.status}</td>
                            <td className="py-2.5 text-right font-bold text-gray-800">{currency} {q.grandTotal.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="glass-card p-6 space-y-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Ledger Invoices Statement ({clientInvoices.length})</span>
                {clientInvoices.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No tax invoices generated for this account.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px]">
                          <th className="pb-2">Invoice #</th>
                          <th className="pb-2">Issue Date</th>
                          <th className="pb-2">Due Date</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Balance Remaining</th>
                          <th className="pb-2 text-right">Total Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {clientInvoices.map(inv => (
                          <tr key={inv.id}>
                            <td className="py-2.5 font-semibold text-[#6B46C1]">{inv.invoiceNumber}</td>
                            <td className="py-2.5">{inv.issueDate}</td>
                            <td className="py-2.5">{inv.dueDate}</td>
                            <td className="py-2.5">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                inv.status === "paid" ? "bg-green-100 text-green-700" :
                                inv.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
                                inv.status === "overdue" ? "bg-red-100 text-red-700" :
                                "bg-blue-100 text-blue-700"
                              }`}>
                                {inv.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-medium text-amber-600">{currency} {inv.balanceRemaining.toLocaleString()}</td>
                            <td className="py-2.5 text-right font-bold text-gray-800">{currency} {inv.grandTotal.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="glass-card p-6 space-y-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Manual Payment Receipts History ({clientPayments.length})</span>
                {clientPayments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No historical payment slips recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px]">
                          <th className="pb-2">Invoice Ref #</th>
                          <th className="pb-2">Receipt Date</th>
                          <th className="pb-2">Method</th>
                          <th className="pb-2">Transaction ID</th>
                          <th className="pb-2 text-right">Paid Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {clientPayments.map((p, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 font-semibold text-gray-700">{p.invoiceNumber}</td>
                            <td className="py-2.5">{p.paymentDate}</td>
                            <td className="py-2.5 capitalize">{p.paymentMethod.replace("_", " ")}</td>
                            <td className="py-2.5 font-mono text-[10px] text-[#6B46C1]">{p.referenceNumber || "N/A"}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-600">+{currency} {p.amountPaid.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MAIN CLIENT DIRECTORY LISTING */}
      {!selectedClient && !isCreating && !isEditing && (
        <div className="glass-card p-6 space-y-4">
          <div className="relative max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients directory by name, company, email, phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/10 focus:border-[#6B46C1]"
            />
          </div>

          <div className="overflow-x-auto border border-gray-50 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Representative Name</th>
                  <th className="p-4">Corporate Entity</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4 text-right">Settled Revenue</th>
                  <th className="p-4 text-center">Active Status</th>
                  <th className="p-4 text-right">Profile Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No corporate event clients found.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-[#6B46C1]">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="hover:underline text-left text-xs"
                        >
                          {client.name}
                        </button>
                      </td>
                      <td className="p-4 font-semibold text-gray-800">{client.company || "-"}</td>
                      <td className="p-4 text-gray-500">{client.email}</td>
                      <td className="p-4 text-gray-500">{client.phone || "-"}</td>
                      <td className="p-4 text-right font-bold text-emerald-600">
                        {currency} {client.revenue.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          client.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="p-1.5 text-gray-400 hover:text-[#6B46C1] hover:bg-purple-50 rounded-lg transition-all"
                            title="Open Client Account History"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                          
                          <button
                            onClick={() => startEdit(client)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Edit Details"
                          >
                            <Notebook className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm("Warning: Deleting this client does not delete their invoices, but removes their record from directory. Proceed?")) {
                                onDeleteClient(client.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Client File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
