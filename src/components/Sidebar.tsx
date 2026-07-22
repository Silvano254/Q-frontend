import React from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Receipt, 
  Users, 
  ShoppingBag, 
  CreditCard, 
  BarChart3, 
  PieChart, 
  Settings as SettingsIcon, 
  Sparkles, 
  LogOut,
  X
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  userRole?: string;
  userName?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  onLogout, 
  userRole, 
  userName,
  isOpenMobile,
  onCloseMobile 
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "quotes", label: "Quotes", icon: FileText },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "clients", label: "Clients", icon: Users },
    { id: "products", label: "Products & Services", icon: ShoppingBag },
    { id: "payments", label: "Payments Log", icon: CreditCard },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "analytics", label: "Analytics", icon: PieChart },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <div className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#FAF9F5] text-gray-800 flex flex-col h-screen border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
        isOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
      }`}>
        {/* Brand Logo */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-md overflow-hidden border border-gray-100 shrink-0">
              <img src="/logo.jpeg" alt="Binti Tents & Events Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-base leading-tight bg-gradient-to-r from-[#80237E] via-[#EC4899] to-[#EAB308] bg-clip-text text-transparent truncate">
                Binti Events
              </h1>
              <p className="text-[9px] text-[#EC4899] font-bold tracking-widest uppercase truncate">
                Instinctively Elegant
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg md:hidden hover:bg-gray-100"
            aria-label="Close mobile menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-[#80237E] to-[#6b1e6a] text-white shadow-lg shadow-[#80237E]/30 border-l-4 border-[#EAB308]"
                  : "text-gray-600 hover:bg-[#F4F1EA] hover:text-[#80237E]"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110 text-[#EAB308]" : ""}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-gray-200 bg-[#F4F1EA] flex flex-col space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#80237E] via-[#EC4899] to-[#EAB308] p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-[#FAF9F5] rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-[#80237E]">
                {(userName || "Admin").substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{userName || "Binti Administrator"}</p>
            <p className="text-[10px] text-gray-500 capitalize">{userRole || "Admin"}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg text-xs font-medium border border-red-200 transition-all duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out Securely</span>
        </button>
      </div>
    </div>
  </>
);
}
