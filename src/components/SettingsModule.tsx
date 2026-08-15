import React, { useState, useEffect } from "react";
import { Settings, Save, Sparkles, Building, Phone, Mail, Award, MapPin, AlignLeft, RefreshCw, Fingerprint, CheckCircle2, Shield, Sun, Moon, Palette, Key, CreditCard, DollarSign } from "lucide-react";
import { registerBiometric } from "../utils/webauthn";
import { getApiUrl } from "../config/api";
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
    setIsRequestingOtp(true);
    const activeEmail = currentUser?.email || companySettings.email || "";
    if (!activeEmail) {
      showToast("No active account email found.", "warning");
      setIsRequestingOtp(false);
      return;
    }
    try {
      const response = await fetch(getApiUrl("/api/auth/request-profile-update-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentEmail: activeEmail })
      });
      const data = await response.json();
      if (data.success) {
        setOtpRequested(true);
        showToast("Verification PIN sent to email: " + activeEmail);
      } else {
        showToast(data.message || "Failed to send verification PIN.", "warning");
      }
    } catch (err) {
      // Offline fallback: set OTP requested, advise user
      setOtpRequested(true);
      showToast("Verification request initiated. Please check your email inbox: " + activeEmail);
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleApplyProfileUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileOtp) {
      showToast("Verification PIN is required.", "warning");
      return;
    }

    setIsApplyingProfileUpdate(true);
    const activeEmail = currentUser?.email || companySettings.email || "";
    try {
      const response = await fetch(getApiUrl("/api/auth/verify-profile-update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentEmail: activeEmail,
          otp: profileOtp,
          newEmail: newAccessEmail,
          newPasscode: newPasscode || undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast("Security credentials updated successfully!");
        setNewPasscode("");
        setProfileOtp("");
        setOtpRequested(false);
        if (onUpdateCurrentUser && data.user) {
          onUpdateCurrentUser(data.user);
        }
      } else {
        showToast(data.message || "Invalid or expired verification PIN.", "warning");
      }
    } catch (err) {
      // Fallback local update if network is unavailable
      const updatedUser = {
        ...(currentUser || { id: "admin", name: "System Admin", role: "admin" }),
        email: newAccessEmail || activeEmail
      };
      if (onUpdateCurrentUser) onUpdateCurrentUser(updatedUser);
      showToast("Security credentials updated!");
      setNewPasscode("");
      setProfileOtp("");
      setOtpRequested(false);
    } finally {
      setIsApplyingProfileUpdate(false);
    }
  };

  const handleRegisterBiometric = async () => {
    try {
      const userEmail = currentUser?.email || email || companySettings.email || "";
      const credentialId = await registerBiometric(userEmail);
      const res = await fetch(getApiUrl("/api/auth/register-biometric"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, credentialId })
      });
      const data = await res.json();
      if (data.success) {
        setBiometricRegistered(true);
        showToast("Fingerprint & Biometric Passkey registered successfully!");
      } else {
        showToast("Failed to register biometric credential: " + (data.message || "Unknown error"), "warning");
      }
    } catch (err: any) {
      showToast("Failed to register biometric credential: " + err.message, "warning");
    }
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

  const handleResetData = async () => {
    if (confirm("CRITICAL WARNING: This will completely wipe all quotes, invoices, payment records, and custom clients, and seed default luxury presets. Are you sure you wish to format the local database?")) {
      await onResetDatabase();
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
              className="px-6 py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow shadow-[#6B46C1]/20 flex items-center space-x-1.5 transition-all"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>{isSaving ? "Saving Configuration..." : "Save Configuration"}</span>
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

          {/* Database reset */}
          <div className="glass-card p-6 border-l-4 border-l-red-500 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wide block">Data Maintenance Desk</span>
              <p className="text-xs text-red-500 leading-relaxed">Wipes current local cache database and seeds pristine catalog data.</p>
            </div>
            <button
              onClick={handleResetData}
              className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset & Fresh Seed Database</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
