import { CalendarDays, Package, Search, Inbox, AlertCircle, Bell, User, QrCode, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const navItems = [
  { name: "Laundry Day", icon: CalendarDays },
  { name: "Track Order", icon: Package },
  { name: "Lost Item", icon: Search },
  { name: "Found Items", icon: Inbox },
  { name: "Report Item", icon: AlertCircle },
  { name: "Notifications", icon: Bell },
  { name: "My QR Code", icon: QrCode },
  { name: "Profile", icon: User },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
}

export default function Sidebar({ activeTab, setActiveTab, onLogout, isOpen }: SidebarProps) {
  return (
    <div className={twMerge(
      "fixed lg:static inset-y-0 left-0 w-64 bg-[#111828] text-white flex flex-col h-full shrink-0 z-50 transition-transform duration-300 transform lg:translate-x-0",
      isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
    )}>
      <div className="p-5 pt-7">
        <div className="flex items-center justify-center mb-3">
          <img src="/laundrolink-logo.png" alt="LaundroLink" className="h-20 w-auto object-contain" />
        </div>
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase text-center">Student Portal</p>
      </div>

      <nav className="flex-1 mt-6 px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setActiveTab(item.name)}
            className={twMerge(
              clsx(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                activeTab === item.name
                  ? "bg-[#2962ff] text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )
            )}
          >
            <item.icon className={clsx("w-5 h-5", activeTab === item.name ? "text-white" : "text-slate-400")} />
            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 px-8 pb-8 space-y-4">
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 text-sm font-medium text-slate-400 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>LOGOUT</span>
        </button>
      </div>
    </div>
  );
}
