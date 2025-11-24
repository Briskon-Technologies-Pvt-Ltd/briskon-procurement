"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/admin.css";
import {
  PlusCircle,
  Search,
  Filter,
  Eye,
  FileText,
  Download,
  FileCheck,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

type PurchaseOrderRow = {
  id: string;
  po_number: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  currency: string;
  total_amount: number | null;
  status: string;
  created_at: string;
  // if you later add due_date to the view, you can extend here
};

const STATUS_COLOR_CHIP: Record<string, string> = {
  created: "bg-blue-100 text-blue-700",
  fulfilled: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  default: "bg-gray-100 text-gray-700",
};

const STATUS_COLOR_PIE: Record<string, string> = {
  created: "#2f6efb",
  fulfilled: "#0eb25c",
  cancelled: "#dc2626",
  default: "#9ca3af",
};

function normalizeStatus(status: string | null | undefined) {
  if (!status) return "unknown";
  return status.toLowerCase();
}

function formatStatusLabel(status: string) {
  const s = normalizeStatus(status);
  if (s === "created") return "Created";
  if (s === "fulfilled") return "Fulfilled";
  if (s === "cancelled") return "Cancelled";
  return status || "Unknown";
}

export default function PurchaseOrdersPage() {
  const router = useRouter();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<"All" | "created" | "fulfilled" | "cancelled">("All");
  const [search, setSearch] = useState("");

  // ============== LOAD POs FROM VIEW API ==============
  useEffect(() => {
    const loadPOs = async () => {
      try {
        setLoading(true);
        setError(null);

        // ⚠️ This expects /api/purchase-orders/view → purchase_orders_view
        const res = await fetch("/api/purchase-orders/view?t=" + Date.now());
        const json = await res.json();

        if (!res.ok || !json.success) {
          setError(json.error || "Failed to load purchase orders");
          setPurchaseOrders([]);
          return;
        }

        setPurchaseOrders(json.purchase_orders || []);
      } catch (err: any) {
        console.error("Error loading POs:", err);
        setError(err.message || "Failed to load purchase orders");
        setPurchaseOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadPOs();
  }, []);

  // ============== FILTERED DATA ==============
  const filteredData = useMemo(() => {
    let data = purchaseOrders;

    if (filter !== "All") {
      data = data.filter(
        (p) => normalizeStatus(p.status) === filter
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (p) =>
          p.po_number.toLowerCase().includes(q) ||
          (p.supplier_name || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [purchaseOrders, filter, search]);

  // ============== KPI CALCULATIONS ==============
  const {
    totalPOs,
    thisMonthPOs,
    fulfilledCount,
    cancelledCount,
  } = useMemo(() => {
    const total = purchaseOrders.length;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let thisMonth = 0;
    let fulfilled = 0;
    let cancelled = 0;

    purchaseOrders.forEach((po) => {
      const created = new Date(po.created_at);
      if (
        created.getFullYear() === year &&
        created.getMonth() === month
      ) {
        thisMonth += 1;
      }

      const s = normalizeStatus(po.status);
      if (s === "fulfilled") fulfilled += 1;
      if (s === "cancelled") cancelled += 1;
    });

    return {
      totalPOs: total,
      thisMonthPOs: thisMonth,
      fulfilledCount: fulfilled,
      cancelledCount: cancelled,
    };
  }, [purchaseOrders]);

  // ============== PIE DATA (POs BY STATUS) ==============
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    purchaseOrders.forEach((po) => {
      const key = normalizeStatus(po.status);
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({
      name: formatStatusLabel(status),
      rawStatus: status,
      value: count,
    }));
  }, [purchaseOrders]);

  // ============== SPEND TREND BY MONTH ==============
  const spendTrendData = useMemo(() => {
    const map = new Map<string, number>(); // "MMM YYYY" -> spend

    purchaseOrders.forEach((po) => {
      if (po.total_amount == null) return;
      const d = new Date(po.created_at);
      const label = d.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      const prev = map.get(label) || 0;
      map.set(label, prev + Number(po.total_amount));
    });

    // sort by date
    const result = Array.from(map.entries())
      .map(([month, spend]) => ({ month, spend }))
      .sort((a, b) => {
        const da = new Date(a.month).getTime();
        const db = new Date(b.month).getTime();
        return da - db;
      });

    return result;
  }, [purchaseOrders]);

  // ============== RECENT PO CARDS (LAST 3) ==============
  const recentPOs = useMemo(() => {
    return [...purchaseOrders]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 3);
  }, [purchaseOrders]);

  // ============== UI RENDER ==============
  if (loading) {
    return (
      <div className="admin-content">
        <p className="mt-8 text-center text-gray-500">Loading purchase orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-content">
        <p className="mt-8 text-center text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="admin-content">
  
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Total POs</div>
          <div className="text-2xl font-bold text-[#012b73]">
            {totalPOs}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">POs this month</div>
          <div className="text-xl font-bold text-green-600">
            {thisMonthPOs}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Fulfilled POs</div>
          <div className="text-xl font-bold text-emerald-600">
            {fulfilledCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Cancelled POs</div>
          <div className="text-xl font-bold text-red-600">
            {cancelledCount}
          </div>
        </div>
      </div>

      {/* FILTERS + TABLE + CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* LEFT: TABLE */}
        <div className="lg:col-span-3 bg-white rounded-lg p-4 shadow-md border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search POs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2f6efb]"
              />
            </div>

            <div className="flex items-center gap-2 mt-3 sm:mt-0">
              <Filter size={16} className="text-gray-500" />
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as "All" | "created" | "fulfilled" | "cancelled")
                }
                className="border border-gray-300 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#2f6efb]"
              >
                <option value="All">All</option>
                <option value="created">Created</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#f9fafc] text-gray-600 text-xs uppercase border-b">
                  <th className="p-3 text-left">PO Number</th>
                  <th className="p-3 text-left">Supplier</th>
                  <th className="p-3 text-right">Total Value</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Created On</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-4 text-center text-gray-500 text-sm"
                    >
                      No purchase orders match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((p) => {
                    const normStatus = normalizeStatus(p.status);
                    const chipClass =
                      STATUS_COLOR_CHIP[normStatus] || STATUS_COLOR_CHIP.default;

                    return (
                      <tr
                        key={p.id}
                        className="border-b hover:bg-[#f5f7fb] transition"
                      >
                        <td className="p-3 font-medium text-[#012b73]">
                          {p.po_number}
                        </td>
                        <td className="p-3">
                          {p.supplier_name || "-"}
                        </td>
                        <td className="p-3 text-right">
                          {p.currency}{" "}
                          {p.total_amount != null
                            ? Number(p.total_amount).toLocaleString()
                            : "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${chipClass}`}
                          >
                            {formatStatusLabel(p.status)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            {/* View */}
                            <button
                              className="text-[#2f6efb] hover:text-[#1952c3]"
                              onClick={() =>
                                router.push(`/admin/purchase-orders/${p.id}`)
                              }
                            >
                              <Eye size={16} />
                            </button>

                            {/* Download PDF */}
                            <button
                              className="text-green-600 hover:text-green-700"
                              onClick={() =>
                                window.open(
                                  `/api/purchase-orders/pdf?id=${p.id}`,
                                  "_blank"
                                )
                              }
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: CHARTS */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
          <h3 className="font-semibold text-[#012b73] mb-3">POs by Status</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-500">No data to display.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label
                >
                  {pieData.map((entry, index) => {
                    const norm = normalizeStatus(entry.rawStatus);
                    const color = STATUS_COLOR_PIE[norm] || STATUS_COLOR_PIE.default;
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}

          <hr className="my-4" />

          <h3 className="font-semibold text-[#012b73] mb-3">
            Monthly Spend Trend
          </h3>
          {spendTrendData.length === 0 ? (
            <p className="text-sm text-gray-500">No spend data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={spendTrendData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="spend"
                  stroke="#2f6efb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* RECENT PO CARDS */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 mb-8">
        <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <FileCheck size={18} className="text-[#2f6efb]" /> Recent Purchase
          Orders
        </h3>
        {recentPOs.length === 0 ? (
          <p className="text-sm text-gray-500">No recent POs.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentPOs.map((p) => {
              const normStatus = normalizeStatus(p.status);
              const badgeClass =
                normStatus === "fulfilled"
                  ? "bg-green-100 text-green-700"
                  : normStatus === "cancelled"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700";

              return (
                <div
                  key={p.id}
                  className="border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() =>
                    router.push(`/admin/purchase-orders/${p.id}`)
                  }
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-[#012b73]">
                      {p.po_number}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}
                    >
                      {formatStatusLabel(p.status)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    Supplier: {p.supplier_name || "-"}
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {p.currency}{" "}
                    {p.total_amount != null
                      ? Number(p.total_amount).toLocaleString()
                      : "-"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <FileText size={14} className="inline mr-1 text-[#2f6efb]" />
            Last updated: {new Date().toLocaleString()}
          </div>
          <div className="text-gray-500">
            Showing <b>{filteredData.length}</b> of{" "}
            <b>{purchaseOrders.length}</b> POs
          </div>
        </div>
      </div>
    </div>
  );
}
