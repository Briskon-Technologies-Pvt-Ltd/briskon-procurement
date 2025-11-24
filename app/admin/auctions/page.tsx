"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Rocket,
  Clock,
  Users,
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
   HELPERS
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

const COLORS = ["#E0ECFF", "#82B1FF", "#2F6EFB", "#012B73"];

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function AuctionDashboard() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Create Auction (RFQ selection) modal
  const [showModal, setShowModal] = useState(false);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [rfqLoading, setRfqLoading] = useState(false);

  // Bid leaderboard modal
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [bidLoading, setBidLoading] = useState(false);

  /* ---------------------------------------------------------
     LOAD AUCTIONS
  --------------------------------------------------------- */
  const loadAuctions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auctions?t=" + Date.now());
      const json = await res.json();
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
     LOAD RFQS (for Create Auction modal) - only DRAFT
  --------------------------------------------------------- */
  const loadRFQs = async () => {
    try {
      setRfqLoading(true);
      const res = await fetch("/api/rfqs?t=" + Date.now());
      const json = await res.json();

      if (json.success) {
        const rows: any[] = json.rfqs || json.data || [];
        const drafts = rows.filter((r: any) => r.status === "draft");
        setRfqs(drafts);
      }
    } catch (err) {
      console.error("RFQ load error", err);
    } finally {
      setRfqLoading(false);
    }
  };

  /* ---------------------------------------------------------
     LOAD LEADERBOARD (SUPPLIER TOTALS)
  --------------------------------------------------------- */
  const loadLeaderboard = async (auctionId: string) => {
    try {
      setBidLoading(true);

      const res = await fetch(`/api/bids/leaderboard?auction_id=${auctionId}`);
      const json = await res.json();

      if (json.success) {
        setLeaderboard(
          (json.leaderboard || []).map((t: any, idx: number) => ({
            rank: idx + 1,
            supplier_id: t.supplier_id,
            supplier_name: t.supplier_name,
            total: t.total,
            expanded: false,
            items: [] as any[],
          }))
        );
        setShowBidsModal(true);
        setSelectedAuction((prev: any) =>
          prev && prev.id === auctionId ? prev : auctions.find((a: any) => a.id === auctionId)
        );
      }
    } catch (err: any) {
      console.error("Leaderboard load error", err.message);
    } finally {
      setBidLoading(false);
    }
  };

  /* ---------------------------------------------------------
     LOAD ITEM-LEVEL DETAILS FOR A SUPPLIER IN AN AUCTION
     Uses /api/bids/items?auction_id=...&supplier_id=...
  --------------------------------------------------------- */
  const loadItemDetails = async (auctionId: string, supplierId: string) => {
    try {
      const res = await fetch(
        `/api/bids/items?auction_id=${auctionId}&supplier_id=${supplierId}`
      );
      const json = await res.json();

      if (json.success) {
        setLeaderboard((prev) =>
          prev.map((l: any) =>
            l.supplier_id === supplierId ? { ...l, items: json.items || [] } : l
          )
        );
      }
    } catch (err) {
      console.error("Error loading line items:", err);
    }
  };

  /* ---------------------------------------------------------
     FILTERED LIST
  --------------------------------------------------------- */
  useEffect(() => {
    let data = [...auctions];
    if (statusFilter !== "all") data = data.filter((a) => deriveStatus(a) === statusFilter);
    if (typeFilter !== "all") data = data.filter((a) => a.auction_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((a) => getAuctionTitle(a).toLowerCase().includes(q));
    }
    setFiltered(data);
  }, [statusFilter, typeFilter, search, auctions]);

  /* ---------------------------------------------------------
     SUMMARY / KPI DATA
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
     RENDER
  ============================================================ */
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER BUTTON */}
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={() => {
            loadRFQs();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#2f6efb] text-white rounded-lg hover:bg-[#1d4fcc] text-sm cursor-pointer transition"
        >
          <Plus size={16} /> Create Auction
        </button>
      </div>

      {/* SUMMARY KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 mb-8">
        <SummaryCard label="Total" value={summary.total} icon={<FileSpreadsheet />} />
        <SummaryCard
          label="Draft"
          value={summary.drafts}
          icon={<Clock className="text-yellow-500" />}
        />
        <SummaryCard label="Upcoming" value={summary.upcoming} icon={<Clock />} />
        <SummaryCard
          label="Live"
          value={summary.live}
          icon={<Rocket className="text-green-600" />}
        />
        <SummaryCard
          label="Completed"
          value={summary.completed}
          icon={<CheckCircle className="text-blue-600" />}
        />
        <SummaryCard
          label="Archived"
          value={summary.archived}
          icon={<XCircle className="text-red-600" />}
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-blue-200 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-600 mb-3">Auctions by Status</h2>
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

        <div className="bg-white border border-blue-200 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-600 mb-3">Auction Creation Trend</h2>
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

      <div className="mb-6">
  <div className="flex items-center">
    <h2 className="text-lg font-semibold text-gray-600">AUCTION DETAILS</h2>
  </div>
  <div className="w-full h-px bg-blue-200 mt-2"></div>
</div>

      {/* FILTERS */}
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

      {/* AUCTION CARDS */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading auctions...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500 text-sm">No auctions found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <AuctionCard
              key={a.id}
              auction={a}
              onShowBids={() => {
                loadLeaderboard(a.id);
                setSelectedAuction(a);
              }}
            />
          ))}
        </div>
      )}

      {/* ======================= CREATE AUCTION (RFQ SELECT MODAL) ======================= */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Select RFQ to Convert into Auction</h2>
              <button
                className="text-gray-500 hover:text-red-600 text-xl font-bold"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {rfqLoading ? (
              <p className="text-sm text-gray-600">Loading RFQs...</p>
            ) : rfqs.length === 0 ? (
              <p className="text-sm text-gray-600">No draft RFQs available to convert.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="p-2 text-left">Title</th>
                    <th className="p-2 text-center">Items</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqs.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{r.title}</td>
                      <td className="p-2 text-center">{r.items_count ?? 0}</td>
                      <td className="p-2 text-center">
                        <button
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          onClick={() =>
                            (window.location.href = `/admin/auctions/new?from_rfq=${r.id}`)
                          }
                        >
                          Convert
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================= BID LEADERBOARD MODAL ======================= */}
      {showBidsModal && selectedAuction && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4"
          onClick={() => setShowBidsModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 ">
              <h2 className="text-xl font-semibold">
                Supplier Leaderboard: {getAuctionTitle(selectedAuction)}
              </h2>

              <button
                className="text-gray-500 hover:text-red-600 text-xl font-bold"
                onClick={() => setShowBidsModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Table */}
            {bidLoading ? (
              <p className="text-sm text-gray-600">Loading...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-gray-600">No bids submitted yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-blue-500 text-white text-sm uppercase">
                  <tr>
                    <th className="p-2 text-left">Rank</th>
                    <th className="p-2 text-left">Supplier</th>
                    <th className="p-2 text-right">Total Bid</th>
                    <th className="p-2 text-center">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((l: any, index: number) => {
                    const key = `${selectedAuction.id}_${l.supplier_id}_${index}`;

                    return (
                      <React.Fragment key={key}>
                        <tr className="border-b">
                          <td className="p-2 text-xl font-semibold ">{l.rank}</td>
                          <td className="p-2 font-semibold">{l.supplier_name || "N/A"}</td>
                          <td className="p-2 text-right font-semibold text-blue-600">
                            {l.total?.toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              onClick={() => {
                                if (!l.items || l.items.length === 0) {
                                  loadItemDetails(selectedAuction.id, l.supplier_id);
                                }

                                setLeaderboard((prev) =>
                                  prev.map((x: any, i: number) =>
                                    i === index ? { ...x, expanded: !x.expanded } : x
                                  )
                                );
                              }}
                            >
                              {l.expanded ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>

                        {l.expanded && (l.items || []).length > 0 && (
                          <tr className="bg-gray-200 border-b">
                            <td colSpan={4} className="p-3">
                              <table className="w-full text-xs">
                                <thead className="bg-blue-200 text-gray-700">
                                  <tr>
                                    <th className="p-2 text-left">Item</th>
                                    <th className="p-2 text-center">Qty</th>
                                    <th className="p-2 text-center">Unit Price</th>
                                    <th className="p-2 text-center">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(l.items || []).map((i: any, idx: number) => (
                                    <tr key={`${key}_${idx}`} className="border-b">
                                      <td className="p-2">{i.item_name}</td>
                                      <td className="p-2 text-center">{i.qty}</td>
                                      <td className="p-2 text-center">
                                        {i.unit_price?.toLocaleString()}
                                      </td>
                                      <td className="p-2 text-center font-semibold">
                                        {i.total?.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Footer */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowBidsModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm cursor-pointer"
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
   CHILD COMPONENTS
============================================================ */
const SummaryCard = ({ label, value, icon }: any) => (
  <div className="bg-white rounded-xl shadow p-5 border border-blue-200 hover:border-blue-500">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-500 text-sm">{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-bold text-gray-800">{value}</div>
  </div>
);

const AuctionCard = ({ auction, onShowBids }: any) => {
  const [bidCount, setBidCount] = useState(0);
  const status = deriveStatus(auction);

  useEffect(() => {
    if (status === "running" || status === "completed") {
      fetch(`/api/bids?auction_id=${auction.id}&count_only=1`)
        .then((r) => r.json())
        .then((res) => res.success && setBidCount(res.count))
        .catch(() => {});
    }
  }, [auction.id, status]);

  const statusColorMap: any = {
    running: "bg-green-500 text-white",
    scheduled: "bg-blue-500 text-white",
    completed: "bg-gray-500 text-white",
    draft: "bg-yellow-500 text-white",
    archived: "bg-red-500 text-white",
    unknown: "bg-gray-500 text-white",
  };

  const typeMap: any = {
    standard_reverse: "bg-blue-600 text-white",
    ranked_reverse: "bg-purple-600 text-white",
    sealed_bid: "bg-gray-700 text-white",
  };

  const typeLabel =
    auction.auction_type === "standard_reverse"
      ? "Standard Reverse"
      : auction.auction_type === "ranked_reverse"
      ? "Ranked Reverse"
      : "Sealed Reverse";

  return (
    <div
      className="rounded shadow-sm border border-blue-200 hover:shadow-md hover:border-blue-500 transition p-5 relative cursor-pointer bg-white"
      onClick={() => (window.location.href = `/admin/auctions/${auction.id}`)}
    >
      {/* STATUS pill - top left */}
     <i>  <span
        className={`absolute top-3 left-3 text-[11px] px-2 py-1 rounded-full shadow-sm ${
          statusColorMap[status] || statusColorMap.unknown
        }`}
      >
        {status}
      </span> </i>

      {/* TYPE pill - top right */}
      <span
        className={`absolute top-3 right-3 text-[11px] px-2 py-1 rounded-full shadow-sm ${
          typeMap[auction.auction_type] || "bg-blue-600 text-white"
        }`}
      >
        {typeLabel}
      </span>

      {/* CONTENT */}
      <h3 className="text-lg font-semibold text-gray-900 mt-7 mb-1">
        {getAuctionTitle(auction)}
      </h3>

      <p className="text-xs text-gray-600 mb-6">
        <b>Duration:</b>{" "}
        {auction.start_at ? new Date(auction.start_at).toLocaleString() : "No start date"} →{" "}
        {auction.end_at ? new Date(auction.end_at).toLocaleString() : "No end date"}
      </p>
        &nbsp;
      {/* SUPPLIER COUNT PILL - bottom right with icon */}
      {(status === "running" || status === "completed") && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowBids();
          }}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-3 py-[6px] rounded-full bg-blue-50 text-blue-700 text-[11px] hover:bg-blue-100 cursor-pointer"
        >
          <Users size={14} />
          <span>
            <u>TOTAL SUPPLIER BIDS : {bidCount}</u>
          </span>
        </button>
      )}
    </div>
  );
};
