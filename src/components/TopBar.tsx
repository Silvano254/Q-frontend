import React, { useState } from "react";
import { Search, Bell, Clock, AlertTriangle, CheckCircle2, User, ChevronDown, Menu, Sparkles } from "lucide-react";

interface TopBarProps {
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  currency: string;
  notifications: Array<{
    id: string;
    type: "overdue" | "upcoming" | "unpaid" | "payment" | "client";
    title: string;
    description: string;
    time: string;
    unread: boolean;
  }>;
  onNotificationClick: (id: string) => void;
  onToggleMobileMenu?: () => void;
  onOpenAiAssistant?: () => void;
}

export default function TopBar({ 
  globalSearch, 
  setGlobalSearch, 
  currency, 
  notifications, 
  onNotificationClick,
  onToggleMobileMenu,
  onOpenAiAssistant
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="h-16 bg-white border-b border-gray-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm shadow-gray-100/50">
      <div className="flex items-center space-x-3 flex-1 md:flex-initial">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl md:hidden focus:outline-none transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5 text-[#80237E]" />
        </button>

        {/* Search Bar Container */}
        <div className="w-full md:w-96 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
        <input
          type="text"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Global search by client, inv #, quote #, email..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#80237E]/20 focus:border-[#80237E] transition-all bg-[#F8F9FA]/70"
        />
        {globalSearch && (
          <button 
            onClick={() => setGlobalSearch("")}
            className="absolute right-3 inset-y-0 flex items-center text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}
        </div>
      </div>

      {/* Right Side Tools */}
      <div className="flex items-center space-x-4 md:space-x-6">
        {/* Ask Binti Button */}
        {onOpenAiAssistant && (
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-[#1F2937] via-[#2D1B4E] to-[#80237E] text-white hover:opacity-95 rounded-xl shadow-md shadow-purple-900/10 transition-all border border-[#80237E]/30"
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
            <span className="text-xs font-semibold tracking-wide hidden sm:inline">Ask Binti</span>
          </button>
        )}

        {/* Currency Status Indicator */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-[#80237E]/5 border border-[#80237E]/10 rounded-lg">
          <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Standard Currency:</span>
          <span className="text-xs font-bold text-[#80237E]">{currency}</span>
        </div>

        {/* Notifications Icon with popover */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <h3 className="font-semibold text-sm text-gray-800 flex items-center space-x-1.5">
                  <Bell className="w-4 h-4 text-[#6B46C1]" />
                  <span>SaaS Notifications</span>
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} pending
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                    <p className="text-xs">All caught up! No recent alerts.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => {
                        onNotificationClick(notif.id);
                        setShowNotifications(false);
                      }}
                      className={`p-4 hover:bg-gray-50/70 transition-colors cursor-pointer flex space-x-3 ${notif.unread ? 'bg-purple-50/10' : ''}`}
                    >
                      <div className="mt-0.5">
                        {notif.type === "overdue" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {notif.type === "upcoming" && <Clock className="w-4 h-4 text-amber-500" />}
                        {notif.type === "unpaid" && <AlertTriangle className="w-4 h-4 text-[#D4AF37]" />}
                        {notif.type === "payment" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {notif.type === "client" && <User className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${notif.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-normal truncate">{notif.description}</p>
                        <p className="text-[9px] text-gray-400 mt-1">{notif.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Corporate Status Indicator */}
        <div className="hidden sm:flex items-center space-x-2.5 pl-4 border-l border-gray-100">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
          <span className="text-xs font-semibold text-gray-700 tracking-wide uppercase">Admin Session Live</span>
        </div>
      </div>
    </header>
  );
}
