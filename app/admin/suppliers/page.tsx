"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/admin.css";
import {
  Users,
  Search,
  Filter,
  Building,
  Star,
  CheckCircle,
  Shield,
  BarChart3,
  Mail,
  Phone,
  Globe,
  FileText,
  PlusCircle,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function SuppliersPage() {
  const router = useRouter();

  // ===================== MOCK DATA =====================
  const suppliers = [
    {
      id: 1,
      name: "Global Safety Inc.",
      category: "Safety Equipment",
      email: "contact@globalsafety.com",
      phone: "+1 456 998 2345",
      website: "globalsafety.com",
      rating: 4.7,
      compliance: "Compliant",
      risk: "Low",
      ontime: 96,
      quality: 92,
      totalRFQs: 12,
      totalAwards: 5,
      activeContracts: 2,
    },
    {
      id: 2,
      name: "OfficeTech Systems",
      category: "IT Hardware",
      email: "info@officetech.io",
      phone: "+1 321 884 1122",
      website: "officetech.io",
      rating: 4.2,
      compliance: "Compliant",
      risk: "Medium",
      ontime: 89,
      quality: 85,
      totalRFQs: 18,
      totalAwards: 8,
      activeContracts: 4,
    },
    {
      id: 3,
      name: "ShieldPro Gear",
      category: "Protective Apparel",
      email: "support@shieldpro.com",
      phone: "+1 654 772 8889",
      website: "shieldpro.com",
      rating: 3.8,
      compliance: "Pending Docs",
      risk: "High",
      ontime: 75,
      quality: 80,
      totalRFQs: 10,
      totalAwards: 3,
      activeContracts: 1,
    },
    {
      id: 4,
      name: "SecureFit Supplies",
      category: "Packaging Materials",
      email: "sales@securefit.com",
      phone: "+1 420 665 4321",
      website: "securefit.com",
      rating: 4.5,
      compliance: "Compliant",
      risk: "Low",
      ontime: 94,
      quality: 90,
      totalRFQs: 14,
      totalAwards: 6,
      activeContracts: 3,
    },
  ];

  // ===================== PERFORMANCE DATA =====================
  const performanceData = [
    { name: "RFQs", value: 54 },
    { name: "Awards", value: 22 },
    { name: "Active Contracts", value: 10 },
  ];

  const complianceMetrics = [
    { subject: "KYC", A: 95 },
    { subject: "Certifications", A: 90 },
    { subject: "Financials", A: 85 },
    { subject: "Insurance", A: 88 },
    { subject: "ESG", A: 80 },
    { subject: "Health & Safety", A: 92 },
  ];

  // ===================== STATE =====================
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredSuppliers = useMemo(() => {
    let data = suppliers;
    if (filter !== "All") data = data.filter((s) => s.risk === filter);
    if (search.trim())
      data = data.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    return data;
  }, [filter, search]);

  const avgRating = (
    suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length
  ).toFixed(1);

  const totalAwards = suppliers.reduce((sum, s) => sum + s.totalAwards, 0);
  const totalContracts = suppliers.reduce(
    (sum, s) => sum + s.activeContracts,
    0
  );

  // ===================== UI =====================
  return (
    <div className="admin-content">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#012b73] mb-1 flex items-center gap-2">
            <Users size={22} /> Supplier Management
          </h1>
          <p className="text-sm text-gray-600">
            View, evaluate, and manage all approved and pending suppliers.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/suppliers/new")}
          className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg"
        >
          <PlusCircle size={18} /> Add Supplier
        </button>
      </div>

      {/* SUMMARY STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Total Suppliers</div>
          <div className="text-2xl font-bold text-[#012b73]">
            {suppliers.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Average Rating</div>
          <div className="text-2xl font-bold text-yellow-600">{avgRating}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Total Awards</div>
          <div className="text-2xl font-bold text-green-600">{totalAwards}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Active Contracts</div>
          <div className="text-2xl font-bold text-blue-600">
            {totalContracts}
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2f6efb]"
          />
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <Filter size={16} className="text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#2f6efb]"
          >
            <option value="All">All</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
          </select>
        </div>
      </div>

      {/* SUPPLIER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {filteredSuppliers.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-[#012b73] text-lg mb-1">
                  {s.name}
                </h3>
                <div className="text-xs text-gray-500">
                  <Building size={12} className="inline mr-1" />
                  {s.category}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < Math.round(s.rating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-2">
              <Mail size={12} className="inline mr-1" /> {s.email}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              <Phone size={12} className="inline mr-1" /> {s.phone}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              <Globe size={12} className="inline mr-1" /> {s.website}
            </div>

            <div className="flex justify-between text-xs mb-4">
              <span className="flex items-center gap-1">
                <CheckCircle
                  size={12}
                  className={
                    s.compliance === "Compliant"
                      ? "text-green-500"
                      : "text-yellow-500"
                  }
                />
                {s.compliance}
              </span>
              <span
                className={`px-2 py-1 rounded-full ${
                  s.risk === "Low"
                    ? "bg-green-100 text-green-700"
                    : s.risk === "Medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {s.risk} Risk
              </span>
            </div>

            <div className="flex justify-between text-sm text-gray-700 mb-3">
              <div>
                RFQs: <b>{s.totalRFQs}</b>
              </div>
              <div>
                Awards: <b>{s.totalAwards}</b>
              </div>
              <div>
                Active Contracts: <b>{s.activeContracts}</b>
              </div>
            </div>

            <div className="bg-gray-100 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${s.ontime}%` }}
                title="On-time delivery performance"
              ></div>
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              On-time delivery: {s.ontime}% | Quality: {s.quality}%
            </div>
          </div>
        ))}
      </div>

      {/* PERFORMANCE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
            <BarChart3 size={16} /> Supplier Engagement Overview
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={performanceData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2f6efb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
            <Shield size={16} /> Supplier Compliance Radar
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="80%"
              data={complianceMetrics}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Compliance"
                dataKey="A"
                stroke="#2f6efb"
                fill="#2f6efb"
                fillOpacity={0.5}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <FileText size={14} className="inline mr-1 text-[#2f6efb]" />
            Showing <b>{filteredSuppliers.length}</b> of{" "}
            <b>{suppliers.length}</b> suppliers
          </div>
          <div className="text-gray-500">
            Average performance rating: <b>{avgRating}</b>/5
          </div>
        </div>
      </div>
    </div>
  );
}
