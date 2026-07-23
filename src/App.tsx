import React, { useState, useEffect } from "react";
import { Sparkles, Shield, User, Lock, ArrowRight, RefreshCw, AlertTriangle, Eye, Fingerprint, KeyRound, X, CheckCircle2 } from "lucide-react";
import Sidebar from "./components/Sidebar.js";
import TopBar from "./components/TopBar.js";
import Dashboard from "./components/Dashboard.js";
import QuotesModule from "./components/QuotesModule.js";
import InvoicesModule from "./components/InvoicesModule.js";
import ClientsModule from "./components/ClientsModule.js";
import ProductsModule from "./components/ProductsModule.js";
import PaymentsModule from "./components/PaymentsModule.js";
import ReportsAnalyticsModule from "./components/ReportsAnalyticsModule.js";
import SettingsModule from "./components/SettingsModule.js";
import { loginBiometric } from "./utils/webauthn.js";
import { getApiUrl } from "./config/api.js";
import { Client, ProductService, Quote, Invoice, CompanySettings, PaymentRecord } from "../../shared/types.js";

export default function App() {
  // Authentication States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("binti_authenticated") === "true";
  });
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; email: string } | null>(() => {
    const saved = localStorage.getItem("binti_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Biometric & Password Recovery States
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [demoGeneratedOtp, setDemoGeneratedOtp] = useState<string | null>(null);

  // Custom Toast State
  const [toast, setToast] = useState<string | null>(null);
  const [toastTimeoutId, setToastTimeoutId] = useState<any>(null);

  const showToast = (message: string) => {
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    setToast(message);
    const id = setTimeout(() => {
      setToast(null);
    }, 2500);
    setToastTimeoutId(id);
  };

  // Master Data States
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: "Binti Events",
    email: "billing@bintievents.co.ke",
    phone: "+254 712 345678",
    address: "Ngong Road, Nairobi, Kenya",
    taxNumber: "P051234567A",
    currency: "KES",
    invoiceFormat: "INV-2026-{SEQ}",
    quoteFormat: "QT-2026-{SEQ}",
    termsTemplate: "1. 50% commitment fee to book, with the balance paid before setup.\n2. Broken gear billed at cost.",
    emailTemplate: ""
  });

  // Cross-Module Selected States
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Global Search & Notification lists
  const [globalSearch, setGlobalSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: "overdue" | "upcoming" | "unpaid" | "payment" | "client";
    title: string;
    description: string;
    time: string;
    unread: boolean;
  }>>([]);

  // Fetch all data from Express API
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resClients, resProducts, resQuotes, resInvoices, resSettings] = await Promise.all([
        fetch(getApiUrl("/api/clients")).then(r => r.json()),
        fetch(getApiUrl("/api/products")).then(r => r.json()),
        fetch(getApiUrl("/api/quotes")).then(r => r.json()),
        fetch(getApiUrl("/api/invoices")).then(r => r.json()),
        fetch(getApiUrl("/api/settings")).then(r => r.json())
      ]);

      setClients(resClients || []);
      setProducts(resProducts || []);
      setQuotes(resQuotes || []);
      setInvoices(resInvoices || []);
      setCompanySettings(resSettings);

      // Generate dynamic notifications based on real status
      const generatedAlerts: typeof notifications = [];
      
      // Check overdue invoices
      (resInvoices || []).forEach((inv: Invoice) => {
        if (inv.status === "overdue" || (inv.status !== "paid" && new Date(inv.dueDate) < new Date())) {
          generatedAlerts.push({
            id: `notif-overdue-${inv.id}`,
            type: "overdue",
            title: `Invoice Overdue: ${inv.invoiceNumber}`,
            description: `${inv.clientName} is yet to clear KES ${inv.balanceRemaining.toLocaleString()}.`,
            time: `Due on ${inv.dueDate}`,
            unread: true
          });
        }
      });

      // Recent payment notification
      (resInvoices || []).forEach((inv: Invoice) => {
        (inv.payments || []).forEach((p, idx) => {
          generatedAlerts.push({
            id: `notif-pm-${inv.id}-${idx}`,
            type: "payment",
            title: `Payment Received - ${inv.invoiceNumber}`,
            description: `Manual receipt registered for ${inv.clientName}: KES ${p.amountPaid.toLocaleString()} paid via ${p.paymentMethod.replace("_", " ")}.`,
            time: p.paymentDate,
            unread: false
          });
        });
      });

      // Upcoming due date warnings
      (resInvoices || []).forEach((inv: Invoice) => {
        if (inv.status === "pending") {
          generatedAlerts.push({
            id: `notif-due-${inv.id}`,
            type: "upcoming",
            title: `Invoice Due Soon`,
            description: `${inv.clientName}'s invoice ${inv.invoiceNumber} is due in 3 days.`,
            time: `Due on ${inv.dueDate}`,
            unread: true
          });
        }
      });

      setNotifications(generatedAlerts.slice(0, 8)); // Top 8 active notices
    } catch (err) {
      console.error("Failed to load initial corporate database:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run on Mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  // LOGIN OPERATION
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        localStorage.setItem("binti_authenticated", "true");
        localStorage.setItem("binti_user", JSON.stringify(data.user));
      } else {
        setAuthError(data.message || "Invalid corporate login credentials.");
      }
    } catch (err) {
      setAuthError("Failed to establish server authentication bridge.");
    }
  };

  // LOGOUT OPERATION
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("binti_authenticated");
    localStorage.removeItem("binti_user");
  };

  // BIOMETRIC FINGERPRINT LOGIN HANDLER
  const handleStartBiometricLogin = async () => {
    setAuthError(null);
    try {
      const credentialId = await loginBiometric();
      const response = await fetch(getApiUrl("/api/auth/biometric-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail || "admin@bintievents.com", credentialId })
      });
      const data = await response.json();
      if (data.success) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        localStorage.setItem("binti_authenticated", "true");
        localStorage.setItem("binti_user", JSON.stringify(data.user));
      } else {
        setAuthError(data.message || "Biometric fingerprint authentication failed.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to process biometric fingerprint login.");
    }
  };

  // REQUEST PASSWORD RESET PIN HANDLER
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    setResetError(null);
    try {
      const res = await fetch(getApiUrl("/api/auth/request-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (data.success) {
        setResetStep("verify");
        setResetMessage(data.message);
        setDemoGeneratedOtp(data.otp);
      } else {
        setResetError(data.message || "Failed to request security PIN.");
      }
    } catch (err) {
      setResetError("Connection error while requesting security PIN.");
    }
  };

  // RESET PASSWORD SUBMIT HANDLER
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    setResetError(null);
    try {
      const res = await fetch(getApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setAuthEmail(resetEmail);
        setAuthPassword(newPassword);
        alert(data.message);
        setShowForgotPasswordModal(false);
        setResetStep("request");
        setResetEmail("");
        setResetOtp("");
        setNewPassword("");
      } else {
        setResetError(data.message || "Failed to update passcode.");
      }
    } catch (err) {
      setResetError("Failed to process passcode reset.");
    }
  };

  // ==========================================
  // ACTION DISPATCHERS TO BACKEND
  // ==========================================

  // Clients CRUD Sync
  const handleCreateClient = async (clientPayload: Partial<Client>) => {
    const res = await fetch(getApiUrl("/api/clients"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientPayload)
    });
    if (res.ok) fetchAllData();
  };

  const handleUpdateClient = async (id: string, clientPayload: Partial<Client>) => {
    const res = await fetch(getApiUrl(`/api/clients/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientPayload)
    });
    if (res.ok) fetchAllData();
  };

  const handleDeleteClient = async (id: string) => {
    const res = await fetch(getApiUrl(`/api/clients/${id}`), { method: "DELETE" });
    if (res.ok) fetchAllData();
  };

  // Products CRUD Sync
  const handleCreateProduct = async (prodPayload: Partial<ProductService>) => {
    const res = await fetch(getApiUrl("/api/products"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prodPayload)
    });
    if (res.ok) fetchAllData();
  };

  const handleUpdateProduct = async (id: string, prodPayload: Partial<ProductService>) => {
    const res = await fetch(getApiUrl(`/api/products/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prodPayload)
    });
    if (res.ok) fetchAllData();
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await fetch(getApiUrl(`/api/products/${id}`), { method: "DELETE" });
    if (res.ok) fetchAllData();
  };

  // Quotes CRUD Sync
  const handleCreateQuote = async (quotePayload: Partial<Quote>) => {
    const res = await fetch(getApiUrl("/api/quotes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quotePayload)
    });
    if (res.ok) fetchAllData();
  };

  const handleUpdateQuote = async (id: string, quotePayload: Partial<Quote>) => {
    const res = await fetch(getApiUrl(`/api/quotes/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quotePayload)
    });
    if (res.ok) fetchAllData();
  };

  const handleDeleteQuote = async (id: string) => {
    const res = await fetch(getApiUrl(`/api/quotes/${id}`), { method: "DELETE" });
    if (res.ok) fetchAllData();
  };

  // Convert Quote into an Invoice
  const handleConvertQuoteToInvoice = async (quote: Quote) => {
    const invoicePayload: Partial<Invoice> = {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      clientId: quote.clientId,
      clientName: quote.clientName,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 14 days net
      items: quote.items,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      taxTotal: quote.taxTotal,
      grandTotal: quote.grandTotal,
      status: "pending",
      notes: `Converted automatically from ${quote.quoteNumber}. ` + (quote.notes || ""),
      terms: quote.terms,
      payments: []
    };

    // Update quote status locally/remotely to 'converted'
    await handleUpdateQuote(quote.id, { status: "converted" });

    // Create the invoice
    const res = await fetch(getApiUrl("/api/invoices"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoicePayload)
    });

    if (res.ok) {
      showToast(`Quote ${quote.quoteNumber} converted to active invoice successfully.`);
      fetchAllData();
      setActiveTab("invoices");
    }
  };

  // Invoices CRUD Sync
  const handleCreateInvoice = async (invoicePayload: Partial<Invoice>) => {
    const res = await fetch(getApiUrl("/api/invoices"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoicePayload)
    });
    if (res.ok) fetchAllData();
  };

  const handleUpdateInvoice = async (id: string, invoicePayload: Partial<Invoice>) => {
    const res = await fetch(getApiUrl(`/api/invoices/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoicePayload)
    });
    if (res.ok) fetchAllData();
  };

  const handleDeleteInvoice = async (id: string) => {
    const res = await fetch(getApiUrl(`/api/invoices/${id}`), { method: "DELETE" });
    if (res.ok) fetchAllData();
  };

  // Record manual cash payment
  const handleRecordPayment = async (invoiceId: string, paymentPayload: Partial<PaymentRecord>) => {
    const res = await fetch(getApiUrl(`/api/invoices/${invoiceId}/payments`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload)
    });
    if (res.ok) {
      showToast("Manual payment registered, ledger statistics updated.");
      fetchAllData();
      
      // Update selectedInvoice state to show the updated receipt logs
      const updatedInv = await fetch(getApiUrl("/api/invoices")).then(r => r.json()).then(arr => arr.find((i: Invoice) => i.id === invoiceId));
      if (updatedInv) setSelectedInvoice(updatedInv);
    }
  };

  // Settings Configuration Update
  const handleUpdateSettings = async (settingsPayload: CompanySettings) => {
    const res = await fetch(getApiUrl("/api/settings"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsPayload)
    });
    if (res.ok) fetchAllData();
  };

  // Database Hard Wiping and Presets seed
  const handleResetDatabase = async () => {
    const res = await fetch(getApiUrl("/api/settings/reset"), {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    if (res.ok) {
      showToast("Database reset successfully.");
      fetchAllData();
    }
  };

  // Handles clicking on TopBar unread warnings
  const handleNotificationClick = (notifId: string) => {
    // Dismiss read locally
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, unread: false } : n));
    
    // Jump to modules based on type
    if (notifId.includes("overdue") || notifId.includes("due")) {
      setActiveTab("invoices");
    } else if (notifId.includes("pm")) {
      setActiveTab("payments");
    }
  };

  // Global searching cross-filtering logic
  const filteredQuotes = quotes.filter(q => 
    q.quoteNumber.toLowerCase().includes(globalSearch.toLowerCase()) ||
    q.clientName.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(globalSearch.toLowerCase()) ||
    inv.clientName.toLowerCase().includes(globalSearch.toLowerCase())
  );

  // ==========================================
  // ==========================================
  // VIEW RENDERING SELECTOR
  // ==========================================
  const renderWorkspace = () => {
    // Calculate dashboard statistics on-the-fly from active client state
    const totalInvoicesValue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalPaid = invoices.reduce((sum, inv) => {
      return sum + (inv.payments || []).reduce((pSum, pm) => pSum + pm.amountPaid, 0);
    }, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceRemaining, 0);
    const totalQuotes = quotes.length;
    const totalInvoices = invoices.length;
    const activeClientsCount = clients.filter(c => c.status === "active").length;
    const averageInvoiceValue = totalInvoices > 0 ? totalInvoicesValue / totalInvoices : 0;
    const convertedQuotes = quotes.filter(q => q.status === "converted").length;
    const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;

    const stats = {
      totalInvoicesValue,
      totalPaid,
      totalOutstanding,
      totalQuotes,
      totalInvoices,
      activeClientsCount,
      averageInvoiceValue,
      conversionRate
    };

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            stats={stats}
            invoices={invoices}
            quotes={quotes}
            clients={clients}
            currency={companySettings.currency}
            setActiveTab={(tab) => {
              setActiveTab(tab.toLowerCase());
              setSelectedInvoice(null);
              setSelectedQuote(null);
            }}
            onSelectQuote={(q) => {
              setSelectedQuote(q);
              setActiveTab("quotes");
            }}
            onSelectInvoice={(inv) => {
              setSelectedInvoice(inv);
              setActiveTab("invoices");
            }}
          />
        );
      case "quotes":
        return (
          <QuotesModule 
            quotes={quotes}
            clients={clients}
            products={products}
            currency={companySettings.currency}
            companySettings={{
              companyName: companySettings.companyName,
              email: companySettings.email,
              phone: companySettings.phone,
              address: companySettings.address,
              taxNumber: companySettings.taxNumber,
              termsTemplate: companySettings.termsTemplate
            }}
            onCreateQuote={handleCreateQuote}
            onUpdateQuote={handleUpdateQuote}
            onDeleteQuote={handleDeleteQuote}
            onConvertToInvoice={handleConvertQuoteToInvoice}
            selectedQuote={selectedQuote}
            setSelectedQuote={setSelectedQuote}
            showToast={showToast}
          />
        );
      case "invoices":
        return (
          <InvoicesModule 
            invoices={invoices}
            clients={clients}
            products={products}
            currency={companySettings.currency}
            companySettings={{
              companyName: companySettings.companyName,
              email: companySettings.email,
              phone: companySettings.phone,
              address: companySettings.address,
              taxNumber: companySettings.taxNumber,
              termsTemplate: companySettings.termsTemplate
            }}
            onCreateInvoice={handleCreateInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            onRecordPayment={handleRecordPayment}
            onDeleteInvoice={handleDeleteInvoice}
            selectedInvoice={selectedInvoice}
            setSelectedInvoice={setSelectedInvoice}
            showToast={showToast}
          />
        );
      case "clients":
        return (
          <ClientsModule 
            clients={clients}
            quotes={quotes}
            invoices={invoices}
            currency={companySettings.currency}
            onCreateClient={handleCreateClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
          />
        );
      case "products":
        return (
          <ProductsModule 
            products={products}
            currency={companySettings.currency}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        );
      case "payments":
        return (
          <PaymentsModule 
            invoices={invoices}
            currency={companySettings.currency}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            onNavigateToModule={(mod) => setActiveTab(mod.toLowerCase())}
          />
        );
      case "reports":
      case "analytics":
        return (
          <ReportsAnalyticsModule 
            invoices={invoices}
            quotes={quotes}
            clients={clients}
            products={products}
            currency={companySettings.currency}
          />
        );
      case "settings":
        return (
          <SettingsModule 
            companySettings={companySettings}
            onUpdateSettings={handleUpdateSettings}
            onResetDatabase={handleResetDatabase}
            currentUser={currentUser}
            onUpdateCurrentUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem("binti_user", JSON.stringify(updatedUser));
            }}
            showToast={showToast}
          />
        );
      default:
        return <div className="text-sm text-gray-500">Module Workspace Under Construction</div>;
    }
  };

  // ==========================================
  // LOGIN SCREEN DISPLAY
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF7EE] via-[#F3EFE3] to-[#EAE3CE] flex items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Soft artistic organic background blobs */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#80237E]/5 to-[#EAB308]/5 blur-3xl -top-40 -left-40 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#EC4899]/5 to-purple-500/5 blur-3xl -bottom-40 -right-40 pointer-events-none" />

        <div className="w-full max-w-md bg-[#FCFAF6]/90 backdrop-blur-md rounded-3xl border border-[#D4AF37]/30 shadow-2xl p-8 space-y-7 flex flex-col justify-between overflow-hidden relative transition-all">
          {/* Top double golden accent lines */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#D4AF37] via-amber-200 to-[#D4AF37]" />
          <div className="absolute top-1 inset-x-0 h-[1px] bg-white/40" />

          <div className="text-center space-y-4 pt-2">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-md border border-[#D4AF37]/20">
              <img src="/logo.jpeg" alt="Binti Tents & Events Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-gray-800 tracking-tight flex items-center justify-center space-x-1.5">
                <span className="bg-gradient-to-r from-[#80237E] via-[#6B46C1] to-[#EAB308] bg-clip-text text-transparent">Binti Events</span>
              </h1>
              <p className="text-[10px] text-[#D4AF37] font-extrabold tracking-[0.25em] uppercase mt-1">Instinctively Elegant</p>
              <div className="w-12 h-[1.5px] bg-[#D4AF37]/30 mx-auto mt-3" />
              <p className="text-[9px] text-gray-400 font-semibold tracking-wider uppercase mt-2">Executive Invoicing & Ledger Desk</p>
            </div>
          </div>

          {authError && (
            <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-start space-x-2 text-xs text-red-700 animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4.5">
            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Corporate Identity (Email)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-[#D4AF37]" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="admin@bintievents.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/15 focus:border-[#D4AF37] font-semibold text-gray-700 bg-white/50 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Secret Passcode</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(authEmail || "admin@bintievents.com");
                    setShowForgotPasswordModal(true);
                  }}
                  className="text-[9px] font-extrabold text-[#80237E] hover:text-[#D4AF37] hover:underline transition-colors"
                >
                  Forgot Passcode?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-[#D4AF37]" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/15 focus:border-[#D4AF37] font-semibold text-gray-700 bg-white/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#80237E] hover:bg-[#6b1e6a] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#80237E]/10 flex items-center justify-center space-x-1.5 hover:translate-y-[-1px] border border-[#D4AF37]/20"
            >
              <span>Unlock Admin Workspace</span>
              <ArrowRight className="w-4 h-4 text-[#EAB308]" />
            </button>

            {/* Fingerprint Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/40" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-wider">
                <span className="bg-[#FCFAF6] px-3 text-gray-400 font-bold">Secure Access</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartBiometricLogin}
              className="w-full py-2.5 bg-[#FAF8F2] hover:bg-[#F3EFE5] text-[#80237E] border border-[#D4AF37]/25 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <Fingerprint className="w-4.5 h-4.5 text-[#EC4899] animate-pulse" />
              <span>Touch ID / Fingerprint Auth</span>
            </button>
          </form>

          {/* Quick info footer */}
          <div className="pt-4 border-t border-gray-200/60 flex items-center justify-between text-[9px] text-gray-400 font-semibold tracking-wider uppercase">
            <span className="flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>AES-256 SECURED</span>
            </span>
            <span>Demo: admin@bintievents.com</span>
          </div>

          {/* Forgot Password Recovery Modal */}
          {showForgotPasswordModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-3xl border border-gray-100 shadow-2xl p-6 relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-5 h-5 text-[#80237E]" />
                    <h3 className="font-extrabold text-base text-gray-900">Passcode Recovery</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setShowForgotPasswordModal(false);
                      setResetStep("request");
                      setResetError(null);
                      setResetMessage(null);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                {resetMessage && (
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-[#80237E] flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{resetMessage}</span>
                  </div>
                )}

                {resetStep === "request" ? (
                  <form onSubmit={handleRequestResetOtp} className="space-y-4">
                    <p className="text-xs text-gray-500">
                      Enter your registered corporate email address below. A 6-digit security recovery PIN will be generated.
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Corporate Email</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@bintievents.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#80237E]/20 focus:border-[#80237E]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#80237E] hover:bg-[#6b1e6a] text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Send Recovery PIN
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    {demoGeneratedOtp && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center justify-between">
                        <span>Generated PIN for test:</span>
                        <span className="text-sm font-black tracking-widest text-[#80237E] bg-white px-2 py-0.5 rounded border border-amber-300">{demoGeneratedOtp}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">6-Digit Security PIN</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="884920"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-mono font-bold tracking-widest text-gray-900 focus:ring-2 focus:ring-[#80237E]/20 focus:border-[#80237E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">New Passcode</label>
                      <input
                        type="password"
                        required
                        minLength={4}
                        placeholder="Enter new passcode"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#80237E]/20 focus:border-[#80237E]"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setResetStep("request")}
                        className="w-1/3 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-bold"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 py-2.5 bg-[#80237E] hover:bg-[#6b1e6a] text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Update & Login
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ==========================================
  // LIVE APPLICATION DESKTOP LAYOUT
  // ==========================================
  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-sans">
      {/* Sidebar Navigation Panel */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Auto-clear preview drill-downs on tab change & close mobile drawer
          setSelectedInvoice(null);
          setSelectedQuote(null);
          setIsMobileMenuOpen(false);
        }} 
        onLogout={handleLogout}
        userName={currentUser?.name}
        userRole={currentUser?.role}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky Top Navigation Bar */}
        <TopBar 
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          currency={companySettings.currency}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        {/* Dynamic Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {/* Global search overlay results portal */}
          {globalSearch ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in absolute inset-x-8 top-8 z-40">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Cross-Search Portal Results for "{globalSearch}"
                </span>
                <button 
                  onClick={() => setGlobalSearch("")}
                  className="text-xs text-red-500 hover:underline font-semibold"
                >
                  Close portal
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quotes found */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Matched Quotes Proposals ({filteredQuotes.length})</span>
                  {filteredQuotes.length === 0 ? (
                    <p className="text-xs text-gray-400">No quotes found.</p>
                  ) : (
                    <div className="space-y-1">
                      {filteredQuotes.map(q => (
                        <div key={q.id} className="p-3 bg-gray-50 hover:bg-purple-50/30 rounded-xl flex items-center justify-between text-xs transition-colors border border-gray-100">
                          <div>
                            <p className="font-bold text-[#6B46C1]">{q.quoteNumber}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{q.clientName}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedQuote(q);
                              setActiveTab("quotes");
                              setGlobalSearch("");
                            }}
                            className="p-1.5 text-[#6B46C1] hover:bg-white border border-purple-100 rounded-lg flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Open</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoices found */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Matched Tax Invoices ({filteredInvoices.length})</span>
                  {filteredInvoices.length === 0 ? (
                    <p className="text-xs text-gray-400">No invoices found.</p>
                  ) : (
                    <div className="space-y-1">
                      {filteredInvoices.map(inv => (
                        <div key={inv.id} className="p-3 bg-gray-50 hover:bg-purple-50/30 rounded-xl flex items-center justify-between text-xs transition-colors border border-gray-100">
                          <div>
                            <p className="font-bold text-[#6B46C1]">{inv.invoiceNumber}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{inv.clientName}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setActiveTab("invoices");
                              setGlobalSearch("");
                            }}
                            className="p-1.5 text-[#6B46C1] hover:bg-white border border-purple-100 rounded-lg flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Open</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Core Module Viewport */}
          {renderWorkspace()}
        </main>
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-[11px] text-[#80237E] font-extrabold tracking-wider uppercase pointer-events-none select-none">
          {toast}
        </div>
      )}
    </div>
  );
}
