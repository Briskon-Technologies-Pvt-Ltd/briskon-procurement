"use client";

import { ReactNode, useState } from "react";
import { AuthProvider } from "../components/auth/AuthProvider";
import AdminSidebar from "../components/ui/AdminSidebar";
import AdminTopbar from "../components/ui/AdminTopbar";
import "../styles/admin.css";


export default function AdminLayout({ children }: { children: ReactNode }) {
  // 🔹 Add a toggle state for the sidebar
  const [collapsed, setCollapsed] = useState(false);

  // 🔹 Function to handle toggle
  const handleToggle = () => setCollapsed((prev) => !prev);

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-[var(--color-bg)]">
        {/* Sidebar */}
        <AdminSidebar collapsed={collapsed} onToggle={handleToggle} />

        {/* Main Content Area */}
        <div
          className={`flex flex-col flex-1 transition-all duration-300 ${
            collapsed ? "ml-[80px]" : "ml-[80px]"
          }`}
        >
          {/* Topbar */}
          <AdminTopbar />

          {/* Main Content */}
          <main className="p-6 flex-1">{children}</main>

          {/* Footer */}
          <footer className="footer">
            © Briskon Procurement & Reverse Auctions. All rights reserved.
          </footer>
        </div>
      </div>
    </AuthProvider>
  );
}
