"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import KPI from "../components/supplier/KPI";
import {
  BarChart3,
  FileText,
  Gavel,
  MessageSquare,
  Rocket,
  Search,
} from "lucide-react";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

type KPIData = {
  visibleRfqCount: number;
  invitedRfqCount: number;
  activeAuctionCount: number;
  openBidsCount: number;
  proposalCount: number;
};

type OpportunitySummary = {
  id: string;
  title: string;
  visibility: string;
  status: string;
  created_at: string;
};

type AuctionSummary = {
  id: string;
  title: string;
  auction_type: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
};

type BidActivityItem = {
  id: string;
  auction_id: string;
  auction_title: string;
  amount: number;
  created_at: string;
};

type DashboardData = {
  kpis: KPIData;
  opportunities: OpportunitySummary[];
  auctions: AuctionSummary[];
  bidActivity: BidActivityItem[];
};

export default function SupplierDashboard() {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Resolve supplierId from auth → profiles → supplier_contacts
  useEffect(() => {
    const loadSupplier = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profile?.id) return;

      const { data: contact } = await supabase
        .from("supplier_contacts")
        .select("supplier_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (!contact?.supplier_id) return;

      setSupplierId(contact.supplier_id);
    };

    loadSupplier();
  }, []);

  // Load dashboard data
  useEffect(() => {
    if (!supplierId) return;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/supplier/dashboard?supplier_id=${supplierId}`
        );
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          console.error("Dashboard error:", json.error);
          setError(json.error || "Failed to load dashboard");
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [supplierId]);

  const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const formatTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const filteredOpportunities = useMemo(() => {
    if (!data?.opportunities) return [];
    if (!search.trim()) return data.opportunities;
    const q = search.toLowerCase();
    return data.opportunities.filter((o) =>
      o.title.toLowerCase().includes(q)
    );
  }, [data?.opportunities, search]);

  // ------- CHART DATA (from real bidActivity) -------

  // Line chart – bid amounts over time (latest 10)
  const bidLineData = useMemo(() => {
    if (!data?.bidActivity?.length) {
      return {
        labels: ["No bids"],
        datasets: [
          {
            label: "Bid amount",
            data: [0],
            fill: true,
            borderColor: "rgba(129,140,248,1)",
            backgroundColor: "rgba(79,70,229,0.15)",
            tension: 0.35,
          },
        ],
      };
    }

    const sorted = [...data.bidActivity].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const latest = sorted.slice(-10);
    const labels = latest.map((b, idx) => `${idx + 1}`);
    const values = latest.map((b) => b.amount || 0);

    return {
      labels,
      datasets: [
        {
          label: "Bid amount",
          data: values,
          fill: true,
          borderColor: "rgba(129,140,248,1)",
          pointBackgroundColor: "rgba(129,140,248,1)",
          pointRadius: 3,
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return "rgba(79,70,229,0.15)";
            const gradient = c.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            gradient.addColorStop(0, "rgba(129,140,248,0.35)");
            gradient.addColorStop(1, "rgba(15,23,42,0)");
            return gradient;
          },
          tension: 0.35,
        },
      ],
    };
  }, [data?.bidActivity]);

  const bidLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `Bid: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#9ca3af", font: { size: 10 } },
        grid: { color: "rgba(55,65,81,0.4)" },
      },
      y: {
        ticks: { color: "#9ca3af", font: { size: 10 } },
        grid: { color: "rgba(31,41,55,0.6)" },
      },
    },
  };

  // Donut chart – bids per auction
  const bidDonutData = useMemo(() => {
    if (!data?.bidActivity?.length) {
      return {
        labels: ["No bids"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["rgba(75,85,99,0.9)"],
            borderWidth: 0,
          },
        ],
      };
    }

    const map = new Map<string, number>();
    data.bidActivity.forEach((b) => {
      const key = b.auction_title || "Auction";
      map.set(key, (map.get(key) || 0) + 1);
    });

    const labels = Array.from(map.keys());
    const values = Array.from(map.values());

    const palette = [
      "rgba(129,140,248,0.9)",
      "rgba(56,189,248,0.9)",
      "rgba(52,211,153,0.9)",
      "rgba(251,191,36,0.9)",
      "rgba(248,113,113,0.9)",
      "rgba(244,114,182,0.9)",
    ];

    const colors = values.map((_, i) => palette[i % palette.length]);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    };
  }, [data?.bidActivity]);

  const maxBidAmount = useMemo(() => {
    if (!data?.bidActivity?.length) return 0;
    return Math.max(...data.bidActivity.map((b) => b.amount || 0));
  }, [data?.bidActivity]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="rounded-2xl mb-2 p-7 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 shadow-xl shadow-indigo-900/40 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_55%)] pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Supplier dashboard
            </h2>
            <p className="mt-2 text-sm text-indigo-50/90 max-w-xl">
              Track opportunities, auctions, bids and messages in one place.
              All statistics below are driven from your live activity.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/supplier/opportunities"
                className="px-4 py-2 rounded-lg bg-white text-indigo-700 text-sm font-semibold shadow hover:bg-slate-100 flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Opportunities
              </Link>
              <Link
                href="/supplier/auctions"
                className="px-4 py-2 rounded-lg border border-indigo-100/60 bg-indigo-900/20 text-indigo-50 text-sm font-medium hover:bg-indigo-900/40 flex items-center gap-2"
              >
                <Gavel className="h-4 w-4" />
                Auctions
              </Link>
              <Link
                href="/supplier/messages"
                className="px-4 py-2 rounded-lg border border-indigo-100/60 bg-indigo-900/10 text-indigo-50 text-sm font-medium hover:bg-indigo-900/30 flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Messages
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/40 border border-indigo-300/30 px-5 py-4 text-xs text-indigo-50 shadow-lg min-w-[220px]">
            <p className="font-semibold text-[13px] mb-1">
              Today&apos;s snapshot
            </p>
            {!kpis ? (
              <p className="text-indigo-100/80">Loading...</p>
            ) : (
              <ul className="space-y-1 text-[11px] text-indigo-100/90">
                <li>
                  • {kpis.visibleRfqCount} visible RFQs (
                  {kpis.invitedRfqCount} invited)
                </li>
                <li>• {kpis.activeAuctionCount} active auctions</li>
                <li>• {kpis.proposalCount} proposals submitted</li>
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPI
          title="Visible RFQs"
          value={kpis?.visibleRfqCount ?? 0}
          icon={<FileText className="w-4 h-4" />}
        />
        <KPI
          title="Invited RFQs"
          value={kpis?.invitedRfqCount ?? 0}
          icon={<MessageSquare className="w-4 h-4" />}
        />
        <KPI
          title="Active auctions"
          value={kpis?.activeAuctionCount ?? 0}
          icon={<Gavel className="w-4 h-4" />}
        />
        <KPI
          title="Auctions with your bids"
          value={kpis?.openBidsCount ?? 0}
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <KPI
          title="Proposals submitted"
          value={kpis?.proposalCount ?? 0}
          icon={<Rocket className="w-4 h-4" />}
        />
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3 backdrop-blur-lg gap-3">
        <Search className="text-slate-400 w-4 h-4" />
        <input
          placeholder="Quick search in your RFQs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent outline-none text-slate-100 text-sm placeholder:text-slate-500"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-16 text-slate-400">
          <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2" />
          Loading your dashboard...
        </div>
      )}

      {!loading && data && (
        <>
          {/* CHARTS ROW – Line + Donut */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Line chart */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Bid amounts (last 10 bids)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Higher line peaks represent higher bid values you placed.
                  </p>
                </div>
              </div>
              <div className="h-52">
                <Line data={bidLineData} options={bidLineOptions} />
              </div>
            </div>

            {/* Donut chart */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Bids per auction
                  </h3>
                  <p className="text-xs text-slate-400">
                    Distribution of your recent bids across auctions.
                  </p>
                </div>
              </div>
              <div className="h-52 flex items-center justify-center">
                <Doughnut
                  data={bidDonutData}
                  options={{
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: {
                          color: "#e5e7eb",
                          font: { size: 11 },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

{/* ===================== OPPORTUNITIES SECTION ===================== */}
<section className="space-y-4 mt-6">
  <div className="flex items-center mb-2">
    <h3 className="text-sm font-semibold text-slate-100">Opportunities for you</h3>
    <div className="flex-1 h-[1px] mx-3 bg-slate-800/60" />
    <span className="text-[11px] text-slate-400">
      {filteredOpportunities.length} / {data.opportunities.length}
    </span>
  </div>

  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 backdrop-blur-md p-4">
    {filteredOpportunities.length === 0 ? (
      <div className="py-10 text-center text-sm text-slate-400">
        No matching RFQs. Try a different search term.
      </div>
    ) : (
      <div className="space-y-4">
        {filteredOpportunities.map((o) => (
          <div
            key={o.id}
            className="relative rounded-xl border border-slate-800/70 bg-slate-900/40 hover:bg-slate-900/60 transition shadow-sm p-4 flex flex-col justify-between"
          >
            {/* Public/Invited pill top-left */}
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-600/40 text-[10px] uppercase font-semibold">
              {o.visibility === "public" ? "Public" : "Invited"}
            </span>

            <div className="space-y-2 mt-6">
              <Link
                href={`/supplier/opportunities/${o.id}`}
                className="text-sm font-semibold text-slate-100 hover:text-indigo-300"
              >
                {o.title}
              </Link>

              <p className="text-[11px] text-slate-400">
                {formatDate(o.created_at)} {formatTime(o.created_at)}
              </p>

              <p className="text-[11px] text-slate-400">
                Status: <span className="text-slate-200 font-medium">{o.status}</span>
              </p>
            </div>

            <div className="flex justify-end mt-3">
              <Link
                href={`/supplier/opportunities/${o.id}`}
                className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold rounded-lg px-3 py-1.5 text-white shadow-sm"
              >
                Respond now
              </Link>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</section>

{/* ======================= AUCTIONS SECTION ======================== */}
<section className="space-y-4 mt-10">
  <div className="flex items-center mb-2">
    <h3 className="text-sm font-semibold text-slate-100">Your auctions</h3>
    <div className="flex-1 h-[1px] mx-3 bg-slate-800/60" />
  </div>

  {data.auctions.length === 0 ? (
    <p className="text-xs text-slate-500 py-5 text-center">
      No auctions assigned.
    </p>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {([...data.auctions].sort((a, b) => {
        const now = Date.now();
        const startA = a.start_at ? new Date(a.start_at).getTime() : 0;
        const endA = a.end_at ? new Date(a.end_at).getTime() : 0;
        const startB = b.start_at ? new Date(b.start_at).getTime() : 0;
        const endB = b.end_at ? new Date(b.end_at).getTime() : 0;

        const statusA = now < startA ? "upcoming" : now > endA ? "closed" : "active";
        const statusB = now < startB ? "upcoming" : now > endB ? "closed" : "active";

        if (statusA === "closed" && statusB !== "closed") return 1;
        if (statusA !== "closed" && statusB === "closed") return -1;
        return 0;
      })).map((a) => {
        const userBids = data.bidActivity.filter((b) => b.auction_id === a.id);
        const lastBid = userBids[userBids.length - 1];

        const now = Date.now();
        const start = a.start_at ? new Date(a.start_at).getTime() : null;
        const end = a.end_at ? new Date(a.end_at).getTime() : null;

        const status = (() => {
          if (start && now < start) return "upcoming";
          if (start && (!end || now <= end)) return "active";
          if (end && now > end) return "closed";
          return "unknown";
        })();

        // glossy status dot
        const dotClass =
          status === "active"
            ? "bg-green-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
            : status === "upcoming"
            ? "bg-gray-300 shadow-[0_0_6px_rgba(209,213,219,0.8)]"
            : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]";

        const countdownLabel = (() => {
          if (status === "upcoming" && start) {
            const hrs = Math.floor((start - now) / (1000 * 60 * 60));
            return `Starts in ${hrs}h`;
          }
          if (status === "active" && end) {
            const hrs = Math.floor((end - now) / (1000 * 60 * 60));
            return `Ends in ${hrs}h`;
          }
          return null;
        })();

        // glossy gradient pills for auction type
        const typeClass = {
          standard:
            "bg-gradient-to-r from-blue-500/40 to-blue-400/20 text-blue-100 border border-blue-400/40 shadow-[0_0_8px_rgba(96,165,250,0.5)] backdrop-blur-sm",
          ranked:
            "bg-gradient-to-r from-purple-600/40 to-purple-500/20 text-purple-100 border border-purple-400/40 shadow-[0_0_8px_rgba(168,85,247,0.5)] backdrop-blur-sm",
          sealed:
            "bg-gradient-to-r from-amber-500/40 to-amber-400/20 text-amber-100 border border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.5)] backdrop-blur-sm",
          reverse:
            "bg-gradient-to-r from-emerald-500/40 to-emerald-400/20 text-emerald-100 border border-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.5)] backdrop-blur-sm",
        }[a.auction_type] ?? "bg-slate-700/40 text-slate-200";

        return (
          <div
            key={a.id}
            className="relative rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 hover:bg-slate-900/60 transition shadow-xl flex flex-col justify-between"
          >
            {/* glossy live status dot */}
            <span className={`absolute top-3 left-3 h-2.5 w-2.5 rounded-full ${dotClass}`} />

            {/* glossy auction type pill */}
            <span
              className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${typeClass}`}
            >
              {a.auction_type}
            </span>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-100 truncate">{a.title}</p>

              <p className="text-[11px] text-slate-400">
                {a.start_at ? `Starts: ${formatDate(a.start_at)} ${formatTime(a.start_at)}` : "Starts TBA"}
                {a.end_at && (
                  <>
                    <br />Ends: {formatDate(a.end_at)} {formatTime(a.end_at)}
                  </>
                )}
              </p>

              {countdownLabel && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-indigo-600/20 text-indigo-200 text-[10px] uppercase font-semibold shadow-[0_0_6px_rgba(99,102,241,0.4)] backdrop-blur-md">
                  {countdownLabel}
                </span>
              )}

              {userBids.length > 0 ? (
                <div className="mt-3 text-[13px] text-slate-200 font-medium space-y-1">
                  <p>
                    Last bid: <span className="text-indigo-300 font-bold">{lastBid.amount}</span>
                  </p>
                  <p>
                    Total bids placed: <span className="text-indigo-300 font-bold">{userBids.length}</span>
                  </p>
                </div>
              ) : (
                <p className="text-[12px] text-slate-500 italic mt-2 font-medium">You haven't bid yet</p>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Link
                href={`/supplier/auctions/${a.id}`}
                className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white shadow-[0_0_8px_rgba(99,102,241,0.6)]"
              >
                Enter auction
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>

       
        </>
      )}
    </div>
  );
}
