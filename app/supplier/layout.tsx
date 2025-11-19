"use client";

import Sidebar from "../components/supplier/Sidebar";
import Header from "../components/supplier/Header";

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#0E1117] text-white">
      <Sidebar />
      <main className="flex-1 p-8">
        <Header />
        {children}
      </main>
    </div>
  );
}
