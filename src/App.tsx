import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, RefreshCw, Eye, X } from "lucide-react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./components/Dashboard";
import QuotesModule from "./components/QuotesModule";
import InvoicesModule from "./components/InvoicesModule";
import ClientsModule from "./components/ClientsModule";
import ProductsModule from "./components/ProductsModule";
import PaymentsModule from "./components/PaymentsModule";
import ReportsAnalyticsModule from "./components/ReportsAnalyticsModule";
import SettingsModule from "./components/SettingsModule";
import LoginScreen from "./components/LoginScreen";
import BintiAiAssistantModal from "./components/BintiAiAssistantModal";
import { apiRequest, clearAuthToken, setAuthToken } from "./services/apiClient";
import { Client, ProductService, Quote, Invoice, CompanySettings, PaymentRecord, AuditLogEntry } from "./types";
import { AgentAction } from "./services/geminiService";
import { normalizeMultilineText, generateNextDocumentNumber } from "./utils/text";

export default function App() {
  // Authentication State
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; email: string } | null>(() => {
    const saved = localStorage.getItem("binti_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [sessionTimeoutMsg, setSessionTimeoutMsg] = useState<string | null>(() => {
    return localStorage.getItem("binti_session_timeout_msg");
  });

  // Custom Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);
  const toastTimeoutId = useRef<any>(null);

  // Theme State (Light / Dark mode)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("binti_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    localStorage.setItem("binti_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const showToast = useCallback((message: string, type: "success" | "warning" = "success") => {
    if (toastTimeoutId.current) clearTimeout(toastTimeoutId.current);
    setToast({ message, type });
    toastTimeoutId.current = setTimeout(() => {
      setToast(null);
    }, 2500);
  }, []);

  // AI Assistant Drawer & Onboarding States
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [bintiInitialPrompt, setBintiInitialPrompt] = useState("");
  const [showBintiWelcome, setShowBintiWelcome] = useState<boolean>(() => {
    return localStorage.getItem("binti_welcome_seen") !== "true";
  });

  const dismissBintiWelcome = (openAssistant = false) => {
    localStorage.setItem("binti_welcome_seen", "true");
    setShowBintiWelcome(false);
    if (openAssistant) {
      setIsAiAssistantOpen(true);
    }
  };

  // Master Data States
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem("binti_company_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    return {
      companyName: "Binti Events",
      email: "billing@bintievents.co.ke",
      phone: "+254 712 345678",
      address: "Ngong Road, Nairobi, Kenya",
      taxNumber: "P051234567A",
      bankDetails: "Bank: Equity Bank Kenya\nAccount Name: Binti Events Ltd\nAccount Number: 0123456789012\nBranch: Ngong Road\nPaybill: 247247 (Acc: 0123456789012)",
      currency: "KES",
      invoiceFormat: "INV-2026-{SEQ}",
      quoteFormat: "QT-2026-{SEQ}",
      termsTemplate: "1. 50% commitment fee to book, with the balance paid before setup.\n2. Broken gear billed at cost.",
      emailTemplate: ""
    };
  });

  // Cross-Module Selection States
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: "overdue" | "upcoming" | "unpaid" | "payment" | "client";
    title: string;
    description: string;
    time: string;
    unread: boolean;
  }>>([]);

  // Refs for tracking active state in timer callbacks without re-triggering effects
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const selectedQuoteRef = useRef(selectedQuote);
  selectedQuoteRef.current = selectedQuote;
  const selectedInvoiceRef = useRef(selectedInvoice);
  selectedInvoiceRef.current = selectedInvoice;
  const globalSearchRef = useRef(globalSearch);
  globalSearchRef.current = globalSearch;

  // Load all persisted data on initial login or explicit reload
  const fetchAllData = useCallback(async () => {
    try {
      const [apiClients, apiProducts, apiQuotes, apiInvoices, apiSettings] = await Promise.all([
        apiRequest<Client[]>('/api/clients'),
        apiRequest<ProductService[]>('/api/products'),
        apiRequest<Quote[]>('/api/quotes'),
        apiRequest<Invoice[]>('/api/invoices'),
        apiRequest<CompanySettings>('/api/settings')
      ]);

      const normalizedProducts: ProductService[] = (apiProducts || []).map((p: any) => ({
        id: p.id,
        name: p.name || '',
        description: p.description || '',
        category: p.category || 'General',
        unitType: p.unitType || p.unit_type || p.unit || 'Day',
        unitPrice: Number(p.unitPrice ?? p.unit_price ?? p.price ?? 0),
        taxRate: Number(p.taxRate ?? p.tax_rate ?? p.tax ?? 16),
        status: (p.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive'
      }));

      const normalizedInvoices: Invoice[] = (apiInvoices || []).map((inv: any) => {
        const grandTotal = Number(inv.grandTotal ?? inv.grandtotal ?? inv.grand_total ?? 0);
        const payments = inv.payments || [];
        const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amountPaid) || 0), 0);
        const balanceRemaining = Math.max(0, grandTotal - totalPaid);
        let status = inv.status || 'draft';
        if (balanceRemaining <= 0 && grandTotal > 0 && payments.length > 0) {
          status = 'paid';
        } else if (totalPaid > 0 && balanceRemaining > 0) {
          status = 'partially_paid';
        }
        return {
          ...inv,
          grandTotal,
          balanceRemaining,
          status,
          payments
        };
      });

      setClients(apiClients || []);
      setProducts(normalizedProducts);
      setQuotes(apiQuotes || []);
      setInvoices(normalizedInvoices);

      // Restore selected quote or invoice from saved session timeout state
      const restoreQuoteId = sessionStorage.getItem("binti_restore_quote_id");
      if (restoreQuoteId) {
        const found = (apiQuotes || []).find((q: Quote) => q.id === restoreQuoteId);
        if (found) setSelectedQuote(found);
        sessionStorage.removeItem("binti_restore_quote_id");
      }

      const restoreInvoiceId = sessionStorage.getItem("binti_restore_invoice_id");
      if (restoreInvoiceId) {
        const found = normalizedInvoices.find((inv: Invoice) => inv.id === restoreInvoiceId);
        if (found) setSelectedInvoice(found);
        sessionStorage.removeItem("binti_restore_invoice_id");
      }

      if (apiSettings) {
        setCompanySettings(prev => {
          const raw = apiSettings as any;
          const rawTerms = raw.termsTemplate ?? raw.terms_template ?? prev.termsTemplate ?? "";
          const rawBank = raw.bankDetails ?? raw.bank_details ?? prev.bankDetails ?? "";

          const merged: CompanySettings = {
            ...prev,
            companyName: raw.companyName || raw.company_name || prev.companyName || "Binti Events",
            email: raw.email !== undefined ? raw.email : (prev.email || ""),
            phone: raw.phone !== undefined ? raw.phone : (prev.phone || ""),
            address: raw.address !== undefined ? raw.address : (prev.address || ""),
            taxNumber: raw.taxNumber || raw.tax_number || prev.taxNumber || "",
            bankDetails: normalizeMultilineText(rawBank),
            currency: raw.currency || prev.currency || "KES",
            invoiceFormat: raw.invoiceFormat || raw.invoice_format || prev.invoiceFormat || "INV-2026-{SEQ}",
            quoteFormat: raw.quoteFormat || raw.quote_format || prev.quoteFormat || "QT-2026-{SEQ}",
            termsTemplate: normalizeMultilineText(rawTerms),
            emailTemplate: raw.emailTemplate ?? raw.email_template ?? prev.emailTemplate ?? ""
          };
          localStorage.setItem("binti_company_settings", JSON.stringify(merged));
          return merged;
        });
      }

      // Generate dynamic notifications
      const generatedAlerts: typeof notifications = [];
      const readRaw = localStorage.getItem("binti_read_notifications");
      let readSet = new Set<string>();
      if (readRaw) {
        try {
          const parsed = JSON.parse(readRaw);
          if (Array.isArray(parsed)) readSet = new Set(parsed);
        } catch (e) {}
      }

      const now = new Date();
      normalizedInvoices.forEach((inv: Invoice) => {
        const remaining = Number(inv.balanceRemaining ?? inv.grandTotal ?? 0);
        if (inv.status !== "paid" && remaining > 0 && inv.dueDate) {
          const due = new Date(inv.dueDate);
          if (due.getTime() < now.getTime()) {
            const notifId = `notif-overdue-${inv.id || inv.invoiceNumber}`;
            generatedAlerts.push({
              id: notifId,
              type: "overdue",
              title: `Invoice Overdue: ${inv.invoiceNumber}`,
              description: `${inv.clientName || 'Client'} is yet to clear ${(companySettings.currency || 'KES')} ${remaining.toLocaleString()}.`,
              time: `Due on ${inv.dueDate.split('T')[0]}`,
              unread: !readSet.has(notifId)
            });
          }
        }
      });

      setNotifications(generatedAlerts);
    } catch (error) {
      console.error("Failed to load platform data:", error);
    }
  }, [companySettings.currency]);

  // Initial Auth Verification
  useEffect(() => {
    const verifyInitialAuth = async () => {
      setIsAuthChecking(true);
      try {
        const data = await apiRequest<{ valid: boolean; user: { name: string; role: string; email: string } }>(
          '/api/auth/verify', { method: 'GET' }, true
        );
        if (data && data.valid) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
          localStorage.setItem("binti_user", JSON.stringify(data.user));
          await fetchAllData();
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setIsAuthChecking(false);
      }
    };
    verifyInitialAuth();
  }, [fetchAllData]);

  // Session Inactivity Auto-Timeout (15 minutes, single optimized effect)
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
    localStorage.setItem("binti_last_activity", Date.now().toString());

    let lastRecorded = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 5000) {
        lastRecorded = now;
        localStorage.setItem("binti_last_activity", now.toString());
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach(event => window.addEventListener(event, handleUserActivity, { passive: true }));

    const interval = setInterval(() => {
      const lastActStr = localStorage.getItem("binti_last_activity");
      const lastAct = lastActStr ? parseInt(lastActStr, 10) : Date.now();
      
      if (Date.now() - lastAct >= INACTIVITY_TIMEOUT_MS) {
        const sessionState = {
          activeTab: activeTabRef.current,
          selectedQuoteId: selectedQuoteRef.current?.id || null,
          selectedInvoiceId: selectedInvoiceRef.current?.id || null,
          globalSearch: globalSearchRef.current,
          timestamp: Date.now()
        };
        localStorage.setItem("binti_saved_session_state", JSON.stringify(sessionState));
        
        const timeoutMsg = "You were automatically signed out after 15 minutes of inactivity for security. Sign in to resume your session.";
        localStorage.setItem("binti_session_timeout_msg", timeoutMsg);
        setSessionTimeoutMsg(timeoutMsg);

        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem("binti_user");
        clearAuthToken();
      }
    }, 15000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleLogin = async (email: string, pass: string) => {
    setAuthError(null);
    setAuthSuccessMsg(null);
    setIsSigningIn(true);

    try {
      const data = await apiRequest<{ success: boolean; token: string; user: { name: string; role: string; email: string } }>(
        '/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: pass }) }, false
      );
      setAuthToken(data.token);
      setIsAuthenticated(true);
      setCurrentUser(data.user);
      localStorage.setItem('binti_user', JSON.stringify(data.user));

      // Restore session state if returning from timeout
      const savedStateRaw = localStorage.getItem("binti_saved_session_state");
      if (savedStateRaw) {
        try {
          const savedState = JSON.parse(savedStateRaw);
          if (savedState.activeTab) setActiveTab(savedState.activeTab);
          if (savedState.globalSearch) setGlobalSearch(savedState.globalSearch);
          if (savedState.selectedQuoteId) sessionStorage.setItem("binti_restore_quote_id", savedState.selectedQuoteId);
          if (savedState.selectedInvoiceId) sessionStorage.setItem("binti_restore_invoice_id", savedState.selectedInvoiceId);
          localStorage.removeItem("binti_saved_session_state");
          localStorage.removeItem("binti_session_timeout_msg");
          setSessionTimeoutMsg(null);
          showToast("Welcome back! Workspace state restored.");
        } catch (e) {}
      } else {
        localStorage.removeItem("binti_session_timeout_msg");
        setSessionTimeoutMsg(null);
      }

      await fetchAllData();
    } catch (error: any) {
      setAuthError(error.message || 'Unable to sign in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("binti_user");
    localStorage.removeItem("binti_saved_session_state");
    localStorage.removeItem("binti_session_timeout_msg");
    sessionStorage.removeItem("binti_restore_quote_id");
    sessionStorage.removeItem("binti_restore_invoice_id");
    setSessionTimeoutMsg(null);
    clearAuthToken();
  };

  // ==========================================
  // OPTIMISTIC / ATOMIC CRUD MUTATION HANDLERS
  // ==========================================

  // Clients CRUD
  const handleCreateClient = async (clientPayload: Partial<Client>) => {
    const created = await apiRequest<Client>('/api/clients', { method: 'POST', body: JSON.stringify(clientPayload) });
    const normalized: Client = {
      id: created?.id || Math.random().toString(),
      name: created?.name || clientPayload.name || 'New Client',
      company: created?.company || clientPayload.company || '',
      phone: created?.phone || clientPayload.phone || '',
      email: created?.email || clientPayload.email || '',
      address: created?.address || clientPayload.address || '',
      taxNumber: created?.taxNumber || clientPayload.taxNumber || '',
      notes: created?.notes || clientPayload.notes || '',
      status: (created?.status || clientPayload.status || 'active') as 'active' | 'inactive',
      revenue: Number(created?.revenue || clientPayload.revenue || 0)
    };
    setClients(prev => [...prev.filter(c => c.id !== normalized.id), normalized]);
    showToast(`Client ${normalized.name} registered successfully.`);
  };

  const handleUpdateClient = async (id: string, clientPayload: Partial<Client>) => {
    const updated = await apiRequest<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(clientPayload) });
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...clientPayload, ...(updated && updated.id ? updated : {}) } : c));
    showToast("Client profile updated successfully.");
  };

  const handleDeleteClient = async (id: string) => {
    await apiRequest(`/api/clients/${id}`, { method: 'DELETE' });
    setClients(prev => prev.filter(c => c.id !== id));
    showToast("Client profile deleted.", "warning");
  };

  // Products CRUD
  const handleCreateProduct = async (prodPayload: Partial<ProductService>) => {
    const payload = {
      ...prodPayload,
      price: prodPayload.unitPrice,
      unit: prodPayload.unitType,
      unit_price: prodPayload.unitPrice,
      unit_type: prodPayload.unitType,
      tax_rate: prodPayload.taxRate
    };
    const created = await apiRequest<ProductService>('/api/products', { method: 'POST', body: JSON.stringify(payload) });
    const normalized: ProductService = {
      id: created?.id || Math.random().toString(),
      name: created?.name || prodPayload.name || '',
      description: created?.description || prodPayload.description || '',
      category: created?.category || prodPayload.category || 'General',
      unitType: prodPayload.unitType || 'Day',
      unitPrice: Number(prodPayload.unitPrice || 0),
      taxRate: Number(prodPayload.taxRate || 16),
      status: (prodPayload.status === 'inactive' ? 'inactive' : 'active')
    };
    setProducts(prev => [...prev.filter(p => p.id !== normalized.id), normalized]);
    showToast(`Catalog item ${prodPayload.name} added.`);
  };

  const handleUpdateProduct = async (id: string, prodPayload: Partial<ProductService>) => {
    const payload = {
      ...prodPayload,
      price: prodPayload.unitPrice,
      unit: prodPayload.unitType,
      unit_price: prodPayload.unitPrice,
      unit_type: prodPayload.unitType,
      tax_rate: prodPayload.taxRate
    };
    await apiRequest(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...prodPayload } : p));
    showToast("Catalog item updated.");
  };

  const handleDeleteProduct = async (id: string) => {
    await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast("Catalog item removed.", "warning");
  };

  // Quotes CRUD
  const handleCreateQuote = async (quotePayload: Partial<Quote>) => {
    const nextQuoteNumber = quotePayload.quoteNumber || generateNextDocumentNumber(
      companySettings.quoteFormat,
      quotes.map(q => q.quoteNumber),
      "QT"
    );
    const created = await apiRequest<Quote>('/api/quotes', { 
      method: 'POST', 
      body: JSON.stringify({ ...quotePayload, quoteNumber: nextQuoteNumber }) 
    });
    const normalizedQuote: Quote = {
      ...(created && created.id ? created : (quotePayload as Quote)),
      id: created?.id || (quotePayload.id as string) || Math.random().toString(),
      quoteNumber: nextQuoteNumber,
      clientId: quotePayload.clientId || '',
      clientName: quotePayload.clientName || 'Client',
      items: quotePayload.items || [],
      grandTotal: Number(quotePayload.grandTotal || 0),
      status: quotePayload.status || 'draft'
    };
    setQuotes(prev => [normalizedQuote, ...prev.filter(q => q.id !== normalizedQuote.id)]);
    showToast(`Quotation ${nextQuoteNumber} issued successfully.`);
  };

  const handleUpdateQuote = async (id: string, quotePayload: Partial<Quote>) => {
    const updated = await apiRequest<Quote>(`/api/quotes/${id}`, { method: 'PUT', body: JSON.stringify(quotePayload) });
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, ...quotePayload, ...(updated && updated.id ? updated : {}) } : q));
    if (selectedQuote && selectedQuote.id === id) {
      setSelectedQuote(prev => prev ? { ...prev, ...quotePayload } : null);
    }
    showToast("Quotation updated.");
  };

  const handleDeleteQuote = async (id: string) => {
    await apiRequest(`/api/quotes/${id}`, { method: 'DELETE' });
    setQuotes(prev => prev.filter(q => q.id !== id));
    if (selectedQuote?.id === id) setSelectedQuote(null);
    showToast("Quotation deleted.", "warning");
  };

  // Invoices CRUD
  const handleCreateInvoice = async (invoicePayload: Partial<Invoice>) => {
    const nextInvoiceNumber = invoicePayload.invoiceNumber || generateNextDocumentNumber(
      companySettings.invoiceFormat,
      invoices.map(i => i.invoiceNumber),
      "INV"
    );
    const created = await apiRequest<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify({ ...invoicePayload, invoiceNumber: nextInvoiceNumber })
    });
    const grandTotal = Number(invoicePayload.grandTotal || 0);
    const payments = invoicePayload.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const balanceRemaining = Math.max(0, grandTotal - totalPaid);
    let status = invoicePayload.status || 'pending';
    if (balanceRemaining <= 0 && grandTotal > 0 && payments.length > 0) {
      status = 'paid';
    } else if (totalPaid > 0 && balanceRemaining > 0) {
      status = 'partially_paid';
    }
    const normalizedInvoice: Invoice = {
      ...(created && created.id ? created : (invoicePayload as Invoice)),
      id: created?.id || (invoicePayload.id as string) || Math.random().toString(),
      invoiceNumber: nextInvoiceNumber,
      clientId: invoicePayload.clientId || '',
      clientName: invoicePayload.clientName || 'Client',
      grandTotal,
      balanceRemaining,
      status,
      payments,
      items: invoicePayload.items || []
    };
    setInvoices(prev => [normalizedInvoice, ...prev.filter(i => i.id !== normalizedInvoice.id)]);
    showToast(`Tax Invoice ${nextInvoiceNumber} created.`);
  };

  const handleUpdateInvoice = async (id: string, invoicePayload: Partial<Invoice>) => {
    const updated = await apiRequest<Invoice>(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(invoicePayload) });
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      const merged = { ...inv, ...invoicePayload, ...(updated && updated.id ? updated : {}) };
      const grandTotal = Number(merged.grandTotal || 0);
      const payments = merged.payments || [];
      const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
      const balanceRemaining = Math.max(0, grandTotal - totalPaid);
      let status = merged.status || 'pending';
      if (balanceRemaining <= 0 && grandTotal > 0 && payments.length > 0) {
        status = 'paid';
      } else if (totalPaid > 0 && balanceRemaining > 0) {
        status = 'partially_paid';
      }
      return { ...merged, grandTotal, balanceRemaining, status, payments };
    }));
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice(prev => prev ? { ...prev, ...invoicePayload } : null);
    }
    showToast("Invoice updated.");
  };

  const handleDeleteInvoice = async (id: string) => {
    await apiRequest(`/api/invoices/${id}`, { method: 'DELETE' });
    setInvoices(prev => prev.filter(i => i.id !== id));
    if (selectedInvoice?.id === id) setSelectedInvoice(null);
    showToast("Invoice deleted.", "warning");
  };

  // Convert Quote into an Invoice
  const handleConvertQuoteToInvoice = async (quote: Quote) => {
    const nextInvoiceNumber = generateNextDocumentNumber(
      companySettings.invoiceFormat,
      invoices.map(i => i.invoiceNumber),
      "INV"
    );
    const invoicePayload: Partial<Invoice> = {
      invoiceNumber: nextInvoiceNumber,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      clientId: quote.clientId,
      clientName: quote.clientName,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items: quote.items,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      taxTotal: quote.taxTotal,
      grandTotal: quote.grandTotal,
      balanceRemaining: quote.grandTotal,
      status: "pending",
      notes: `Converted automatically from ${quote.quoteNumber}. ` + (quote.notes || ""),
      terms: quote.terms,
      payments: []
    };

    await handleUpdateQuote(quote.id, { status: "converted" });
    await handleCreateInvoice(invoicePayload);
    showToast(`Quote ${quote.quoteNumber} converted to active invoice ${nextInvoiceNumber} successfully.`);
    setActiveTab("invoices");
  };

  // Record manual cash / transfer payment
  const handleRecordPayment = async (invoiceId: string, paymentPayload: Partial<PaymentRecord>) => {
    const updated = await apiRequest<Invoice>(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentPayload)
    });
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;
      if (updated && updated.id) {
        const grandTotal = Number(updated.grandTotal || 0);
        const payments = updated.payments || [];
        const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
        const balanceRemaining = Math.max(0, grandTotal - totalPaid);
        let status = updated.status || 'pending';
        if (balanceRemaining <= 0 && grandTotal > 0 && payments.length > 0) {
          status = 'paid';
        } else if (totalPaid > 0 && balanceRemaining > 0) {
          status = 'partially_paid';
        }
        return { ...updated, grandTotal, balanceRemaining, status, payments };
      }
      const newPayment: PaymentRecord = {
        id: Math.random().toString(),
        paymentDate: paymentPayload.paymentDate || new Date().toISOString(),
        paymentMethod: paymentPayload.paymentMethod || 'cash',
        referenceNumber: paymentPayload.referenceNumber || '',
        amountPaid: Number(paymentPayload.amountPaid || 0),
        notes: paymentPayload.notes
      };
      const updatedPayments = [...(inv.payments || []), newPayment];
      const grandTotal = Number(inv.grandTotal || 0);
      const totalPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
      const balanceRemaining = Math.max(0, grandTotal - totalPaid);
      let status = inv.status;
      if (balanceRemaining <= 0 && grandTotal > 0) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partially_paid';
      }
      return {
        ...inv,
        payments: updatedPayments,
        balanceRemaining,
        status
      };
    }));
    showToast("Manual payment registered, ledger statistics updated.");
  };

  // Settings Configuration Update
  const handleUpdateSettings = async (settingsPayload: CompanySettings) => {
    const cleanTerms = normalizeMultilineText(settingsPayload.termsTemplate);
    const cleanBank = normalizeMultilineText(settingsPayload.bankDetails);

    const normalizedSettings: CompanySettings = {
      ...settingsPayload,
      termsTemplate: cleanTerms,
      bankDetails: cleanBank
    };

    setCompanySettings(normalizedSettings);
    localStorage.setItem("binti_company_settings", JSON.stringify(normalizedSettings));

    try {
      const payloadToSend = {
        ...normalizedSettings,
        companyName: normalizedSettings.companyName,
        company_name: normalizedSettings.companyName,
        email: normalizedSettings.email,
        phone: normalizedSettings.phone,
        address: normalizedSettings.address,
        taxNumber: normalizedSettings.taxNumber,
        tax_number: normalizedSettings.taxNumber,
        bankDetails: cleanBank,
        bank_details: cleanBank,
        currency: normalizedSettings.currency,
        termsTemplate: cleanTerms,
        terms_template: cleanTerms,
        invoiceFormat: normalizedSettings.invoiceFormat,
        invoice_format: normalizedSettings.invoiceFormat,
        quoteFormat: normalizedSettings.quoteFormat,
        quote_format: normalizedSettings.quoteFormat,
        emailTemplate: normalizedSettings.emailTemplate,
        email_template: normalizedSettings.emailTemplate
      };
      await apiRequest('/api/settings', { method: 'PUT', body: JSON.stringify(payloadToSend) });
      showToast("Billing settings saved successfully.");
    } catch (err) {
      console.warn("Backend settings update note:", err);
      showToast("Billing settings saved locally.");
    }
  };

  // Database Hard Wiping with Partial Failure Inspection
  const handleResetDatabase = async () => {
    try {
      let resetSucceeded = false;
      try {
        await apiRequest('/api/settings/reset', {
          method: 'POST',
          body: JSON.stringify({ action: 'reset', confirm: true, reset: true })
        });
        resetSucceeded = true;
      } catch (endpointErr) {
        console.warn("Direct /api/settings/reset endpoint unavailable, falling back to resource cascade wipe:", endpointErr);
      }

      if (!resetSucceeded) {
        const invResults = await Promise.allSettled(invoices.map(inv => apiRequest(`/api/invoices/${inv.id}`, { method: 'DELETE' })));
        const quoteResults = await Promise.allSettled(quotes.map(q => apiRequest(`/api/quotes/${q.id}`, { method: 'DELETE' })));
        const prodResults = await Promise.allSettled(products.map(p => apiRequest(`/api/products/${p.id}`, { method: 'DELETE' })));
        const clientResults = await Promise.allSettled(clients.map(c => apiRequest(`/api/clients/${c.id}`, { method: 'DELETE' })));

        const allResults = [...invResults, ...quoteResults, ...prodResults, ...clientResults];
        const failedCount = allResults.filter(r => r.status === 'rejected').length;

        const pristineSettings: CompanySettings = {
          companyName: "Binti Events",
          email: "info@bintievents.co.ke",
          phone: "+254 700 111 222",
          address: "Ngong Road, Nairobi, Kenya",
          taxNumber: "P051234567A",
          bankDetails: "Equity Bank — A/C 1160274628991\nBranch: Ngong Road\nSWIFT: EABORKE",
          currency: "KES",
          invoiceFormat: "INV-2026-{SEQ}",
          quoteFormat: "QT-2026-{SEQ}",
          termsTemplate: "1. 50% commitment fee to book, with the balance paid before setup.\n2. Broken or damaged equipment will be billed at replacement cost.\n3. Setup and breakdown are included within Nairobi County.\n4. Cancellation within 7 days of event date forfeits the deposit.\n5. Client by making payment authorizes Binti Tents & Events to supply the above facilities.",
          emailTemplate: "Dear {CLIENT_NAME},\n\nPlease find attached {TYPE} #{NUMBER} from Binti Events.\n\nBest regards,\nBinti Events Team"
        };
        await handleUpdateSettings(pristineSettings);

        if (failedCount > 0) {
          showToast(`Database reset with ${failedCount} item warnings.`, "warning");
        } else {
          showToast("Cloud database reset and cleared successfully.");
        }
      } else {
        showToast("Cloud database reset and cleared successfully.");
      }

      setInvoices([]);
      setQuotes([]);
      setProducts([]);
      setClients([]);
      localStorage.removeItem("binti_dismissed_notifications");
      localStorage.removeItem("binti_read_notifications");
      localStorage.removeItem("binti_notifications_cleared_at");
      localStorage.removeItem("binti_company_settings");
      sessionStorage.removeItem("binti_restore_quote_id");
      sessionStorage.removeItem("binti_restore_invoice_id");
      
      await fetchAllData();
    } catch (err: any) {
      console.error("Database reset error:", err);
      showToast(err?.message || "Failed to reset database. Please check backend connectivity.", "warning");
      throw err;
    }
  };

  // Audit Trail State (Lightweight Single-User Compliance Log)
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem("binti_audit_trail");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const logAuditEvent = (actionType: string, summary: string, details?: any) => {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      actionType,
      summary,
      executedBy: currentUser?.name || "Business Owner",
      details
    };
    setAuditTrail(prev => {
      const updated = [entry, ...prev].slice(0, 100);
      localStorage.setItem("binti_audit_trail", JSON.stringify(updated));
      return updated;
    });
  };

  // AI Agent Action Execution Dispatcher (Level 1 UI + Level 3 Mutations)
  const handleExecuteAiAction = async (action: AgentAction) => {
    switch (action.type) {
      case "navigate":
        if (action.payload?.tab) {
          setActiveTab(action.payload.tab);
        }
        break;
      case "filter_invoices":
        setActiveTab("invoices");
        showToast("Filtering invoices ledger");
        break;
      case "create_quote": {
        const payload = action.payload || {};
        if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
          await handleCreateQuote(payload as Partial<Quote>);
          logAuditEvent("create_quote", `Created quotation for ${payload.clientName || 'Client'}`, payload);
          showToast(`Quotation created for ${payload.clientName || 'Client'}.`);
          setActiveTab("quotes");
        } else {
          setActiveTab("quotes");
          if (payload.clientName) {
            showToast(`Opening Quote Builder for ${payload.clientName}`);
          } else {
            showToast("Opening Quote Builder");
          }
        }
        break;
      }
      case "create_invoice": {
        const payload = action.payload || {};
        if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
          await handleCreateInvoice(payload as Partial<Invoice>);
          logAuditEvent("create_invoice", `Issued tax invoice for ${payload.clientName || 'Client'}`, payload);
          showToast(`Tax invoice issued for ${payload.clientName || 'Client'}.`);
          setActiveTab("invoices");
        } else {
          setActiveTab("invoices");
          if (payload.clientName) {
            showToast(`Opening Invoice Builder for ${payload.clientName}`);
          } else {
            showToast("Opening Invoice Builder");
          }
        }
        break;
      }
      case "record_payment": {
        const payload = action.payload || {};
        const matchedInv = invoices.find(inv => 
          (payload.invoiceId && inv.id === payload.invoiceId) ||
          (payload.invoiceNumber && inv.invoiceNumber.toLowerCase() === payload.invoiceNumber.toLowerCase()) ||
          (payload.clientName && inv.clientName.toLowerCase().includes(payload.clientName.toLowerCase()))
        );
        const invId = matchedInv?.id || payload.invoiceId;
        const amt = Number(payload.amountPaid || matchedInv?.balanceRemaining || matchedInv?.grandTotal || 0);

        if (invId && amt > 0) {
          await handleRecordPayment(invId, {
            amountPaid: amt,
            paymentMethod: payload.paymentMethod || 'cash',
            referenceNumber: payload.referenceNumber || `PM-${Date.now().toString().slice(-4)}`,
            paymentDate: payload.paymentDate || new Date().toISOString(),
            notes: payload.notes || 'Recorded via Binti AI'
          });
          logAuditEvent(
            "record_payment", 
            `Recorded payment of ${companySettings.currency || 'KES'} ${amt.toLocaleString()} for ${matchedInv?.invoiceNumber || payload.invoiceNumber || 'Invoice'}`, 
            payload
          );
          showToast(`Payment of ${companySettings.currency || 'KES'} ${amt.toLocaleString()} recorded.`);
          setActiveTab("invoices");
        } else {
          setActiveTab("invoices");
          showToast("Opened Invoices to record payment.");
        }
        break;
      }
      case "import_clients": {
        const clientList = action.payload?.clients || action.payload?.Clients || (Array.isArray(action.payload) ? action.payload : []);
        if (Array.isArray(clientList) && clientList.length > 0) {
          for (const c of clientList) {
            await handleCreateClient({
              name: c.name || c.Name || c.clientName || 'Client',
              company: c.company || c.Company || '',
              phone: c.phone || c.Phone || '',
              email: c.email || c.Email || '',
              address: c.address || c.Address || '',
              taxNumber: c.taxNumber || c.tax_number || c.TaxPIN || ''
            });
          }
          logAuditEvent("import_clients", `Imported ${clientList.length} clients from uploaded document.`, { count: clientList.length });
          showToast(`Successfully imported ${clientList.length} clients into directory.`);
          setActiveTab("clients");
        } else {
          showToast("No client records found to import.", "warning");
        }
        break;
      }
      case "import_products": {
        const prodList = action.payload?.products || action.payload?.Products || (Array.isArray(action.payload) ? action.payload : []);
        if (Array.isArray(prodList) && prodList.length > 0) {
          for (const p of prodList) {
            await handleCreateProduct({
              name: p.name || p.Name || 'Product / Service',
              description: p.description || p.Description || '',
              category: p.category || p.Category || 'General',
              unitType: p.unitType || p.unit_type || 'Day',
              unitPrice: Number(p.unitPrice || p.price || 0),
              taxRate: Number(p.taxRate || 16)
            });
          }
          logAuditEvent("import_products", `Imported ${prodList.length} catalog items from document.`, { count: prodList.length });
          showToast(`Successfully imported ${prodList.length} catalog items.`);
          setActiveTab("products");
        } else {
          showToast("No catalog records found to import.", "warning");
        }
        break;
      }
      case "open_client":
        setActiveTab("clients");
        showToast("Opening Client directory");
        break;
      case "open_settings":
        setActiveTab("settings");
        break;
      default:
        if (action.payload?.tab) {
          setActiveTab(action.payload.tab);
        }
        break;
    }
  };

  // Notification Click Navigation
  const handleNotificationClick = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, unread: false } : n));
    try {
      const readRaw = localStorage.getItem("binti_read_notifications");
      const readList: string[] = readRaw ? JSON.parse(readRaw) : [];
      if (!readList.includes(notifId)) {
        localStorage.setItem("binti_read_notifications", JSON.stringify([...readList, notifId]));
      }
    } catch (e) {}
    
    if (notifId.includes("overdue") || notifId.includes("due")) {
      setActiveTab("invoices");
    } else if (notifId.includes("pm")) {
      setActiveTab("payments");
    }
  };

  const handleClearNotifications = () => {
    try {
      localStorage.setItem("binti_notifications_cleared_at", new Date().toISOString());
      const dismissedRaw = localStorage.getItem("binti_dismissed_notifications");
      const existing: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
      const updated = Array.from(new Set([...existing, ...notifications.map(n => n.id)]));
      localStorage.setItem("binti_dismissed_notifications", JSON.stringify(updated));
    } catch (e) {}
    setNotifications([]);
    showToast("All notifications cleared.");
  };

  const handleDismissNotification = (notifId: string) => {
    try {
      const dismissedRaw = localStorage.getItem("binti_dismissed_notifications");
      const existing: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
      if (!existing.includes(notifId)) {
        localStorage.setItem("binti_dismissed_notifications", JSON.stringify([...existing, notifId]));
      }
    } catch (e) {}
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  // Safe global search filtering (guards against undefined fields)
  const searchLower = (globalSearch || '').toLowerCase().trim();
  const filteredQuotes = searchLower ? quotes.filter(q => 
    (q.quoteNumber || '').toLowerCase().includes(searchLower) ||
    (q.clientName || '').toLowerCase().includes(searchLower)
  ) : [];

  const filteredInvoices = searchLower ? invoices.filter(inv => 
    (inv.invoiceNumber || '').toLowerCase().includes(searchLower) ||
    (inv.clientName || '').toLowerCase().includes(searchLower)
  ) : [];

  // ==========================================
  // VIEW RENDERING SELECTOR
  // ==========================================
  const renderWorkspace = () => {
    const safeInvoicesList = Array.isArray(invoices) ? invoices : [];
    const safeQuotesList = Array.isArray(quotes) ? quotes : [];
    const safeClientsList = Array.isArray(clients) ? clients : [];

    const totalInvoicesValue = safeInvoicesList.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalPaid = safeInvoicesList.reduce((sum, inv) => {
      const pSum = (inv.payments || []).reduce((pSumAcc, pm) => pSumAcc + (pm.amountPaid || 0), 0);
      const computedPaid = pSum > 0 ? pSum : Math.max(0, (inv.grandTotal || 0) - (inv.balanceRemaining || 0));
      return sum + computedPaid;
    }, 0);
    const totalOutstanding = safeInvoicesList.reduce((sum, inv) => sum + (inv.balanceRemaining || 0), 0);
    const totalQuotes = safeQuotesList.length;
    const totalInvoices = safeInvoicesList.length;
    const activeClientsCount = safeClientsList.filter(c => c.status === "active").length;
    const averageInvoiceValue = totalInvoices > 0 ? totalInvoicesValue / totalInvoices : 0;
    const convertedQuotes = safeQuotesList.filter(q => q.status === "converted").length;
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
            currentUser={currentUser}
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
            onOpenBintiPrompt={(prompt) => {
              setBintiInitialPrompt(prompt);
              setIsAiAssistantOpen(true);
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
            companySettings={companySettings}
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
            companySettings={companySettings}
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
            showToast={showToast}
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
            showToast={showToast}
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
            theme={theme}
            onToggleTheme={(newTheme) => {
              setTheme(newTheme);
              showToast(`Visual appearance updated to ${newTheme} mode.`);
            }}
            showToast={showToast}
          />
        );
      default:
        return <div className="text-sm text-gray-500">Module Workspace Under Construction</div>;
    }
  };

  // Auth Initializing Loader
  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-white/10 p-2.5 border border-[#D4AF37]/40 shadow-xl flex items-center justify-center mb-4 animate-pulse">
          <img src="/logo.jpeg" alt="Binti Events" className="w-full h-full object-contain rounded-xl" />
        </div>
        <div className="flex items-center space-x-2 text-[#D4AF37]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium tracking-wide">Loading workspace...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated Login Screen
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        isSigningIn={isSigningIn}
        authError={authError}
        authSuccessMsg={authSuccessMsg}
        sessionTimeoutMsg={sessionTimeoutMsg}
        clearSessionTimeoutMsg={() => {
          localStorage.removeItem("binti_session_timeout_msg");
          setSessionTimeoutMsg(null);
        }}
      />
    );
  }

  // Live Application Workspace Layout
  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-sans">
      {/* Sidebar Navigation Panel */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
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
          onClearNotifications={handleClearNotifications}
          onDismissNotification={handleDismissNotification}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        />

        {/* Dynamic Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {/* Global search overlay portal */}
          {globalSearch ? (
            <div className="bg-white border border-gray-100 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 animate-fade-in absolute inset-x-3 sm:inset-x-8 top-4 md:top-8 z-40">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Search Results for "{globalSearch}"
                </span>
                <button 
                  onClick={() => setGlobalSearch("")}
                  className="text-xs text-red-500 hover:underline font-semibold"
                >
                  Close portal
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quotes matched */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Quotes ({filteredQuotes.length})</span>
                  {filteredQuotes.length === 0 ? (
                    <p className="text-xs text-gray-400">No quotes matched.</p>
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

                {/* Invoices matched */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tax Invoices ({filteredInvoices.length})</span>
                  {filteredInvoices.length === 0 ? (
                    <p className="text-xs text-gray-400">No invoices matched.</p>
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

      {/* Floating Binti Bottom-Right Action Container */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-2 pointer-events-auto select-none font-sans">
        {/* Onboarding Welcome Card */}
        {showBintiWelcome && (
          <div className="w-72 p-4 bg-white border border-gray-100 rounded-3xl shadow-2xl space-y-3 animate-fade-in border-t-4 border-t-[#80237E] relative">
            <button
              onClick={() => dismissBintiWelcome(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
              title="Close intro"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1F2937] p-1 flex items-center justify-center border border-[#D4AF37]/50 shrink-0 shadow-sm">
                <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Meet Binti</span>
                </h4>
                <p className="text-[11px] text-gray-500 font-medium">Your smart event assistant</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              I can help you manage quotations, tax invoices, bookings, and financial reports.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                onClick={() => dismissBintiWelcome(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium rounded-xl transition-colors"
              >
                Maybe later
              </button>
              <button
                onClick={() => dismissBintiWelcome(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#1F2937] to-[#80237E] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 transition-all flex items-center space-x-1"
              >
                <span>Try Binti</span>
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              </button>
            </div>
          </div>
        )}

        {/* Contextual Helper Hint Bubble */}
        {!showBintiWelcome && activeTab && (
          <div 
            onClick={() => {
              const promptMap: Record<string, string> = {
                dashboard: "Summarize today's business activity and financial health.",
                quotes: "How do I create a quotation and convert it into an invoice?",
                invoices: "How do I record payment for an invoice?",
                clients: "Summarize our active client records."
              };
              setBintiInitialPrompt(promptMap[activeTab] || "");
              setIsAiAssistantOpen(true);
            }}
            className="hidden md:flex items-center space-x-1.5 bg-white/95 hover:bg-white border border-gray-200/80 hover:border-[#80237E]/40 px-3 py-1.5 rounded-full shadow-lg text-[11px] text-gray-700 cursor-pointer transition-all hover:scale-105"
          >
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span className="font-semibold text-gray-800">
              {activeTab === "dashboard" && "Want me to summarize today's activity?"}
              {activeTab === "quotes" && "Need help creating or converting a quote?"}
              {activeTab === "invoices" && "Need to track payments or explain an invoice?"}
              {activeTab === "clients" && "Want a summary of active clients?"}
              {!["dashboard", "quotes", "invoices", "clients"].includes(activeTab) && "Ask Binti anything"}
            </span>
          </div>
        )}

        {/* Floating Button "✨ Binti" */}
        <button
          onClick={() => {
            setBintiInitialPrompt("");
            setIsAiAssistantOpen(true);
          }}
          className="px-4 py-2.5 bg-white border-2 border-[#D4AF37]/60 hover:border-[#80237E] rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center space-x-2.5 group"
          title="Open Binti Assistant"
        >
          <div className="w-7 h-7 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0 shadow-xs">
            <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs font-bold text-gray-900 tracking-wide flex items-center space-x-1">
            <span>Binti</span>
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
          </span>
        </button>
      </div>

      {/* Binti AI Assistant Slide-over Drawer Modal */}
      <BintiAiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => {
          setIsAiAssistantOpen(false);
          setBintiInitialPrompt("");
        }}
        initialPrompt={bintiInitialPrompt}
        onExecuteAction={handleExecuteAiAction}
        saasContext={{
          clientCount: clients.length,
          totalQuotes: quotes.length,
          convertedQuotes: quotes.filter(q => q.status === "converted").length,
          totalInvoices: invoices.length,
          totalRevenue: invoices.reduce((sum, inv) => {
            const pSum = (inv.payments || []).reduce((pSumAcc, pm) => pSumAcc + (pm.amountPaid || 0), 0);
            return sum + (pSum > 0 ? pSum : Math.max(0, (inv.grandTotal || 0) - (inv.balanceRemaining || 0)));
          }, 0),
          pendingBalance: invoices.reduce((sum, inv) => sum + (inv.balanceRemaining || 0), 0),
          collectionRate: (invoices.reduce((sum, inv) => {
            const pSum = (inv.payments || []).reduce((pSumAcc, pm) => pSumAcc + (pm.amountPaid || 0), 0);
            return sum + (pSum > 0 ? pSum : Math.max(0, (inv.grandTotal || 0) - (inv.balanceRemaining || 0)));
          }, 0) + invoices.reduce((sum, inv) => sum + (inv.balanceRemaining || 0), 0)) > 0
            ? Math.round(
                (invoices.reduce((sum, inv) => {
                  const pSum = (inv.payments || []).reduce((pSumAcc, pm) => pSumAcc + (pm.amountPaid || 0), 0);
                  return sum + (pSum > 0 ? pSum : Math.max(0, (inv.grandTotal || 0) - (inv.balanceRemaining || 0)));
                }, 0) /
                  (invoices.reduce((sum, inv) => {
                    const pSum = (inv.payments || []).reduce((pSumAcc, pm) => pSumAcc + (pm.amountPaid || 0), 0);
                    return sum + (pSum > 0 ? pSum : Math.max(0, (inv.grandTotal || 0) - (inv.balanceRemaining || 0)));
                  }, 0) +
                    invoices.reduce((sum, inv) => sum + (inv.balanceRemaining || 0), 0))) *
                  100
              )
            : 100,
          conversionRate: quotes.length > 0 ? Math.round((quotes.filter(q => q.status === "converted").length / quotes.length) * 100) : 0,
          currency: companySettings.currency,
          companyName: companySettings.companyName,
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          connectedModules: ["Clients", "Quotes Pipeline", "Invoices Ledger", "Product Catalog", "Billing Settings"],
          clientsSummary: clients.map(c => ({
            id: c.id,
            name: c.name,
            company: c.company,
            phone: c.phone,
            email: c.email
          })),
          invoicesSummary: invoices.map(i => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            clientName: i.clientName,
            grandTotal: i.grandTotal,
            balanceRemaining: i.balanceRemaining,
            status: i.status,
            dueDate: i.dueDate
          })),
          quotesSummary: quotes.map(q => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            clientName: q.clientName,
            grandTotal: q.grandTotal,
            status: q.status
          })),
          productsCatalog: products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.unitPrice,
            unit: p.unitType
          }))
        }}
      />

      {/* Global Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-xs font-extrabold tracking-wide px-4 py-2 rounded-2xl bg-white shadow-xl border pointer-events-none select-none animate-fade-in ${toast.type === 'success' ? 'text-emerald-700 border-emerald-200' : 'text-rose-700 border-rose-200'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
