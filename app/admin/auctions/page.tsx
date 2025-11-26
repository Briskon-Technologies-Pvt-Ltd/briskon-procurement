"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  Fragment,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Rocket,
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
   HELPERS
============================================================ */
function deriveStatus(a: any) {
  const now = Date.now();
  const start = a.start_at ? new Date(a.start_at).getTime() : NaN;
  const end = a.end_at ? new Date(a.end_at).getTime() : NaN;

  if (a.status === "draft") return "draft";
  if (a.status === "archived") return "archived";
  // Treat awarded as completed/closed in UI
  if (a.status === "awarded") return "completed";

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
export default function AuctionsPage() {
  const router = useRouter();

  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const liveRef = useRef<HTMLDivElement | null>(null);
  const upcomingRef = useRef<HTMLDivElement | null>(null);
  const closedRef = useRef<HTMLDivElement | null>(null);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auctions?t=" + Date.now());
      const json = await res.json();
      setAuctions(json.auctions || []);
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
     FILTERED LIST
  --------------------------------------------------------- */
  const filteredAuctions = useMemo(() => {
    let data = [...auctions];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((a) => getAuctionTitle(a).toLowerCase().includes(q));
    }
    return data;
  }, [auctions, search]);

  const liveAuctions = filteredAuctions.filter(
    (a) => deriveStatus(a) === "running"
  );
  const upcomingAuctions = filteredAuctions.filter(
    (a) => deriveStatus(a) === "scheduled"
  );
  const closedAuctions = filteredAuctions.filter(
    (a) => deriveStatus(a) === "completed"
  );

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
      if (!a.created_at) return;
      const m = new Date(a.created_at).toLocaleString("default", {
        month: "short",
      });
      grouped[m] = (grouped[m] || 0) + 1;
    });
    return Object.entries(grouped).map(([month, count]) => ({ month, count }));
  }, [auctions]);

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-8">
      {/* HEADER + CREATE BUTTON */}
      <div className="flex justify-end items-center mb-4">
        <button
          onClick={() => router.push("/admin/auctions/new")}
          className="flex items-center gap-2 px-4 py-2 bg-[#2f6efb] text-white rounded-lg hover:bg-[#1d4fcc] text-sm cursor-pointer transition"
        >
          <FileSpreadsheet size={16} />
          Create Auction
        </button>
      </div>

      {/* SUMMARY KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 mb-4">
        <SummaryCard label="Total" value={summary.total} icon={<FileSpreadsheet />} />
        <SummaryCard
          label="Draft"
          value={summary.drafts}
          icon={<Clock className="text-yellow-500" />}
        />
        <SummaryCard
          label="Upcoming"
          value={summary.upcoming}
          icon={<Clock />}
          onClick={() =>
            upcomingRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        />
        <SummaryCard
          label="Live"
          value={summary.live}
          icon={<Rocket className="text-green-600" />}
          onClick={() =>
            liveRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        />
        <SummaryCard
          label="Completed"
          value={summary.completed}
          icon={<CheckCircle className="text-blue-600" />}
          onClick={() =>
            closedRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        />
        <SummaryCard
          label="Archived"
          value={summary.archived}
          icon={<XCircle className="text-red-600" />}
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-blue-200 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-600 mb-3">
            Auctions by status
          </h2>
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
          <h2 className="text-lg font-semibold text-gray-600 mb-3">
            Auction creation trend
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter size={16} className="text-gray-400" />
          <span>Search across all auctions</span>
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

      {loading && (
        <div className="text-gray-500 text-sm mb-2">Loading auctions...</div>
      )}

      {/* LIVE AUCTIONS SECTION */}
      <SectionHeader title="LIVE AUCTIONS" refObj={liveRef} />
      <AuctionTable data={liveAuctions} type="live" />

      {/* UPCOMING AUCTIONS SECTION */}
      <SectionHeader title="UPCOMING AUCTIONS" refObj={upcomingRef} />
      <AuctionTable data={upcomingAuctions} type="upcoming" />

      {/* CLOSED / COMPLETED AUCTIONS SECTION */}
      <SectionHeader title="CLOSED / COMPLETED AUCTIONS" refObj={closedRef} />
      <AuctionTable
        data={closedAuctions}
        type="closed"
        onAward={(id: string, alreadyAwarded: boolean) => {
          if (alreadyAwarded) return;
          // go to award creation screen
          router.push(`/admin/awards/new?auction_id=${id}`);
        }}
      />
    </div>
  );
}

/* ============================================================
   CHILD COMPONENTS
============================================================ */

const SummaryCard = ({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl shadow p-5 border border-blue-200 ${
      onClick ? "hover:border-blue-500 cursor-pointer" : ""
    }`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-500 text-sm">{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-bold text-gray-800">{value}</div>
  </div>
);

const SectionHeader = ({
  title,
  refObj,
}: {
  title: string;
  refObj: React.RefObject<HTMLDivElement | null>;
}) => (
  <div ref={refObj as any} className="mb-3 mt-10">
    <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
    <div className="w-full h-px bg-blue-200 mt-2"></div>
  </div>
);

const BidCountCell = ({
  auctionId,
  shouldLoad,
}: {
  auctionId: string;
  shouldLoad: boolean;
}) => {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shouldLoad) return;

    let cancelled = false;

    const loadCount = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/bids?auction_id=${auctionId}&count_only=1`
        );
        const json = await res.json();
        if (!cancelled && json.success) {
          setCount(json.count ?? 0);
        }
      } catch (err) {
        console.error("Bid count error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCount();
    return () => {
      cancelled = true;
    };
  }, [auctionId, shouldLoad]);

  if (!shouldLoad) {
    return <span>-</span>;
  }

  if (loading && count === null) {
    return <span className="text-xs text-gray-400">...</span>;
  }

  return <span>{count ?? 0}</span>;
};

const AuctionTable = ({
  data,
  type,
  onAward,
}: {
  data: any[];
  type: "live" | "upcoming" | "closed";
  onAward?: (id: string, alreadyAwarded: boolean) => void;
}) => {
  // Leaderboard state only needed for LIVE
  const [leaderboards, setLeaderboards] = useState<
    Record<
      string,
      {
        open: boolean;
        rows: {
          rank: number;
          supplier_id: string;
          supplier_name: string;
          total: number;
          expanded?: boolean;
          items?: any[];
        }[];
      }
    >
  >({});

  const handleToggleLeaderboard = async (auctionId: string) => {
    const existing = leaderboards[auctionId];
    if (existing) {
      // just toggle open/close
      setLeaderboards((prev) => ({
        ...prev,
        [auctionId]: { ...existing, open: !existing.open },
      }));
      return;
    }

    try {
      const res = await fetch(`/api/bids/leaderboard?auction_id=${auctionId}`);
      const json = await res.json();

      if (json.success) {
        const rows = (json.leaderboard || []).map((t: any, idx: number) => ({
          rank: idx + 1,
          supplier_id: t.supplier_id,
          supplier_name: t.supplier_name,
          total: t.total,
          expanded: false,
          items: [],
        }));

        setLeaderboards((prev) => ({
          ...prev,
          [auctionId]: { open: true, rows },
        }));
      }
    } catch (err: any) {
      console.error("Leaderboard load error:", err.message);
    }
  };

  const handleLoadItems = async (auctionId: string, supplierId: string) => {
    try {
      const res = await fetch(
        `/api/bids/items?auction_id=${auctionId}&supplier_id=${supplierId}`
      );
      const json = await res.json();

      if (json.success) {
        setLeaderboards((prev) => {
          const state = prev[auctionId];
          if (!state) return prev;
          const newRows = state.rows.map((row) =>
            row.supplier_id === supplierId
              ? { ...row, items: json.items || [] }
              : row
          );
          return {
            ...prev,
            [auctionId]: { ...state, rows: newRows },
          };
        });
      }
    } catch (err) {
      console.error("Error loading line items:", err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-blue-200 p-4">
      {data.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-5">
          No {type} auctions found
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-blue-100 text-black text-xs uppercase border-b border-blue-500">
            <tr>
              <th className="p-3 text-left">Auction Name </th>
              <th className="p-3 text-left">Auction Type</th>
              <th className="p-3 text-center">Start Date/Time</th>
              <th className="p-3 text-center">End Date/Time</th>
              <th className="p-3 text-center">Supplier Bids</th>
              {type === "live" && (
                <th className="p-3 text-center">Leaderboard</th>
              )}
              {type === "closed" && (
                <th className="p-3 text-center">Award</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((a: any) => {
              const lbState = leaderboards[a.id];
              const isAwarded = a.status === "awarded";

              return (
                <Fragment key={a.id}>
                  <tr className="border-b border-gray-100 hover:bg-[#f5f7fb] transition">
                    <td
                      className="p-3 font-semibold text-[#012b73] cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/admin/auctions/${a.id}`)
                      }
                    >
                      {getAuctionTitle(a)}
                    </td>
                    <td className="p-3 text-gray-700">{a.auction_type}</td>
                    <td className="p-3 text-center">
                      {a.start_at
                        ? new Date(a.start_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="p-3 text-center">
                      {a.end_at ? new Date(a.end_at).toLocaleString() : "-"}
                    </td>
                    <td className="p-3 text-center font-semibold text-green-500">
                      <BidCountCell
                        auctionId={a.id}
                        shouldLoad={type === "live" || type === "closed"}
                      />
                    </td>

                    {type === "live" && (
                      <td className="p-3 text-center">
                        <button
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs mx-auto"
                          onClick={() => handleToggleLeaderboard(a.id)}
                        >
                          {lbState?.open ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                          View
                        </button>
                      </td>
                    )}

                    {type === "closed" && (
                      <td className="p-3 text-center">
                        {isAwarded ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                            <CheckCircle size={14} />
                            Awarded
                          </span>
                        ) : (
                          <button
                            onClick={() => onAward?.(a.id, isAwarded)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                          >
                            Award
                          </button>
                        )}
                      </td>
                    )}
                  </tr>

                  {/* LIVE LEADERBOARD ROW */}
                  {type === "live" && lbState?.open && (
                    <tr className="bg-white border-b border-gray-100">
                      <td colSpan={6} className="p-3">
                        {lbState.rows.length === 0 ? (
                          <div className="text-xs text-gray-500">
                            No bids submitted yet.
                          </div>
                        ) : (
                          <table className="w-full text-xs bg-blue-50 rounded">
                            <thead className="bg-blue-200 text-gray-700">
                              <tr>
                                <th className="p-2 text-left">Rank</th>
                                <th className="p-2 text-left">Supplier Name</th>
                                <th className="p-2 text-right">Total bid Value</th>
                                <th className="p-2 text-center">Items</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lbState.rows.map((l, idx) => (
                                <Fragment
                                  key={`${a.id}_${l.supplier_id}_${idx}`}
                                >
                                  <tr className="border-b border-gray-200">
                                    <td className="p-2 font-semibold">
                                      {l.rank}
                                    </td>
                                    <td className="p-2">
                                     <b> {l.supplier_name || "N/A"} </b>
                                    </td>
                                    <td className="p-2 text-right text-blue-600 font-semibold">
                                      {l.total?.toLocaleString()}
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                        onClick={() => {
                                          if (!l.items || !l.items.length) {
                                            handleLoadItems(
                                              a.id,
                                              l.supplier_id
                                            );
                                          }
                                          setLeaderboards((prev) => {
                                            const state = prev[a.id];
                                            if (!state) return prev;
                                            const newRows = state.rows.map(
                                              (row, i2) =>
                                                i2 === idx
                                                  ? {
                                                      ...row,
                                                      expanded: !row.expanded,
                                                    }
                                                  : row
                                            );
                                            return {
                                              ...prev,
                                              [a.id]: {
                                                ...state,
                                                rows: newRows,
                                              },
                                            };
                                          });
                                        }}
                                      >
                                        {l.expanded ? "Hide" : "View"}
                                      </button>
                                    </td>
                                  </tr>

                                  {l.expanded && (l.items || []).length > 0 && (
                                    <tr className="bg-white">
                                      <td colSpan={4} className="p-3">
                                        <table className="w-full text-[11px] bg-white">
                                          <thead className="bg-blue-100 text-gray-700">
                                            <tr>
                                              <th className="p-2 text-left">
                                                Item Name
                                              </th>
                                              <th className="p-2 text-center">
                                                Quantity
                                              </th>
                                              <th className="p-2 text-center">
                                                Unit price
                                              </th>
                                              <th className="p-2 text-center">
                                                Total Price
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(l.items || []).map(
                                              (it: any, idx2: number) => (
                                                <tr
                                                  key={`${a.id}_${l.supplier_id}_${idx}_${idx2}`}
                                                  className="border-b border-gray-100"
                                                >
                                                  <td className="p-2">
                                                    {it.item_name}
                                                  </td>
                                                  <td className="p-2 text-center">
                                                    {it.qty}
                                                  </td>
                                                  <td className="p-2 text-center">
                                                    {it.unit_price?.toLocaleString()}
                                                  </td>
                                                  <td className="p-2 text-center font-semibold">
                                                    {it.total?.toLocaleString()}
                                                  </td>
                                                </tr>
                                              )
                                            )}
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
