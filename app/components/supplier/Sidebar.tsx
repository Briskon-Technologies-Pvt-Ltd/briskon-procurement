"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import {
  LogOut,
  Globe,
  ClipboardList,
  Rocket,
  Inbox,
  CheckCircle,
  Layers,
} from "lucide-react";
import { JSX } from "react";

type NavItem = {
  label: string;
  icon: JSX.Element;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <Layers size={18} />, href: "/supplier" },
  { label: "Opportunities", icon: <Globe size={18} />, href: "/supplier/opportunities" },
  { label: "My Proposals", icon: <ClipboardList size={18} />, href: "/supplier/proposals" },
  { label: "Auctions", icon: <Rocket size={18} />, href: "/supplier/auctions" },
  { label: "Messages", icon: <Inbox size={18} />, href: "/supplier/messages" },
  { label: "My Profile", icon: <CheckCircle size={18} />, href: "/supplier/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="w-56 bg-[#111827] border-r border-gray-800 flex flex-col">
      {/* LOGO */}
      <div className="flex items-center justify-center px-4 py-6 border-b border-gray-800">
        <Image
          src="/logo.svg"
          width={72}
          height={72}
          alt="Briskon"
          className="opacity-90"
        />
      </div>

      {/* NAVIGATION */}
      <nav className="flex flex-col px-4 py-4 text-sm gap-1 mb-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/supplier"
              ? pathname === "/supplier"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                isActive
                  ? "bg-indigo-600/30 border-l-4 border-indigo-500 text-white"
                  : "text-gray-300 hover:text-white hover:bg-indigo-900/20"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {/* LOGOUT BUTTON (right below menu items) */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-gray-300 hover:bg-red-600/10 hover:text-red-400 mt-2 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </nav>
    </aside>
  );
}
