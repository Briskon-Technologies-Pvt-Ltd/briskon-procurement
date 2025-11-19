"use client";

import React, { useState, useMemo } from "react";
import "@/app/styles/admin.css";
import {
  FileSignature,
  Search,
  Filter,
  Clock,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  AlertTriangle,
  TrendingDown,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ===================== MOCK DATA =====================
const contracts = [
  {
    contract_id: "CTR-4001",
    supplier: "Supplier A",
    po_number: "PO-5001",
    value: 11800,
    currency: "USD",
    start_date: "2025-01-15",
    end_date: "2026-01-14",
    status: "Active",
    days_left: 60,
  },
  {
    contract_id: "CTR-4002",
    supplier: "Global Safety Inc.",
    po_number: "PO-5002",
    value: 7600,
    currency: "USD",
    start_date: "2024-12-01",
    end_date: "2025-12-01",
    status: "Active",
    days_left: 20,
  },
  {
    contract_id: "CTR-4003",
    supplier: "OfficeTech Systems",
    po_number: "PO-5003",
    value: 10500,
    currency: "USD",
    start_date: "2024-07-10",
    end_date: "2025-07-09",
    status: "Expiring Soon",
    days_left: 8,
  },
  {
    contract_id: "CTR-4004",
    supplier: "ShieldPro Gear",
    po_number: "PO-5004",
    value: 8900,
    currency: "USD",
    start_date: "2023-11-15",
    end_date: "2024-11-14",
    status: "Expired",
    days_left: 0,
  },
  {
    contract_id: "CTR-4005",
    supplier: "SecureFit Supplies",
    po_number: "PO-5005",
    value: 9100,
    currency: "USD",
    start_date: "2024-02-01",
    end_date: "2025-02-01",
    status: "Active",
    days_left: 85,
  },
];

const COLORS = {
  Active: "#0eb25c",
  "Expiring Soon": "#f59e0b",
  Expired: "#dc2626",
};

const barData = [
  { month: "Aug", expiring: 2 },
  { month: "Sep", expiring: 3 },
  { month: "Oct", expiring: 1 },
  { month: "Nov", expiring: 4 },
  { month: "Dec", expiring: 2 },
];

// ===================== COMPONENT =====================
export default function ContractsPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    let data = contracts;
    if (filter !== "All") data = data.filter((c) => c.status === filter);
    if (search.trim())
      data = data.filter(
        (c) =>
          c.contract_id.toLowerCase().includes(search.toLowerCase()) ||
          c.supplier.toLowerCase().includes(search.toLowerCase()) ||
          c.po_number.toLowerCase().includes(search.toLowerCase())
      );
    return data;
  }, [filter, search]);

  const totalValue = contracts.reduce((sum, c) => sum + c.value, 0);
  const expiringSoon = contracts.filter((c) => c.status === "Expiring Soon");

  return (
    <div className="admin-content">
      {/* HERO STRIP */}
      <div className="bg-gradient-to-r from-[#2f6efb] to-[#1952c3] text-white rounded-xl p-6 shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
              <FileSignature size={22} /> Contracts Overview
            </h1>
            <p className="text-sm text-blue-100">
              Manage active, expiring, and expired supplier contracts efficiently.
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="text-right">
              <div className="text-xs text-blue-100 uppercase">Total Contracts</div>
              <div className="text-2xl font-bold">{contracts.length}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-100 uppercase">Total Contract Value</div>
              <div className="text-2xl font-bold">
                ${totalValue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS + SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search contracts..."
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
            <option value="Active">Active</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* STATUS SUMMARY BAR */}
      <div className="flex items-center mb-8">
        {["Active", "Expiring Soon", "Expired"].map((status) => {
          const count = contracts.filter((c) => c.status === status).length;
          return (
            <div
              key={status}
              className="flex-1 h-3 mx-1 rounded-full"
              style={{
                backgroundColor: COLORS[status],
                opacity: count ? 1 : 0.2,
              }}
              title={`${status}: ${count}`}
            ></div>
          );
        })}
      </div>

      {/* CONTRACTS TABLE */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 mb-8">
        <h3 className="font-semibold text-[#012b73] mb-3">
          Contracts List
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#f9fafc] text-gray-600 text-xs uppercase border-b">
                <th className="p-3 text-left">Contract ID</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">PO Number</th>
                <th className="p-3 text-right">Value</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">End Date</th>
                <th className="p-3 text-center">Days Left</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((c) => (
                <tr key={c.contract_id} className="border-b hover:bg-[#f5f7fb] transition">
                  <td className="p-3 font-medium text-[#012b73]">{c.contract_id}</td>
                  <td className="p-3">{c.supplier}</td>
                  <td className="p-3">{c.po_number}</td>
                  <td className="p-3 text-right">
                    {c.currency} {c.value.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : c.status === "Expiring Soon"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {new Date(c.end_date).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-center font-medium">
                    {c.days_left > 0 ? `${c.days_left} days` : "Expired"}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button className="text-[#2f6efb] hover:text-[#1952c3]">
                        <Eye size={16} />
                      </button>
                      <button className="text-green-600 hover:text-green-700">
                        <Download size={16} />
                      </button>
                      <button className="text-yellow-600 hover:text-yellow-700">
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPCOMING EXPIRIES SECTION */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 mb-8">
        <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className="text-[#f59e0b]" /> Contracts Expiring Soon
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {expiringSoon.map((c) => (
            <div
              key={c.contract_id}
              className="border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-[#012b73]">
                  {c.contract_id}
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  {c.days_left} days left
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-1">
                Supplier: {c.supplier}
              </div>
              <div className="text-sm font-medium text-gray-700">
                Ends: {new Date(c.end_date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHART SECTION */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 mb-8">
        <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <TrendingDown size={18} className="text-[#2f6efb]" /> Expiring Contracts Trend
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="expiring" fill="#2f6efb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* FOOTER */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <FileText size={14} className="inline mr-1 text-[#2f6efb]" />
            Contracts worth{" "}
            <b>
              $
              {contracts
                .filter((c) => c.status !== "Expired")
                .reduce((sum, c) => sum + c.value, 0)
                .toLocaleString()}
            </b>{" "}
            are active.
          </div>
          <div className="text-gray-500">
            {expiringSoon.length} contracts expiring in next 30 days
          </div>
        </div>
      </div>
    </div>
  );
}
