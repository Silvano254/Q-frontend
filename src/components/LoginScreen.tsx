import React, { useState, useEffect } from "react";
import { 
  Shield, 
  User, 
  Lock, 
  ArrowRight, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Loader2, 
  Clock,
  X,
  KeyRound
} from "lucide-react";

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  isSigningIn: boolean;
  authError: string | null;
  authSuccessMsg: string | null;
  sessionTimeoutMsg: string | null;
  clearSessionTimeoutMsg: () => void;
}

export default function LoginScreen({
  onLogin,
  isSigningIn,
  authError,
  authSuccessMsg,
  sessionTimeoutMsg,
  clearSessionTimeoutMsg
}: LoginScreenProps) {
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Close help modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showHelpModal) {
        setShowHelpModal(false);
      }
    };
    if (showHelpModal) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showHelpModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim() || isSigningIn) return;
    clearSessionTimeoutMsg();
    onLogin(authEmail.trim(), authPassword);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-between p-4 sm:p-8 md:p-12 font-sans relative overflow-x-hidden">
      {/* Top gold accent line across top of screen */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#D4AF37] via-amber-200 to-[#80237E]" />

      {/* Full Screen Centered Content Container */}
      <div className="w-full max-w-[480px] mx-auto flex flex-col justify-between flex-1 py-6 sm:py-10 relative z-10 animate-fade-in">
        <div>
          {/* 1. Large Logo / Brand Graphic at top center with generous whitespace */}
          <div className="text-center pt-4 mb-8">
            <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-white p-3 border-2 border-[#D4AF37]/40 shadow-lg flex items-center justify-center mb-6 transition-transform hover:scale-105">
              <img src="/logo.jpeg" alt="Binti Events" className="w-full h-full object-contain rounded-2xl" />
            </div>
            
            {/* 2. Welcoming headline */}
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 leading-tight tracking-tight px-2">
              Log in to keep track of your{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#80237E] to-[#D4AF37]">
                events with ease!
              </span>
            </h1>
          </div>

          {/* Session Inactivity Timeout Banner */}
          {sessionTimeoutMsg && (
            <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start space-x-3 text-xs text-amber-900 animate-fade-in shadow-xs">
              <Clock className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">Session Timed Out</p>
                <p className="leading-relaxed text-amber-800">{sessionTimeoutMsg}</p>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {authError && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-2.5 text-xs text-red-700 animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="font-medium leading-normal">{authError}</span>
            </div>
          )}

          {/* Success Notification */}
          {authSuccessMsg && (
            <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-2.5 text-xs text-emerald-700 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="font-medium leading-normal">{authSuccessMsg}</span>
            </div>
          )}

          {/* 3. Form elements stacked vertically */}
          <form onSubmit={handleSubmit} className="w-[92%] sm:w-[90%] mx-auto space-y-6">
            {/* Field 1: Email */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4 text-[#80237E]" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@bintievents.co.ke"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 min-h-[48px] border border-gray-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#80237E]/20 focus:border-[#80237E] font-semibold text-gray-800 bg-gray-50/50 transition-all"
                />
              </div>
            </div>

            {/* Field 2: Password & Help Link */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs font-bold text-[#80237E] hover:text-[#6B46C1] hover:underline transition-colors"
                >
                  Need Help Signing In?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4 text-[#80237E]" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3.5 min-h-[48px] border border-gray-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#80237E]/20 focus:border-[#80237E] font-semibold text-gray-800 bg-gray-50/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs pt-1 text-gray-500 font-medium">Administrator accounts are provisioned by the system owner.</p>

            {/* 4. Action Row */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full min-h-[48px] py-3.5 bg-gradient-to-r from-[#80237E] via-[#6B46C1] to-[#55369b] hover:opacity-95 text-white rounded-2xl text-xs sm:text-sm font-extrabold tracking-wide transition-all shadow-lg shadow-[#80237E]/25 flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#EAB308] animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 text-[#EAB308]" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Bottom security assurance */}
        <div className="pt-8 mt-10 border-t border-gray-100 flex items-center justify-center space-x-4 text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">
          <span className="flex items-center space-x-1.5 text-emerald-700">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit SSL / TLS Encrypted</span>
          </span>
          <span>•</span>
          <span>Binti Events Management</span>
        </div>
      </div>

      {/* Account Help & Support Modal */}
      {showHelpModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Account Recovery & Support"
          className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 font-sans relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#80237E] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Account Access & Recovery</h3>
                  <p className="text-[11px] text-gray-500">Binti Events Security</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                aria-label="Close modal"
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-5 space-y-3 text-xs text-gray-600 leading-relaxed">
              <p>
                Administrator credentials for <strong>Binti Events Management System</strong> are secured and centrally provisioned.
              </p>
              <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-1.5 text-gray-800">
                <p className="font-bold text-[#80237E]">Forgot your password or need a reset?</p>
                <p className="text-[11px] text-gray-600">
                  Please reach out to your lead system administrator or organization supervisor to reset your account credentials directly through the admin portal.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
