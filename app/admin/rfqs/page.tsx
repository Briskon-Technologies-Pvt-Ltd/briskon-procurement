"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  ExternalLink,
  FileSpreadsheet,
  FileCheck,
  Rocket,
  Layers,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/* ---------- TYPES ---------- */
type RFQ = {
  id: string;
  title: string;
  status?: string;
  created_at: string;
  items_count?: number;
  invited_suppliers_count?: number;
  received_proposals?: number;
  visibility?: string;
};

export default function RFQDashboard() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [filteredRFQs, setFilteredRFQs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "converted_to_auction" | "awarded">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "title_asc" | "title_desc">("date_desc");

  /* Pagination */
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  /* Bulk Selection */
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const toggleSelect = (id: string) =>
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  /* Drawer Preview */
  const [previewRFQ, setPreviewRFQ] = useState<RFQ | null>(null);

  const mountedRef = useRef(true);
  const searchDebounceRef = useRef<number | null>(null);

  const COLORS = ["#60a5fa", "#34d399", "#facc15", "#f87171", "#a855f7"];

  /* Fetch RFQs */
  const loadRFQs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rfqs?t=" + Date.now());
      const json = await res.json();
      if (res.ok && json.success) {
        const sorted = (json.rfqs || []).slice().sort((a: RFQ, b: RFQ) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRfqs(sorted);
        setFilteredRFQs(sorted);
      } else throw new Error(json.error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Effects */
  useEffect(() => {
    loadRFQs();
  }, [loadRFQs]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      let data = rfqs;

      if (statusFilter !== "all") data = data.filter((r) => r.status === statusFilter);
      if (searchTerm.trim()) data = data.filter((r) => (r.title || "").toLowerCase().includes(searchTerm.toLowerCase()));

      // sorting
      data = data.sort((a, b) => {
        if (sortBy === "date_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === "title_asc") return (a.title || "").localeCompare(b.title || "");
        if (sortBy === "title_desc") return (b.title || "").localeCompare(a.title || "");
        return 0;
      });

      setFilteredRFQs(data);
    }, 250);
  }, [statusFilter, searchTerm, sortBy, rfqs]);

  /* Stats */
  const summary = useMemo(
    () => ({
      total: rfqs.length,
      draft: rfqs.filter((r) => r.status === "draft").length,
      published: rfqs.filter((r) => r.status === "published").length,
      converted: rfqs.filter((r) => r.status === "converted_to_auction").length,
      awarded: rfqs.filter((r) => r.status === "awarded").length,
    }),
    [rfqs]
  );

  const pieData = [
    { name: "Draft", value: summary.draft },
    { name: "Published", value: summary.published },
    { name: "Auction", value: summary.converted },
    { name: "Awarded", value: summary.awarded },
  ];

  /* Pagination Calculations */
  const paginatedRFQs = filteredRFQs.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  /* UI */
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileSpreadsheet className="text-blue-600" /> RFQ Dashboard
        </h1>

        <div className="flex gap-2">
          <button onClick={loadRFQs} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center gap-1">
            <RefreshCw size={16} /> Refresh
          </button>
          <Link href="/admin/rfqs/new" className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-1">
            <Plus size={16} /> Create
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-5 gap-4 mb-10">
        <SummaryCard label="Total RFQs" value={summary.total} icon={<FileSpreadsheet />} />
        <SummaryCard label="Draft" value={summary.draft} icon={<Layers />} />
        <SummaryCard label="Published" value={summary.published} icon={<FileCheck />} />
        <SummaryCard label="Auction" value={summary.converted} icon={<Rocket />} />
        <SummaryCard label="Awarded" value={summary.awarded} icon={<FileCheck />} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Status Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie dataKey="value" data={pieData} outerRadius={85} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={rfqs.map((x) => ({ month: new Date(x.created_at).toLocaleDateString("default", { month: "short" }), count: 1 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line dataKey="count" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white rounded-xl p-4 border shadow mb-6 flex flex-wrap gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border rounded-md px-3 py-2 text-sm">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="converted_to_auction">Auction</option>
            <option value="awarded">Awarded</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="border rounded-md px-3 py-2 text-sm">
            <option value="date_desc">Newest</option>
            <option value="date_asc">Oldest</option>
            <option value="title_asc">Title A→Z</option>
            <option value="title_desc">Title Z→A</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-1/3">
          <Search size={16} className="text-gray-400" />
          <input
            placeholder="Search RFQ"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-md w-full px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* BULK ACTIONS */}
      {selectedRows.length > 0 && (
        <div className="mb-3 flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <span className="text-sm text-blue-700">{selectedRows.length} selected</span>
          <div className="flex gap-3 text-sm">
            <button className="px-3 py-1 bg-blue-600 text-white rounded-md">Publish</button>
            <button className="px-3 py-1 bg-purple-600 text-white rounded-md">Award</button>
            <button className="px-3 py-1 bg-red-500 text-white rounded-md">Delete</button>
          </div>
        </div>
      )}

      {/* DATA GRID */}
      <div className="bg-white rounded border shadow-sm overflow-hidden">
        {filteredRFQs.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">No RFQs found</div>
        ) : (
          <div className="overflow-auto max-h-[540px]">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-50 sticky top-0 z-10">
                <tr>
                  {[
                    ["RFQ Title", "title"],
                    ["Status", "status"],
                    ["Items in RFQ", "items_count"],
                    ["Invited Suppliers", "invited_suppliers_count"],
                    ["Proposals Received", "received_proposals"],
                    ["Created Date/Time", "created_at"],
                  ].map(([label, key]) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:underline"
                      onClick={() =>
                        setSortBy(sortBy.includes("desc") ? "date_asc" : "date_desc")
                      }
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRFQs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[260px]">{r.title}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-center">{r.items_count ?? 0}</td>
                    <td className="px-4 py-3 text-center">{r.invited_suppliers_count ?? 0}</td>
                    <td
                      className={`px-4 py-3 text-center font-semibold ${
                        (r.received_proposals ?? 0) > 0 ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {r.received_proposals ?? 0}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
               
                      <Link
                        href={`/admin/rfqs/${r.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        View <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex justify-between items-center p-3 border-t">
          <div className="flex items-center gap-2 text-sm">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
              className="border rounded-md px-2 py-1"
            >
              {[10, 20, 50].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <button
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => p - 1)}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>

            <span>
              {pageIndex + 1} / {Math.ceil(filteredRFQs.length / pageSize)}
            </span>

            <button
              disabled={(pageIndex + 1) * pageSize >= filteredRFQs.length}
              onClick={() => setPageIndex((p) => p + 1)}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* DRAWER PREVIEW */}
      {previewRFQ && (
        <div className="fixed top-0 right-0 w-[420px] h-full bg-white border-l shadow-xl z-40 p-5 animate-slide-left">
          <h2 className="text-lg font-semibold mb-3">RFQ Preview</h2>
          <p className="text-xs text-gray-500 mb-2">Created: {new Date(previewRFQ.created_at).toLocaleString()}</p>
          <h3 className="font-bold text-xl mb-4">{previewRFQ.title}</h3>

          <div className="space-y-2 text-sm">
            <p>Status: <StatusPill status={previewRFQ.status} /></p>
            <p>Items: {previewRFQ.items_count ?? 0}</p>
            <p>Invited suppliers: {previewRFQ.invited_suppliers_count ?? 0}</p>
            <p>Received proposals: {previewRFQ.received_proposals ?? 0}</p>
          </div>

          <button className="mt-5 text-sm px-4 py-2 bg-gray-200 rounded-md" onClick={() => setPreviewRFQ(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- UI SUBCOMPONENTS ---------- */

const SummaryCard = ({ label, value, icon }: any) => (
  <div className="bg-white p-5 rounded-xl shadow border">
    <div className="flex justify-between items-center mb-1">
      <span className="text-gray-500 text-sm">{label}</span>
      <div className="text-gray-600">{icon}</div>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

const ChartCard = ({ title, children }: any) => (
  <div className="bg-white rounded-xl border shadow-sm p-4">
    <h2 className="text-sm font-semibold mb-3">{title}</h2>
    {children}
  </div>
);

const StatusPill = ({ status }: any) => (
  <span
    className={`px-3 py-1 rounded-full text-xs capitalize
    ${
      status === "draft"
        ? "bg-gray-200 text-gray-700"
        : status === "published"
        ? "bg-green-200 text-green-700"
        : status === "converted_to_auction"
        ? "bg-blue-200 text-blue-700"
        : status === "awarded"
        ? "bg-purple-200 text-purple-700"
        : "bg-gray-100 text-gray-600"
    }`}
  >
    {status}
  </span>
);

