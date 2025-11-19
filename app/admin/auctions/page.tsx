"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Rocket,
  CheckCircle,
  Clock,
  XCircle,
  FileSpreadsheet,
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

/* ============================================================
   Helpers
============================================================ */
function deriveStatus(a: any) {
  const now = Date.now();
  const start = a.start_at ? new Date(a.start_at).getTime() : NaN;
  const end = a.end_at ? new Date(a.end_at).getTime() : NaN;

  if (a.status === "draft") return "draft";
  if (a.status === "archived") return "archived";

  if (a.status === "published" && !isNaN(start) && !isNaN(end)) {
    if (start > now) return "scheduled";
    if (now >= start && now <= end) return "running";
    if (now > end) return "completed";
  }

  return "unknown";
}

function getAuctionTitle(a: any): string {
  return a?.title || a?.config?.title || "";
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

/* ============================================================
   Main Component
============================================================ */
export default function AuctionDashboard() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [rfqLoading, setRfqLoading] = useState(false);

  /* ---------------------------------------------------------
     Load Auctions
  --------------------------------------------------------- */
  const loadAuctions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auctions?t=" + Date.now());
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load auctions");

      setAuctions(json.auctions || []);
      setFiltered(json.auctions || []);
    } catch (e) {
      console.error("Auction load error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, []);

  /* ---------------------------------------------------------
     Load RFQs for Modal
  --------------------------------------------------------- */
  const loadRFQs = async () => {
    try {
      setRfqLoading(true);
      const res = await fetch("/api/rfqs?status=draft");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setRfqs(json.rfqs || []);
    } catch (err: any) {
      console.error("RFQ load error:", err.message);
    } finally {
      setRfqLoading(false);
    }
  };

  /* ---------------------------------------------------------
     Filtering Auctions
  --------------------------------------------------------- */
  useEffect(() => {
    let data = [...auctions];

    if (statusFilter !== "all") {
      data = data.filter((a) => deriveStatus(a) === statusFilter);
    }
    if (typeFilter !== "all") {
      data = data.filter((a) => a.auction_type === typeFilter);
    }
    if (search.trim()) {
      let q = search.toLowerCase();
      data = data.filter((a) => getAuctionTitle(a).toLowerCase().includes(q));
    }

    setFiltered(data);
  }, [statusFilter, typeFilter, search, auctions]);

  /* ---------------------------------------------------------
     Summary Tiles
  --------------------------------------------------------- */
  const summary = useMemo(
    () => ({
      total: auctions.length,
      drafts: auctions.filter((a) => deriveStatus(a) === "draft").length,
      upcoming: auctions.filter((a) => deriveStatus(a) === "scheduled").length,
      live: auctions.filter((a) => deriveStatus(a) === "running").length,
      completed: auctions.filter((a) => deriveStatus(a) === "completed").length,
      archived: auctions.filter((a) => deriveStatus(a) === "archived").length,
    }),
    [auctions]
  );

  const pieData = [
    { name: "Upcoming", value: summary.upcoming },
    { name: "Live", value: summary.live },
    { name: "Completed", value: summary.completed },
    { name: "Archived", value: summary.archived },
  ];

  const trendData = useMemo(() => {
    const grouped: Record<string, number> = {};
    auctions.forEach((a) => {
      const m = new Date(a.created_at).toLocaleString("default", { month: "short" });
      grouped[m] = (grouped[m] || 0) + 1;
    });
    return Object.entries(grouped).map(([month, count]) => ({ month, count }));
  }, [auctions]);

  /* ============================================================
     UI
  ============================================================ */
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Auctions Dashboard
        </h1>

        <div className="flex gap-3">
          <button
            onClick={loadAuctions}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
          >
            <RefreshCw size={16} /> Refresh
          </button>

          <button
            onClick={() => {
              loadRFQs();
              setShowModal(true);
            }}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <Plus size={16} /> Create Auction
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 mb-8">
        <SummaryCard label="Total" value={summary.total} icon={<FileSpreadsheet />} />
        <SummaryCard label="Draft" value={summary.drafts} icon={<Clock className="text-yellow-500" />} />
        <SummaryCard label="Upcoming" value={summary.upcoming} icon={<Clock />} />
        <SummaryCard label="Live" value={summary.live} icon={<Rocket className="text-green-600" />} />
        <SummaryCard label="Completed" value={summary.completed} icon={<CheckCircle className="text-blue-600" />} />
        <SummaryCard label="Archived" value={summary.archived} icon={<XCircle className="text-red-600" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Auctions by Status</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" outerRadius={80} label>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Auction Creation Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Upcoming</option>
            <option value="running">Live</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="standard_reverse">Standard</option>
            <option value="ranked_reverse">Ranked</option>
            <option value="sealed_bid">Sealed</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-1/3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search auctions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Auction Cards */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading auctions...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500 text-sm">No auctions found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}

      {/* ======================================================
          RFQ SELECTION MODAL
      ====================================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Select RFQ to Convert to Auction</h2>

            {rfqLoading ? (
              <p className="text-gray-600 text-sm">Loading RFQs...</p>
            ) : rfqs.length === 0 ? (
              <p className="text-gray-500 text-sm">No draft RFQs found.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y">
                {rfqs.map((r) => (
                  <div key={r.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-800">{r.title}</p>
                      <p className="text-xs text-gray-500">
                        {r.items_count} items · {r.invited_suppliers_count} suppliers
                      </p>
                    </div>

                    <button
                      onClick={() => (window.location.href = `/admin/auctions/new?from_rfq=${r.id}`)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Create Auction
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Child Components
============================================================ */
const SummaryCard = ({ label, value, icon }: any) => (
  <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-500 text-sm">{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-bold text-gray-800">{value}</div>
  </div>
);

/* Auction Card */
const AuctionCard = ({ auction }: any) => {
  const status = deriveStatus(auction);

  const statusBg =
    status === "draft"
      ? "bg-yellow-50 border-yellow-200"
      : status === "scheduled"
      ? "bg-gray-50 border-gray-200"
      : status === "running"
      ? "bg-green-50 border-green-200"
      : status === "completed"
      ? "bg-blue-50 border-blue-200"
      : status === "archived"
      ? "bg-red-50 border-red-200"
      : "bg-gray-50 border-gray-200";

  const typeLabel =
    auction.auction_type === "standard_reverse"
      ? "Standard"
      : auction.auction_type === "ranked_reverse"
      ? "Ranked"
      : "Sealed";

  const title = getAuctionTitle(auction) || "Untitled auction";

  return (
    <Link href={`/admin/auctions/${auction.id}`}>
      <div
        className={`rounded-xl shadow-sm border hover:shadow-md hover:border-blue-400 transition cursor-pointer p-5 relative ${statusBg}`}
      >
        <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-1 bg-white border rounded-full shadow-sm">
          {typeLabel}
        </span>

        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>

        <p className="text-xs text-gray-600 mb-4">
          {auction.start_at ? new Date(auction.start_at).toLocaleString() : "No start date"} →{" "}
          {auction.end_at ? new Date(auction.end_at).toLocaleString() : "No end date"}
        </p>

        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === "running"
              ? "bg-green-600 text-white"
              : status === "scheduled"
              ? "bg-gray-600 text-white"
              : status === "completed"
              ? "bg-blue-600 text-white"
              : status === "draft"
              ? "bg-yellow-600 text-white"
              : status === "archived"
              ? "bg-red-600 text-white"
              : "bg-gray-400 text-white"
          }`}
        >
          {status}
        </span>
      </div>
    </Link>
  );
};
