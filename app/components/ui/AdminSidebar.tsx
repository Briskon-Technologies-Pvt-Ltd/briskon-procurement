"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  ClipboardList,
  Gavel,
  Trophy,
  FileCheck,
  FileSignature,
  Users,
  Grid,
  Shield,
  ListChecks,
  History,
  BarChart3,
  LayoutDashboard,
} from "lucide-react";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Grid, label: "Categories", path: "/admin/categories" },
    { icon: Users, label: "Suppliers", path: "/admin/suppliers" },
    { icon: FileText, label: "Requisitions", path: "/admin/requisitions" },
    { icon: ClipboardList, label: "RFQ's", path: "/admin/rfqs" },
    { icon: Gavel, label: "Auctions", path: "/admin/auctions" },
    { icon: Trophy, label: "Awards", path: "/admin/awards" },
    { icon: FileCheck, label: "Orders", path: "/admin/purchase-orders" },
    { icon: FileSignature, label: "Messages", path: "/admin/messages" },
    // { icon: Shield, label: "Roles & Access", path: "/admin/roles-access" },
    // { icon: ListChecks, label: "Approval Templates", path: "/admin/approval-templates" },
    //{ icon: History, label: "Approval History", path: "/admin/approval-history" },
    // { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <aside className="admin-sidebar compact">
      <div className="sidebar-logo">
        <img src="/logo.svg" alt="Briskon Logo" className="logo-image" />
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item, idx) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <div
              key={idx}
              className={`sidebar-item ${isActive ? "active" : ""}`}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="sidebar-icon">
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <span className={`sidebar-label ${isActive ? "active-label" : ""}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
