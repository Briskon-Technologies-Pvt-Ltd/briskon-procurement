"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  PlusCircle,
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
  Legend,
  Bar,
  BarChart,
} from "recharts";

import { useRouter } from "next/navigation";

/* ---------- TYPES ---------- */
type RFQ = {
  id: string;
  title: string;
  status?: string;
  created_at: string;
  end_at: string;
  start_at?: string | null; // optional; falls back to created_at
  items_count?: number;
  invited_suppliers_count?: number;
  received_proposals?: number;
  visibility?: string;
};

type TimelineTab = "live" | "upcoming" | "closed";
type StatusTab = "all" | "draft" | "published" | "converted_to_auction" | "awarded";

export default function RFQDashboard() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [filteredRFQs, setFilteredRFQs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "title_asc" | "title_desc">(
    "date_desc"
  );

  // Primary (time-based) tabs
  const [activeTimeline, setActiveTimeline] = useState<TimelineTab>("live");
  // Secondary (status-based) tabs
  const [activeStatus, setActiveStatus] = useState<StatusTab>("all");

  /* Pagination */
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  /* Bulk Selection (kept as in original) */
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const toggleSelect = (id: string) =>
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  /* Drawer Preview (unchanged) */
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
        const sorted = (json.rfqs || [])
          .slice()
          .sort(
            (a: RFQ, b: RFQ) =>
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

  // Search + sort (status is now handled by tabs, not here)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      let data = rfqs.slice();

      if (searchTerm.trim()) {
        data = data.filter((r) =>
          (r.title || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // sorting
      data = data.sort((a, b) => {
        if (sortBy === "date_desc")
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        if (sortBy === "date_asc")
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        if (sortBy === "title_asc")
          return (a.title || "").localeCompare(b.title || "");
        if (sortBy === "title_desc")
          return (b.title || "").localeCompare(a.title || "");
        return 0;
      });

      setFilteredRFQs(data);
      setPageIndex(0);
    }, 250);
  }, [searchTerm, sortBy, rfqs]);

  /* Stats */
  const summary = {
    total: rfqs.length,
    draft: rfqs.filter((r) => r.status === "draft").length,
    published: rfqs.filter((r) => r.status === "published").length,
    converted: rfqs.filter((r) => r.status === "converted_to_auction").length,
    awarded: rfqs.filter((r) => r.status === "awarded").length,
  };

  const pieData = [
    { name: "Draft", value: summary.draft },
    { name: "Published", value: summary.published },
    { name: "Auction", value: summary.converted },
    { name: "Awarded", value: summary.awarded },
  ];

  /* Weekly Created Trend (same as your original) */
  const weeklyCreatedData = (() => {
    const grouped: Record<string, any> = {};

    rfqs.forEach((r: any) => {
      const date = new Date(r.created_at);
      const tempDate = new Date(date.valueOf());
      const dayNum = (tempDate.getUTCDay() + 6) % 7;
      tempDate.setUTCDate(tempDate.getUTCDate() - dayNum + 3);
      const firstThursday = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 4));

      const weekNo =
        1 +
        Math.round(
          ((tempDate.valueOf() - firstThursday.valueOf()) / 86400000 - 3) / 7
        );

      const key = `W${weekNo}`;

      if (!grouped[key]) grouped[key] = { week: key, created: 0 };
      grouped[key].created += 1;
    });

    return Object.values(grouped).slice(-8);
  })();

  const weeklyStatusData = (() => {
    const grouped: Record<string, any> = {};

    rfqs.forEach((r: any) => {
      const date = new Date(r.created_at);
      const tempDate = new Date(date.valueOf());
      const dayNum = (tempDate.getUTCDay() + 6) % 7;
      tempDate.setUTCDate(tempDate.getUTCDate() - dayNum + 3);
      const firstThursday = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 4));

      const weekNo =
        1 +
        Math.round(
          ((tempDate.valueOf() - firstThursday.valueOf()) / 86400000 - 3) / 7
        );

      const key = `W${weekNo}`;

      if (!grouped[key]) {
        grouped[key] = {
          week: key,
          draft: 0,
          published: 0,
          auction: 0,
          awarded: 0,
          rejected: 0,
        };
      }

      if (r.status) {
        const statusKey = r.status.toLowerCase();
        if (grouped[key][statusKey] !== undefined) {
          grouped[key][statusKey] += 1;
        }
      }
    });

    return Object.values(grouped).slice(-8);
  })();

  /* ---------- Time-based categorization: Live / Upcoming / Closed ---------- */
  const now = new Date();

  const liveRFQs = filteredRFQs.filter((r) => {
    const start = r.start_at ? new Date(r.start_at) : new Date(r.created_at);
    const end = r.end_at ? new Date(r.end_at) : null;
    if (!end) return false;
    return start <= now && end >= now;
  });

  const upcomingRFQs = filteredRFQs.filter((r) => {
    const start = r.start_at ? new Date(r.start_at) : new Date(r.created_at);
    return start > now;
  });

  const closedRFQs = filteredRFQs.filter((r) => {
    const end = r.end_at ? new Date(r.end_at) : null;
    if (!end) return false;
    return end < now;
  });

  const timelineRFQs: RFQ[] =
    activeTimeline === "live"
      ? liveRFQs
      : activeTimeline === "upcoming"
      ? upcomingRFQs
      : closedRFQs;

  /* Status counts inside current timeline group */
  const statusCounts = {
    all: timelineRFQs.length,
    draft: timelineRFQs.filter((r) => r.status === "draft").length,
    published: timelineRFQs.filter((r) => r.status === "published").length,
    converted_to_auction: timelineRFQs.filter(
      (r) => r.status === "converted_to_auction"
    ).length,
    awarded: timelineRFQs.filter((r) => r.status === "awarded").length,
  };

  /* Apply secondary status filter */
  const statusFilteredRFQs =
    activeStatus === "all"
      ? timelineRFQs
      : timelineRFQs.filter((r) => r.status === activeStatus);

  /* Pagination Calculations (per timeline+status view) */
  const paginatedRFQs = statusFilteredRFQs.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );
  const totalPages = Math.max(1, Math.ceil(statusFilteredRFQs.length / pageSize));

  /* UI */
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={() => router.push("/admin/rfqs/new")}
          className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer"
        >
          <PlusCircle size={18} /> Create RFQ
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-5 gap-4 mb-10 ">
        <SummaryCard label="Total RFQs" value={summary.total} icon={<FileSpreadsheet />} />
        <SummaryCard label="Draft" value={summary.draft} icon={<Layers />} />
        <SummaryCard label="Published" value={summary.published} icon={<FileCheck />} />
        <SummaryCard label="Auction" value={summary.converted} icon={<Rocket />} />
        <SummaryCard label="Awarded" value={summary.awarded} icon={<FileCheck />} />
      </div>

      {/* Charts (unchanged) */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ChartCard
          title={<span className="text-xl font-semibold text-[#012b73]">Status Distribution</span>}
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie dataKey="value" data={pieData} outerRadius={85} label>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: "10px", marginTop: "6px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={<span className="text-xl font-semibold text-[#012b73]">RFQs Created per Week</span>}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyCreatedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: "10px" }} />
              <Bar dataKey="created" fill="#2f6efb" name="RFQs Created" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

     
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-600">AUCTION DETAILS</h2>
        </div>
        <div className="w-full h-px bg-blue-200 mt-2"></div>
        
      {/* PRIMARY TABS: Timeline (Live / Upcoming / Closed) with counts */}
      <div className="flex gap-4 mb-2 border-b pb-2">
        {([
          { key: "live", label: "Live RFQs", count: liveRFQs.length },
          { key: "upcoming", label: "Upcoming RFQs", count: upcomingRFQs.length },
          { key: "closed", label: "Closed RFQs", count: closedRFQs.length },
        ] as const).map((tab) => {
          const isActive = activeTimeline === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTimeline(tab.key);
                setActiveStatus("all");
                setPageIndex(0);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition
                ${
                  isActive
                    ? "text-[#2f6efb] bg-blue-50 border border-b-white border-blue-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`inline-flex items-center justify-center text-xs min-w-[20px] px-2 py-0.5 rounded-full
                  ${
                    isActive
                      ? "bg-[#2f6efb] text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* SECONDARY TABS: Status (All, Draft, Published, Converted to Auction, Awarded) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { key: "all", label: "All", count: statusCounts.all },
          { key: "draft", label: "Draft", count: statusCounts.draft },
          { key: "published", label: "Published", count: statusCounts.published },
          {
            key: "converted_to_auction",
            label: "Converted to Auction",
            count: statusCounts.converted_to_auction,
          },
          { key: "awarded", label: "Awarded", count: statusCounts.awarded },
        ] as const).map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveStatus(tab.key);
                setPageIndex(0);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition
              ${
                isActive
                  ? "bg-[#2f6efb] text-white border-[#2f6efb]"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`inline-flex items-center justify-center text-[10px] min-w-[18px] px-1.5 py-0.5 rounded-full
                ${
                  isActive
                    ? "bg-white text-[#2f6efb]"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* DATA GRID */}
      <div className="bg-white rounded border border-blue-200 shadow-sm overflow-hidden">
        {statusFilteredRFQs.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">No RFQs found</div>
        ) : (
          <div
            className={`overflow-auto ${
              activeTimeline === "live"
                ? "max-h-[540px]"
                : activeTimeline === "upcoming"
                ? "max-h-[420px]"
                : "max-h-[360px]"
            }`}
          >
            <table className="min-w-full text-xs">
              <thead className="bg-blue-50 sticky top-0 z-10">
                <tr>
                  {[
                    ["RFQ Title", "title"],
                    ["Status", "status"],
                    ["Items in RFQ", "items_count"],
                    ["Invited Suppliers", "invited_suppliers_count"],
                    ["Proposals Received", "received_proposals"],
                    ["Created Date/Time", "created_at"],
                    ["End Date/Time", "end_at"],
                  ].map(([label, key]) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-gray-600 cursor-pointer hover:underline"
                      onClick={() =>
                        setSortBy(
                          sortBy === "date_desc" ? "date_asc" : "date_desc"
                        )
                      }
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-gray-600">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRFQs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[260px]">
                      {r.title}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.items_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.invited_suppliers_count ?? 0}
                    </td>
                    <td
                      className={`px-4 py-3 text-center font-semibold ${
                        (r.received_proposals ?? 0) > 0
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}
                    >
                      {r.received_proposals ?? 0}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(r.end_at).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/rfqs/${r.id}`}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
          <div className="flex items-center gap-2 text-xs">
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

          <div className="flex items-center gap-3 text-xs font-medium text-gray-700">
            <button
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-[#2f6efb] text-white hover:bg-[#1d4fcc] disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed cursor-pointer transition"
            >
              Prev
            </button>

            <span className="min-w-[40px] text-center">
              {statusFilteredRFQs.length === 0 ? 0 : pageIndex + 1} / {totalPages}
            </span>

            <button
              disabled={(pageIndex + 1) * pageSize >= statusFilteredRFQs.length}
              onClick={() => setPageIndex((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-[#2f6efb] text-white hover:bg-[#1d4fcc] disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed cursor-pointer transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* DRAWER PREVIEW (unchanged) */}
      {previewRFQ && (
        <div className="fixed top-0 right-0 w-[420px] h-full bg-white border-l shadow-xl z-40 p-5 animate-slide-left">
          <h2 className="text-lg font-semibold mb-3">RFQ Preview</h2>
          <p className="text-xs text-gray-500 mb-2">
            Created: {new Date(previewRFQ.created_at).toLocaleString()}
          </p>
          <h3 className="font-bold text-xl mb-4">{previewRFQ.title}</h3>

          <div className="space-y-2 text-sm">
            <p>
              Status: <StatusPill status={previewRFQ.status} />
            </p>
            <p>Items: {previewRFQ.items_count ?? 0}</p>
            <p>Invited suppliers: {previewRFQ.invited_suppliers_count ?? 0}</p>
            <p>Received proposals: {previewRFQ.received_proposals ?? 0}</p>
          </div>

          <button
            className="mt-5 text-sm px-4 py-2 bg-gray-200 rounded-md"
            onClick={() => setPreviewRFQ(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- UI SUBCOMPONENTS ---------- */

const SummaryCard = ({ label, value, icon }: any) => (
  <div className="bg-white p-5 rounded-xl shadow border border-blue-200">
    <div className="flex justify-between items-center mb-1">
      <span className="text-gray-500 text-sm">{label}</span>
      <div className="text-gray-600">{icon}</div>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

const ChartCard = ({ title, children }: any) => (
  <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
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
