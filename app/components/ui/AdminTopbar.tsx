"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Grid,
  FileText,
  ClipboardList,
  Gavel,
  Trophy,
  FileCheck,
  FileSignature,
  Users,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  Inbox, 
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "../../components/auth/AuthProvider";
import Link from "next/link";

export default function AdminTopbar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  /* ===== Sidebar menu mapping reused for icon + title + breadcrumb ===== */
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard: Briskon Procurement Solution", breadcrumbLabel: "Dashboard", path: "/admin" },
    { icon: Grid, label: "Category Management", breadcrumbLabel: "Categories", path: "/admin/categories" },
    { icon: Grid, label: "Create Category / Subcategory", breadcrumbLabel: "New Category", path: "/admin/categories/new" },
    { icon: FileText, label: "Requisitions", breadcrumbLabel: "Requisitions", path: "/admin/requisitions" },
    { icon: ClipboardList, label: "Request for Quotations", breadcrumbLabel: "RFQs", path: "/admin/rfqs" },
    { icon: Gavel, label: "Auction Management", breadcrumbLabel: "Auctions", path: "/admin/auctions" },
    { icon: Trophy, label: "Awards Management", breadcrumbLabel: "Awards", path: "/admin/awards" },
    { icon: FileCheck, label: "Purchase Orders", breadcrumbLabel: "ALL PO's", path: "/admin/purchase-orders" },
    { icon: FileSignature, label: "Contract Management", breadcrumbLabel: "Contracts", path: "/admin/contracts" },
    { icon: Users, label: "Supplier Management", breadcrumbLabel: "Suppliers", path: "/admin/suppliers" },
    { icon: Users, label: "Create New Supplier", breadcrumbLabel: "New Supplier", path: "/admin/suppliers/new" },
    { icon: BarChart3, label: "Procurement Analytics", breadcrumbLabel: "Analytics", path: "/admin/analytics" },
    { icon: BarChart3, label: "Departments and Cost-centers", breadcrumbLabel: "Settings", path: "/admin/settings" },
  ];

  /* ===== Find icon + label for current route ===== */
  const currentItem =
    menuItems.find((item) => pathname === item.path) ||
    (pathname.startsWith("/admin/auctions/")
      ? { icon: Gavel, label: "Auction Details" }
      : pathname.startsWith("/admin/rfqs/")
      ? { icon: ClipboardList, label: "RFQ Details" }
      : { icon: LayoutDashboard, label: "Admin Panel" });

  const Icon = currentItem.icon;

  /* ===== Breadcrumb logic ===== */
  const segments = pathname
    .split("/")
    .filter((seg) => seg && seg !== "admin");

  const breadcrumbItems = segments.map((seg, index) => {
    const url = `/admin/${segments.slice(0, index + 1).join("/")}`;
    const matched = menuItems.find((item) => item.path === url);
    const label =
      matched?.breadcrumbLabel || // 👈 use short breadcrumb label if defined
      matched?.label ||
      seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, url };
  });

  const getInitials = () => {
    if (!profile?.fname && !profile?.lname) return "U";
    const first = profile?.fname?.charAt(0).toUpperCase() || "";
    const last = profile?.lname?.charAt(0).toUpperCase() || "";
    return `${first}${last}`;
  };

  return (
    <header className="admin-topbar">
      {/* ===== LEFT SECTION: ICON + TITLE + BREADCRUMB ===== */}
      <div className="flex flex-col">
        <h2 className="topbar-title text-lg font-semibold text-[#012b73] flex items-center gap-2">
          {/* ✅ dynamic icon that matches left sidebar */}
          <Icon size={20} strokeWidth={1.8} className="text-[#155ee5]" />
          {currentItem.label}
        </h2>

        {/* Breadcrumb */}
        {breadcrumbItems.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <span
              className="cursor-pointer hover:text-[#2f6efb]"
              onClick={() => router.push("/admin")}
            >
              Dashboard
            </span>
            {breadcrumbItems.map((item, idx) => (
              <span key={idx} className="flex items-center">
                <ChevronRight size={14} className="mx-1 text-gray-400" />
                <span
                  className={`cursor-pointer ${
                    idx === breadcrumbItems.length - 1
                      ? "text-gray-700 font-medium"
                      : "hover:text-[#2f6efb]"
                  }`}
                  onClick={() => router.push(item.url)}
                >
                  {item.label}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ===== RIGHT SECTION ===== */}
      <div className="topbar-right">
        <button className="icon-btn" title="Notifications">
          <Bell size={20} />
          
        </button>

        
        <Link href="/admin/settings">
          <button className="icon-btn" title="Settings">
            <Settings size={20} />
          </button>
        </Link>

        <div className="profile-section">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt="Profile Avatar"
              width={32}
              height={32}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-initials">{getInitials()}</div>
          )}
        </div>

        <button
          className="icon-btn logout-btn"
          title="Logout"
          onClick={signOut}
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
