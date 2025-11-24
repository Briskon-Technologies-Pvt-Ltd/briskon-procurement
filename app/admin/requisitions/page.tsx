"use client";

import React, { useState, useEffect, useMemo, useRef, ReactNode } from "react";
import "@/app/styles/admin.css";
import {
  PlusCircle,
  Search,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Filter,
  BarChart3,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
} from "recharts";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/auth/AuthProvider";

interface Requisition {
  id: string;
  description: string;
  status: string;
  estimated_value: number;
  currency: string;
  profiles?: { fname?: string; lname?: string };
  cost_centers?: { code?: string; name?: string };
}

export default function RequisitionsPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const didFetch = useRef(false);

  // ==========================================================
  // LOAD DATA ONCE
  // ==========================================================
  useEffect(() => {
    if (!loading && !didFetch.current) {
      didFetch.current = true;
      loadData();
    }
  }, [loading]);

  async function loadData() {
    try {
      const res = await fetch("/api/requisitions");
      const result = await res.json();
      if (result.success) setRequisitions(result.data || []);
    } catch (error) {
      console.error("Error loading requisitions:", error);
    }
  }

  // ==========================================================
  // STATS
  // ==========================================================
  const stats = useMemo(() => {
    return {
      total: requisitions.length,
      draft: requisitions.filter((r) => r.status?.toLowerCase() === "draft").length,
      pending: requisitions.filter((r) => r.status?.toLowerCase() === "pending").length,
      approved: requisitions.filter((r) => r.status?.toLowerCase() === "approved").length,
      rejected: requisitions.filter((r) => r.status?.toLowerCase() === "rejected").length,
    };
  }, [requisitions]);

  // ==========================================================
  // ACTION HANDLERS
  // ==========================================================
  async function handleApprove(id: string) {
    if (!confirm("Approve this requisition?")) return;
    await fetch("/api/requisitions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "approve", actor_id: profile?.id }),
    });
    loadData();
  }

  async function handleReject(id: string) {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    await fetch("/api/requisitions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "reject", actor_id: profile?.id, comments: reason }),
    });
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this requisition? This cannot be undone.")) return;
    await fetch(`/api/requisitions?id=${id}&actor_id=${profile?.id}`, { method: "DELETE" });
    loadData();
  }

  // ==========================================================
  // FILTER / SEARCH
  // ==========================================================
  const filteredData = useMemo(() => {
    let data = requisitions;
    if (filter !== "All") data = data.filter((r) => r.status?.toLowerCase() === filter.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.description?.toLowerCase().includes(q) ||
          r.cost_centers?.code?.toLowerCase().includes(q) ||
          r.cost_centers?.name?.toLowerCase().includes(q) ||
          r.profiles?.fname?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [requisitions, search, filter]);

  // ==========================================================
  // CHART DATA
  // ==========================================================
  const COLORS = ["#E0ECFF", "#82B1FF", "#2F6EFB", "#012B73"];
  const pieData = [
    { name: "Draft", value: stats.draft },
    { name: "Pending", value: stats.pending },
    { name: "Approved", value: stats.approved },
    { name: "Rejected", value: stats.rejected },
  ].filter((i) => i.value > 0);

  const barData = [
    { status: "Draft", value: requisitions.filter((r) => r.status?.toLowerCase() === "draft").reduce((s, r) => s + (r.estimated_value || 0), 0) },
    { status: "Pending", value: requisitions.filter((r) => r.status?.toLowerCase() === "pending").reduce((s, r) => s + (r.estimated_value || 0), 0) },
    { status: "Approved", value: requisitions.filter((r) => r.status?.toLowerCase() === "approved").reduce((s, r) => s + (r.estimated_value || 0), 0) },
    { status: "Rejected", value: requisitions.filter((r) => r.status?.toLowerCase() === "rejected").reduce((s, r) => s + (r.estimated_value || 0), 0) },
  ];

  // ==========================================================
  // RENDER UI
  // ==========================================================
  return (
    <div className="admin-content">

      {/* HEADER */}
          <div className="flex justify-end items-center mb-6">
             <button
              onClick={() => router.push("/admin/requisitions/new")}
                className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer"
              >
             <PlusCircle size={18} /> Create Requisition
            </button>
          </div>
      {/* KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Requisitions" value={stats.total} color="text-blue-600" />
        <KpiCard label="Draft" value={stats.draft} color="text-gray-600" />
        <KpiCard label="Pending" value={stats.pending} color="text-yellow-600" />
        <KpiCard label="Approved" value={stats.approved} color="text-green-600" />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white rounded-lg shadow-md border border-blue-200 p-4">
          <h3 className="font-semibold text-xl text-[#012b73] mb-3">Requisition Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-blue-200 p-4">
          <h3 className="font-semibold text-xl text-[#012b73] mb-3">Total Estimated Value by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="1 1" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2f6efb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLE HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-[#012b73]">Requisition List</h2>
        <div className="flex-1 h-[1px] bg-gray-200 ml-4" />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search requisitions..."
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64 focus:ring-1 focus:ring-[#2f6efb]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2 focus:ring-1 focus:ring-[#2f6efb]"
          >
            <option>All</option>
            <option>Draft</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow-md border border-blue-200 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-blue-50 text-gray-600 uppercase text-xs border-b">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Cost-0Center Code/ Name</th>
              <th className="p-3 text-left">Requested By</th>
              <th className="p-3 text-right">Estimated Value</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((r) => (
              <tr key={r.id} className="border-b hover:bg-[#f5f7fb] transition">
                <td className="p-3 font-medium text-[#012b73]">{r.id.slice(0, 8)}</td>
                <td className="p-3">{r.description}</td>
                <td className="p-3">[{r.cost_centers?.code}] {r.cost_centers?.name}</td>
                <td className="p-3">{r.profiles?.fname} {r.profiles?.lname}</td>
                <td className="p-3 text-right">{r.currency} {r.estimated_value?.toLocaleString()}</td>
                <td className="p-3 text-center"><StatusPill status={r.status} /></td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <IconButton title="View" onClick={() => router.push(`/admin/requisitions/${r.id}`)}>
                      <Eye size={16} />
                    </IconButton>
                    {r.status?.toLowerCase() === "pending" && (
                      <>
                        <IconButton title="Approve" color="text-green-600" onClick={() => handleApprove(r.id)}>
                          <CheckCircle size={16} />
                        </IconButton>
                        <IconButton title="Reject" color="text-red-600" onClick={() => handleReject(r.id)}>
                          <XCircle size={16} />
                        </IconButton>
                      </>
                    )}
                    {["draft", "pending"].includes(r.status?.toLowerCase()) && (
                      <IconButton title="Edit" color="text-blue-600" onClick={() => router.push(`/admin/requisitions/edit/${r.id}`)}>
                        <Edit size={16} />
                      </IconButton>
                    )}
                    {r.status?.toLowerCase() !== "approved" && (
                      <IconButton title="Delete" color="text-gray-500" onClick={() => handleDelete(r.id)}>
                        <Trash2 size={16} />
                      </IconButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!filteredData.length && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
                  No requisitions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================================
// REUSABLE COMPONENTS WITH PROPER TYPES
// ==========================================================
interface KpiCardProps {
  label: string;
  value: number;
  color?: string;
}

function KpiCard({ label, value, color = "text-gray-600" }: KpiCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-blue-200 flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </div>
      <BarChart3 size={20} className="opacity-70" />
    </div>
  );
}

interface StatusProps {
  status: string;
}

function StatusPill({ status }: StatusProps) {
  const statusLower = status?.toLowerCase();
  const colorMap: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorMap[statusLower] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

interface IconButtonProps {
  title: string;
  children: ReactNode;
  onClick: () => void;
  color?: string;
}

function IconButton({ title, onClick, children, color = "text-[#2f6efb]" }: IconButtonProps) {
  return (
    <button title={title} onClick={onClick} className={`cursor-pointer hover:scale-110 transition-transform ${color}`}>
      {children}
    </button>
  );
}
