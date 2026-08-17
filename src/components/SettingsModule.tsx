import React, { useState, useEffect } from "react";
import { Settings, Save, Sparkles, Building, Phone, Mail, Award, MapPin, AlignLeft, RefreshCw, Fingerprint, CheckCircle2, Shield, Sun, Moon, Palette, Key, CreditCard, DollarSign, Loader2, AlertTriangle, ShieldAlert, X } from "lucide-react";
import { CompanySettings } from "../types";

interface SettingsModuleProps {
  companySettings: CompanySettings;
  onUpdateSettings: (settings: CompanySettings) => Promise<void>;
  onResetDatabase: () => Promise<void>;
  currentUser?: { name: string; role: string; email: string } | null;
  onUpdateCurrentUser?: (user: any) => void;
  theme?: "light" | "dark";
  onToggleTheme?: (theme: "light" | "dark") => void;
  showToast: (message: string, type?: "success" | "warning") => void;
}

export default function SettingsModule({
  companySettings,
  onUpdateSettings,
  onResetDatabase,
  currentUser,
  onUpdateCurrentUser,
  theme = "light",
  onToggleTheme,
  showToast
}: SettingsModuleProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [biometricRegistered, setBiometricRegistered] = useState(true);

  // Security Credentials Updates states
  const [newAccessEmail, setNewAccessEmail] = useState(currentUser?.email || companySettings.email || "");
  const [newPasscode, setNewPasscode] = useState("");
  const [profileOtp, setProfileOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isApplyingProfileUpdate, setIsApplyingProfileUpdate] = useState(false);

  React.useEffect(() => {
    if (currentUser?.email) {
      setNewAccessEmail(currentUser.email);
    } else if (companySettings.email) {
      setNewAccessEmail(companySettings.email);
    }
  }, [currentUser?.email, companySettings.email]);

  const handleRequestProfileOtp = async () => {
    showToast('Profile changes are managed by the system administrator.', 'warning');
  };

  const handleApplyProfileUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Profile changes are managed by the system administrator.', 'warning');
  };

  const handleRegisterBiometric = async () => {
    showToast('Biometric authentication is not configured.', 'warning');
  };
  
  // Fields state synced safely with companySettings prop
  const [companyName, setCompanyName] = useState(companySettings?.companyName || "Binti Events");
  const [email, setEmail] = useState(companySettings?.email || "");
  const [phone, setPhone] = useState(companySettings?.phone || "+254 700 111 222");
  const [address, setAddress] = useState(companySettings?.address || "Warehouse Block B, Ngong Road, Nairobi");
  const [taxNumber, setTaxNumber] = useState(companySettings?.taxNumber || "P051234567A");
  const [bankDetails, setBankDetails] = useState(companySettings?.bankDetails || "");
  const [currency, setCurrency] = useState(companySettings?.currency || "KES");
  const [termsTemplate, setTermsTemplate] = useState(companySettings?.termsTemplate || "");

  // Synchronize internal state whenever parent companySettings updates
  React.useEffect(() => {
    if (companySettings) {
      setCompanyName(companySettings.companyName || "Binti Events");
      setEmail(companySettings.email || "");
      setPhone(companySettings.phone || "+254 700 111 222");
      setAddress(companySettings.address || "Warehouse Block B, Ngong Road, Nairobi");
      setTaxNumber(companySettings.taxNumber || "P051234567A");
      setBankDetails(companySettings.bankDetails || "");
      setCurrency(companySettings.currency || "KES");
      setTermsTemplate(companySettings.termsTemplate || "");
    }
  }, [companySettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: CompanySettings = {
        ...companySettings,
        companyName,
        email,
        phone,
        address,
        taxNumber,
        bankDetails,
        currency,
        termsTemplate
      };
      await onUpdateSettings(payload);
      showToast("Corporate billing settings saved successfully.");
    } catch (err) {
      showToast("Failed to save settings.", "warning");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-[#6B46C1]" />
            <span>Billing Profile & System Defaults</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Configure KRA tax PIN, event logistics, and default fine-print contract structures.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Settings Form */}
        <div className="lg:col-span-2 glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Official Corporate Profile</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Company Name */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center space-x-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>Company Legal Identity</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold"
                />
              </div>

              {/* KRA tax number */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>Kenya Revenue PIN (KRA)</span>
                </label>
                <input
                  type="text"
                  required
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Corporate Billing Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Logistics Hotline Number</span>
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Physical Warehouse & Office Address</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            {/* Bank Details & Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center space-x-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Official Bank Account / Payment Instructions (Appears on PDFs)</span>
                </label>
                <textarea
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  rows={3}
                  placeholder="Equity Bank — A/C 1160274628991..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center space-x-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Default Currency Code</span>
                </label>
                <input
                  type="text"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="KES"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {/* Terms and conditions default template */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center space-x-1">
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Default Quotation & Tax Invoice fine-print Contract clauses</span>
              </label>
              <textarea
                value={termsTemplate}
                onChange={(e) => setTermsTemplate(e.target.value)}
                rows={6}
                className="w-full p-4 border border-gray-200 rounded-xl text-xs font-mono leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow shadow-[#6B46C1]/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#D4AF37]" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info card & Danger area */}
        <div className="space-y-6">
          {/* Brand Info */}
          <div className="bg-[#1F2937] text-white p-6 rounded-2xl border border-[#6B46C1]/20 shadow-lg space-y-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Corporate Guidelines</span>
            <p className="text-xs text-gray-300 leading-relaxed">
              Updating these fields instantly modifies the header blocks on generated **PDF Invoice files, Quotation files, and Email pitch drafts**.
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Always ensure your **KRA PIN (VAT Registration)** matches your compliance certificates before issuing tax invoices to public corporate entities.
            </p>
          </div>

          {/* Biometric Passkey Management Card */}
          <div className="bg-[#181024] text-white p-6 rounded-2xl border border-[#80237E]/40 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#EC4899] uppercase tracking-widest block">Passkey & Biometrics</span>
              <Shield className="w-4 h-4 text-[#EAB308]" />
            </div>
            
            <div>
              <h4 className="font-extrabold text-sm text-white flex items-center space-x-1.5">
                <Fingerprint className="w-4 h-4 text-[#EC4899]" />
                <span>Touch ID / Fingerprint Auth</span>
              </h4>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Register hardware passkey or fingerprint sensor for instant 1-touch authentication.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#80237E]/30">
              <div className="flex items-center space-x-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-[11px]">Passkey Active</span>
              </div>
              <button
                type="button"
                onClick={handleRegisterBiometric}
                className="py-2 px-3 bg-[#80237E] hover:bg-[#6b1e6a] text-white rounded-xl text-xs font-bold transition-all shadow"
              >
                Register Fingerprint
              </button>
            </div>
          </div>

           {/* Security Credentials Card */}
          <div className="glass-card p-6 border-l-4 border-l-[#80237E] space-y-4">
            <span className="text-[10px] font-bold text-[#80237E] uppercase tracking-widest block">Security & Access Credentials</span>
            
            <form onSubmit={handleApplyProfileUpdates} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase">New Access Email</label>
                <input
                  type="email"
                  required
                  value={newAccessEmail}
                  onChange={(e) => setNewAccessEmail(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase">New Passcode (Min 4 chars)</label>
                <input
                  type="password"
                  placeholder="Leave empty to keep current"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {otpRequested ? (
                <>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">
                      Verification PIN (Sent to {currentUser?.email || companySettings.email || "registered email"})
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={profileOtp}
                      onChange={(e) => setProfileOtp(e.target.value)}
                      placeholder="Enter 6-digit PIN from email"
                      className="w-full mt-1 px-3.5 py-2 border border-[#D4AF37] rounded-xl text-xs font-mono font-bold tracking-wider"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setOtpRequested(false)}
                      className="w-1/3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isApplyingProfileUpdate}
                      className="w-2/3 py-2 bg-[#80237E] hover:bg-[#6b1e6a] text-white rounded-xl text-xs font-bold transition-all"
                    >
                      {isApplyingProfileUpdate ? "Saving..." : "Verify & Apply"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestProfileOtp}
                  disabled={isRequestingOtp}
                  className="w-full py-2 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow shadow-[#6B46C1]/20 flex items-center justify-center space-x-1"
                >
                  <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{isRequestingOtp ? "Requesting code..." : "Authorize Credentials Change"}</span>
                </button>
              )}
            </form>
          </div>

          {/* Theme & Visual Display Settings */}
          <div className="glass-card p-6 border-l-4 border-l-[#80237E] space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block flex items-center space-x-1.5">
                <Palette className="w-4 h-4 text-[#80237E]" />
                <span>Appearance & Interface Theme</span>
              </span>
              <p className="text-xs text-gray-500 leading-relaxed">Switch workspace visual presentation between Clean Light and Executive Dark mode.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onToggleTheme && onToggleTheme("light")}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all border ${
                  theme === "light" 
                    ? "bg-[#80237E] text-white border-[#80237E] shadow-md" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Sun className="w-4 h-4 text-[#D4AF37]" />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleTheme && onToggleTheme("dark")}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all border ${
                  theme === "dark" 
                    ? "bg-[#80237E] text-white border-[#80237E] shadow-md" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Moon className="w-4 h-4 text-purple-300" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RED ZONE / DANGER ZONE: DATA MAINTENANCE & DATABASE RESET
      ───────────────────────────────────────────────────────────── */}
      <div className="mt-8 rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-50/70 via-rose-50/40 to-red-100/30 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-200/70 pb-6">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-red-600 text-white rounded-xl shadow-md shadow-red-600/20 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-red-600 text-white">
                  Red Zone
                </span>
                <h3 className="text-base font-bold text-red-950">
                  Data Maintenance & Cloud Database Reset
                </h3>
              </div>
              <p className="text-xs text-red-800/80 leading-relaxed max-w-2xl">
                Irreversible destructive actions. Formats the cloud database, purges all operational records, and re-seeds pristine luxury event presets and standard asset catalogs.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isResettingData}
            onClick={() => {
              setConfirmText("");
              setShowResetModal(true);
            }}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-red-600/25 shrink-0 disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>Initiate Database Wipe</span>
          </button>
        </div>

        {/* Impact summary checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div className="p-3.5 bg-white/80 rounded-xl border border-red-100/80 space-y-1">
            <span className="text-[11px] font-bold text-red-900 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Quotes & Proposals</span>
            </span>
            <p className="text-[10px] text-gray-500">All issued and draft quotations will be permanently wiped.</p>
          </div>

          <div className="p-3.5 bg-white/80 rounded-xl border border-red-100/80 space-y-1">
            <span className="text-[11px] font-bold text-red-900 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Invoices & Payments</span>
            </span>
            <p className="text-[10px] text-gray-500">All billing invoices, payment records, and receipts will be erased.</p>
          </div>

          <div className="p-3.5 bg-white/80 rounded-xl border border-red-100/80 space-y-1">
            <span className="text-[11px] font-bold text-red-900 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Client Profiles</span>
            </span>
            <p className="text-[10px] text-gray-500">All client contact information, tax PINs, and histories will be cleared.</p>
          </div>

          <div className="p-3.5 bg-white/80 rounded-xl border border-red-100/80 space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Catalog Presets</span>
            </span>
            <p className="text-[10px] text-gray-500">Pristine equipment, tents, furniture, and catalog rates will be restored.</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RED ZONE TYPED CONFIRMATION SECURITY MODAL
      ───────────────────────────────────────────────────────────── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-200 overflow-hidden space-y-5 p-6 animate-scale-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-900 uppercase tracking-wide">
                    Red Zone Authorization Required
                  </h4>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-red-50 rounded-xl border border-red-200/80 space-y-2 text-xs text-red-900 leading-relaxed">
              <p className="font-semibold">You are about to format the cloud database and re-seed clean demo records.</p>
              <p className="text-[11px] text-red-700">
                To confirm this operation, please type <strong className="font-mono text-red-950 bg-red-200/60 px-1 py-0.5 rounded">RESET</strong> below:
              </p>
            </div>

            <div>
              <input
                type="text"
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type RESET to confirm"
                className="w-full px-3.5 py-2.5 border-2 border-red-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-center"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResettingData}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText.trim().toUpperCase() !== "RESET" || isResettingData}
                onClick={async () => {
                  setIsResettingData(true);
                  try {
                    await onResetDatabase();
                    setShowResetModal(false);
                  } catch {
                    // Handled in parent
                  } finally {
                    setIsResettingData(false);
                  }
                }}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isResettingData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Confirm Wipe</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
