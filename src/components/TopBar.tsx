import React, { useState, useRef, useEffect } from "react";
import { 
  Search, 
  Bell, 
  BellRing, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Menu, 
  Sparkles, 
  Trash2, 
  X, 
  BellOff, 
  ArrowRight 
} from "lucide-react";

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
  onClearNotifications?: () => void;
  onDismissNotification?: (id: string) => void;
  onToggleMobileMenu?: () => void;
  onOpenAiAssistant?: () => void;
}

export default function TopBar({ 
  globalSearch, 
  setGlobalSearch, 
  currency, 
  notifications, 
  onNotificationClick,
  onClearNotifications,
  onDismissNotification,
  onToggleMobileMenu,
  onOpenAiAssistant
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => n.unread).length;

  // Handle clicking outside the notification dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClearNotifications) {
      onClearNotifications();
    }
  };

  const handleDismissSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDismissNotification) {
      onDismissNotification(id);
    }
  };

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
      <div className="flex items-center space-x-3 md:space-x-5">
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
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-[#80237E]/5 border border-[#80237E]/10 rounded-xl">
          <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Currency:</span>
          <span className="text-xs font-bold text-[#80237E]">{currency}</span>
        </div>

        {/* Notifications Icon with popover */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className={`group relative p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center ${
              showNotifications
                ? "bg-[#80237E]/10 border-[#80237E]/40 text-[#80237E] shadow-sm ring-2 ring-[#80237E]/20"
                : unreadCount > 0
                  ? "bg-purple-50/60 border-purple-200/80 text-[#80237E] hover:bg-[#80237E]/10 hover:border-[#80237E]/40 shadow-xs"
                  : "bg-gray-50/80 border-gray-200/80 text-gray-500 hover:text-[#80237E] hover:bg-gray-100/80 hover:border-gray-300"
            }`}
          >
            {unreadCount > 0 ? (
              <BellRing className="w-4.5 h-4.5 text-[#80237E] group-hover:rotate-12 transition-transform duration-300" />
            ) : (
              <Bell className="w-4.5 h-4.5 text-current group-hover:scale-105 transition-transform duration-200" />
            )}

            {/* Glowing Unread Badge */}
            {unreadCount > 0 && (
              <>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-extrabold items-center justify-center shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              </>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white rounded-2xl border border-gray-200/80 shadow-2xl shadow-purple-900/10 overflow-hidden z-50 animate-fade-in">
              {/* Dropdown Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/80 via-purple-50/30 to-white">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#80237E]/10 flex items-center justify-center text-[#80237E]">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {notifications.length === 0 
                        ? "No new alerts" 
                        : `${notifications.length} total • ${unreadCount} unread`}
                    </p>
                  </div>
                </div>

                {/* Clear All Button - Visible after clicking the icon */}
                {notifications.length > 0 && onClearNotifications && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200/80 hover:border-red-200 rounded-lg transition-all shadow-2xs group"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors" />
                    <span>Clear all</span>
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-purple-50 text-[#80237E] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-purple-100">
                      <BellOff className="w-6 h-6 text-[#80237E]/70" />
                    </div>
                    <p className="text-xs font-semibold text-gray-700">All caught up!</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">No notifications or pending alerts at this time.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => {
                        onNotificationClick(notif.id);
                        setShowNotifications(false);
                      }}
                      className={`p-3.5 md:p-4 hover:bg-purple-50/30 transition-all cursor-pointer flex items-start space-x-3 group relative ${
                        notif.unread ? 'bg-purple-50/20' : 'bg-white'
                      }`}
                    >
                      {/* Icon per notification type */}
                      <div className="mt-0.5 shrink-0">
                        {notif.type === "overdue" && (
                          <div className="w-7 h-7 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                        {notif.type === "upcoming" && (
                          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                        {notif.type === "unpaid" && (
                          <div className="w-7 h-7 rounded-xl bg-yellow-50 text-[#D4AF37] flex items-center justify-center border border-yellow-100">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                        {notif.type === "payment" && (
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        {notif.type === "client" && (
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center space-x-1.5">
                          <p className={`text-xs ${notif.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {notif.title}
                          </p>
                          {notif.unread && (
                            <span className="w-1.5 h-1.5 bg-[#80237E] rounded-full shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{notif.description}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-medium flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span>{notif.time}</span>
                        </p>
                      </div>

                      {/* Individual Dismiss Button */}
                      {onDismissNotification && (
                        <button
                          onClick={(e) => handleDismissSingle(e, notif.id)}
                          className="opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer with Clear Notifications action */}
              {notifications.length > 0 && onClearNotifications && (
                <div className="p-2.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 pl-2">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
                  </span>
                  <button
                    onClick={handleClearAll}
                    className="text-xs font-semibold text-[#80237E] hover:text-[#6A1B69] hover:underline flex items-center space-x-1 px-2 py-1"
                  >
                    <span>Clear all notifications</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

