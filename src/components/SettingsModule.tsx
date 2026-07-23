import React, { useState } from "react";
import { Settings, Save, Sparkles, Building, Phone, Mail, Award, MapPin, AlignLeft, RefreshCw, Fingerprint, CheckCircle2, Shield } from "lucide-react";
import { registerBiometric } from "../utils/webauthn.js";
import { getApiUrl } from "../config/api.js";
import { CompanySettings } from "../../../shared/types.js";

interface SettingsModuleProps {
  companySettings: CompanySettings;
  onUpdateSettings: (settings: CompanySettings) => Promise<void>;
  onResetDatabase: () => Promise<void>;
  currentUser?: { name: string; role: string; email: string } | null;
  onUpdateCurrentUser?: (user: any) => void;
  showToast: (message: string, type?: "success" | "warning") => void;
}

export default function SettingsModule({
  companySettings,
  onUpdateSettings,
  onResetDatabase,
  currentUser,
  onUpdateCurrentUser,
  showToast
}: SettingsModuleProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(true);

  // Security Credentials Updates states
  const [newAccessEmail, setNewAccessEmail] = useState(currentUser?.email || "");
  const [newPasscode, setNewPasscode] = useState("");
  const [profileOtp, setProfileOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isApplyingProfileUpdate, setIsApplyingProfileUpdate] = useState(false);
  const [demoProfileOtp, setDemoProfileOtp] = useState("");

  const handleRequestProfileOtp = async () => {
    setIsRequestingOtp(true);
    setDemoProfileOtp("");
    try {
      const response = await fetch(getApiUrl("/api/auth/request-profile-update-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentEmail: currentUser?.email || "admin@bintievents.com" })
      });
      const data = await response.json();
      if (data.success) {
        setOtpRequested(true);
        if (data.otp) setDemoProfileOtp(data.otp);
        showToast("Verification code sent to your original email: " + (currentUser?.email || "admin@bintievents.com"));
      } else {
        showToast("Failed to send verification PIN: " + data.message, "warning");
      }
    } catch (err) {
      showToast("Error requesting verification PIN: " + err, "warning");
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
    try {
      const response = await fetch(getApiUrl("/api/auth/verify-profile-update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentEmail: currentUser?.email || "admin@bintievents.com",
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
        showToast("Failed to update credentials: " + data.message, "warning");
      }
    } catch (err) {
      showToast("Error updating security profile: " + err, "warning");
    } finally {
      setIsApplyingProfileUpdate(false);
    }
  };

  const handleRegisterBiometric = async () => {
    try {
      const userEmail = email || currentUser?.email || "admin@bintievents.com";
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
  
  // Fields state
  const [companyName, setCompanyName] = useState(companySettings.companyName || "Binti Events");
  const [email, setEmail] = useState(companySettings.email || "hello@bintievents.co.ke");
  const [phone, setPhone] = useState(companySettings.phone || "+254 700 111 222");
  const [address, setAddress] = useState(companySettings.address || "Warehouse Block B, Ngong Road, Nairobi");
  const [taxNumber, setTaxNumber] = useState(companySettings.taxNumber || "P051234567A");
  const [termsTemplate, setTermsTemplate] = useState(companySettings.termsTemplate || "");

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
                  {demoProfileOtp && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 font-semibold flex items-center justify-between">
                      <span>Verification PIN (test):</span>
                      <span className="font-mono font-black text-[#80237E]">{demoProfileOtp}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase">Verification PIN (Sent to {currentUser?.email})</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={profileOtp}
                      onChange={(e) => setProfileOtp(e.target.value)}
                      placeholder="Enter 6-digit PIN"
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
