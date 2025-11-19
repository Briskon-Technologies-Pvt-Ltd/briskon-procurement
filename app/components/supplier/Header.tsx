"use client";

import { Bell, Rocket, Globe, ClipboardList, Inbox, CheckCircle, LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";
import { JSX } from "react";

const iconMap: Record<string, JSX.Element> = {
  "/supplier": <LayoutDashboard size={26} />,
  "/supplier/auctions": <Rocket size={26} />,
  "/supplier/opportunities": <Globe size={26} />,
  "/supplier/proposals": <ClipboardList size={26} />,
  "/supplier/messages": <Inbox size={26} />,
  "/supplier/compliance": <CheckCircle size={26} />,
};

export default function Header() {
  const pathname = usePathname() || "";

  const config = [
    { match: "/supplier/auctions", title: "Auctions", subtitle: "Auctions visible to your organization." },
    { match: "/supplier/opportunities", title: "Opportunities", subtitle: "Browse RFQs and sourcing requests." },
    { match: "/supplier/proposals", title: "My Proposals", subtitle: "Track and manage submitted proposals." },
    { match: "/supplier/messages", title: "Messages", subtitle: "Stay connected with procurement teams." },
    { match: "/supplier/compliance", title: "Compliance", subtitle: "Manage certifications & compliance docs." },
    { match: "/supplier", title: "Welcome Back 👋", subtitle: "Explore opportunities and participate in sourcing & auctions." },
  ];

  const match = config.find((c) => pathname === c.match || pathname.startsWith(c.match + "/"));
  const title = match?.title || "Briskon Supplier Portal";
  const subtitle = match?.subtitle || "";
  const icon = iconMap[match?.match || "/supplier"];

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2">
        {icon && <div className="text-indigo-400">{icon}</div>}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
        </div>
      </div>

      <button className="p-3 rounded-full bg-gray-800 border border-gray-700 hover:border-indigo-500 transition">
        <Bell size={20} />
      </button>
    </div>
  );
}
