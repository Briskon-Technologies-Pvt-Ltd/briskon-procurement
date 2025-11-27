"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  Fragment,
} from "react";
import Link from "next/link";
import {
  PlusCircle,
  FileSpreadsheet,
  FileCheck,
  Rocket,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

/* ---------- TYPES ---------- */
type RFQ = {
  id: string;
  title: string;
  status?: string;
  created_at: string;
  end_at: string;
  items_count?: number;
  invited_suppliers_count?: number;
  received_proposals?: number;
  visibility?: string;
  award_id?: string;
  invited_suppliers?: any[];
};

export default function RFQDashboard() {
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement>(null);

  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [filteredRFQs, setFilteredRFQs] = useState<RFQ[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc">("date_desc");

  const [activeStatus, setActiveStatus] = useState<
    "all" | "draft" | "published" | "converted_to_auction" | "awarded"
  >("draft");

  const [pageSize, setPageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);

  // Leaderboard modal state (center modal, accordion rows)
  const [leaderboardModal, setLeaderboardModal] = useState<{
    open: boolean;
    auctionId: string | null;
    rows: any[];
  }>({
    open: false,
    auctionId: null,
    rows: [],
  });

  /* ---------- Load RFQs ---------- */
  const loadRFQs = useCallback(async () => {
    try {
      const res = await fetch("/api/rfqs?t=" + Date.now());
      const json = await res.json();
      if (res.ok && json.success) {
        const sorted = (json.rfqs || []).sort(
          (a: RFQ, b: RFQ) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRfqs(sorted);
        setFilteredRFQs(sorted);
      }
    } catch (err) {
      console.error("Error loading RFQs:", err);
    }
  }, []);

  useEffect(() => {
    loadRFQs();
  }, [loadRFQs]);

  /* ---------- Search + sort ---------- */
  useEffect(() => {
    let data = rfqs.slice();

    if (searchTerm.trim()) {
      data = data.filter((r) =>
        (r.title || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    data = data.sort((a, b) =>
      sortBy === "date_desc"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    setFilteredRFQs(data);
    setPageIndex(0);
  }, [searchTerm, sortBy, rfqs]);

  /* ---------- Summary Stats ---------- */
  const summary = {
    total: rfqs.length,
    draft: rfqs.filter((r) => r.status === "draft").length,
    published: rfqs.filter((r) => r.status === "published").length,
    converted: rfqs.filter((r) => r.status === "converted_to_auction").length,
    awarded: rfqs.filter((r) => r.status === "awarded").length,
  };

  /* ---------- Chart Data ---------- */
  const pieData = [
    { name: "Draft", value: summary.draft },
    { name: "Published", value: summary.published },
    { name: "Auction", value: summary.converted },
    { name: "Awarded", value: summary.awarded },
  ];

  const COLORS = ["#60a5fa", "#34d399", "#facc15", "#f87171", "#a855f7"];

  /* ---------- Filtering by Status ---------- */
  const statusFilteredRFQs =
    activeStatus === "all"
      ? filteredRFQs
      : filteredRFQs.filter((r) => r.status === activeStatus);

  /* ---------- Pagination ---------- */
  const paginated = statusFilteredRFQs.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );
  const totalPages = Math.max(
    1,
    Math.ceil(statusFilteredRFQs.length / pageSize)
  );

  /* ---------- KPI Click Handler ---------- */
  const handleKPISelect = (status: any) => {
    setActiveStatus(status);
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  /* ---------- Auction lookup + Leaderboard ---------- */

  // 1) find auction by rfq_id then open leaderboard
  const loadAuctionIdAndOpenLeaderboard = async (rfqId: string) => {
    try {
      // This assumes your /api/auctions GET supports filtering by rfq_id.
      // If not, you can create a dedicated /api/auctions/find route.
      const res = await fetch(`/api/auctions?rfq_id=${rfqId}`);
      if (!res.ok) {
        const text = await res.text();
        console.error("Auction lookup error:", res.status, text);
        alert("Unable to find auction for this RFQ.");
        return;
      }
      const json = await res.json();

      // Try to pick auction from either json.auction or json.auctions[0]
      const auction =
        json.auction ||
        (Array.isArray(json.auctions) && json.auctions.length > 0
          ? json.auctions[0]
          : null);

      if (!auction?.id) {
        alert("No associated auction found for this RFQ.");
        return;
      }

      await openLeaderboard(auction.id);
    } catch (err) {
      console.error("Auction lookup error:", err);
      alert("Error while finding auction. Check console.");
    }
  };

  // 2) load leaderboard from /api/bids/leaderboard

  const openLeaderboard = async (auctionId: string) => {
    try {
      const resLB = await fetch(`/api/bids/leaderboard?auction_id=${auctionId}`);
      const jsonLB = await resLB.json();

      if (jsonLB.success) {
        setLeaderboardModal({
          open: true,
          auctionId,
          rows: jsonLB.leaderboard || [],
        });
      }
    } catch (e) {
      console.error("Error opening leaderboard:", e);
    }
  };


  // 3) load item-level details when user expands a supplier row
  const loadItemsForSupplier = async (supplierId: string) => {
    if (!leaderboardModal.auctionId) return;

    try {
      const res = await fetch(
        `/api/bids/items?auction_id=${leaderboardModal.auctionId}&supplier_id=${supplierId}`
      );
      if (!res.ok) {
        const text = await res.text();
        console.error("Items load error:", res.status, text);
        return;
      }

      const json = await res.json();
      if (!json.success) {
        console.error("Items JSON error:", json);
        return;
      }

      const items = json.items || [];

      setLeaderboardModal((prev) => ({
        ...prev,
        rows: prev.rows.map((row: any) =>
          row.supplier_id === supplierId
            ? { ...row, items, expanded: !row.expanded }
            : row
        ),
      }));
    } catch (err) {
      console.error("Error loading line items:", err);
    }
  };

  const toggleExpandRow = (supplierId: string) => {
    setLeaderboardModal((prev) => ({
      ...prev,
      rows: prev.rows.map((row: any) =>
        row.supplier_id === supplierId
          ? { ...row, expanded: !row.expanded }
          : row
      ),
    }));
  };

  const closeLeaderboard = () =>
    setLeaderboardModal({ open: false, auctionId: null, rows: [] });

  /* ---------- Action renderer by status ---------- */
  const renderAction = (r: RFQ) => {
    switch (r.status) {
      case "draft":
        return (
          <Link
            href={`/admin/rfqs/${r.id}`}
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            Edit RFQ
          </Link>
        );

      case "published":
        return (
          <Link
            href={`/admin/rfqs/${r.id}`}
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            View RFQ
          </Link>
        );

      case "converted_to_auction":
        return (
          <button
            className="text-blue-600 hover:text-blue-800 font-semibold"
            onClick={() => loadAuctionIdAndOpenLeaderboard(r.id)}
          >
            View Leaderboard
          </button>

        );

      case "awarded":
        return (
          <Link
            href={`/admin/awards/${r.award_id}`}
            className="text-purple-600 hover:text-purple-800 font-semibold"
          >
            View Award
          </Link>
        );

      default:
        return <span className="text-gray-500 text-xs">-</span>;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* CREATE BUTTON */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => router.push("/admin/rfqs/new")}
          className="px-4 py-2 flex items-center gap-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle size={18} /> Create RFQ
        </button>
      </div>

      {/* ---------- KPI CARDS ---------- */}
      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <KPI
          label="Total RFQs"
          value={summary.total}
          icon={<FileSpreadsheet />}
          active={activeStatus === "all"}
          onClick={() => handleKPISelect("all")}
        />
        <KPI
          label="Draft RFQs"
          value={summary.draft}
          icon={<Layers />}
          active={activeStatus === "draft"}
          onClick={() => handleKPISelect("draft")}
        />
        <KPI
          label="Published for Proposals"
          value={summary.published}
          icon={<FileCheck />}
          active={activeStatus === "published"}
          onClick={() => handleKPISelect("published")}
        />
        <KPI
          label="Converted to Auctions"
          value={summary.converted}
          icon={<Rocket />}
          active={activeStatus === "converted_to_auction"}
          onClick={() => handleKPISelect("converted_to_auction")}
        />
        <KPI
          label="Awarded"
          value={summary.awarded}
          icon={<FileCheck />}
          active={activeStatus === "awarded"}
          onClick={() => handleKPISelect("awarded")}
        />
      </div>

      {/* ---------- CHARTS ---------- */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        <ChartCard title="Status Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie dataKey="value" data={pieData} outerRadius={85} label>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="RFQs Created per Week">
          <ResponsiveContainer width="100%" height={260}>
            {/* Currently using pieData as placeholder; plug weekly data if needed */}
            <BarChart data={pieData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#2f6efb" name="RFQs" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-[#012b73]">RFQ Details</h2>
        <div className="flex-1 h-[1px] bg-blue-600 ml-4" />
      </div>

      {/* ---------- FILTER CHIPS ---------- */}
      <div className="flex gap-2 mb-4 flex-wrap ">
        {[
          ["all", "ALL RFQs"],
          ["draft", "DRAFT"],
          ["published", "PUBLISHED FOR PROPOSALS"],
          ["converted_to_auction", "CONVERTED TO AUCTIONS"],
          ["awarded", "AWARDED"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveStatus(key as any)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${activeStatus === key
              ? "bg-blue-400 text-white border-blue-800"
              : "bg-white text-black border-blue-200 hover:bg-blue-50"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---------- TABLE ---------- */}
      <div
        ref={tableRef}
        className="bg-white rounded border border-blue-200 shadow-sm overflow-hidden"
      >
        {statusFilteredRFQs.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">No RFQs found</div>
        ) : (
          <div className="overflow-visible">
            <table className="min-w-full text-xs">
              <thead className="bg-blue-50 sticky top-0 z-10 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">RFQ Title</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">End Date/Time</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-center">Invited Suppliers</th>
                  <th className="px-4 py-3 text-center">Proposals/Bids</th>
                  <th className="px-4 py-3 text-left">Created On</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >

                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="font-medium text-gray-800 truncate">{r.title}</div>

                      {r.status !== "draft" && r.end_at && (
                        <TimeStatus start={r.created_at} end={r.end_at} />
                      )}
                    </td>


                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.end_at
                        ? new Date(r.end_at)
                          .toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          .replace(",", "")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.items_count ?? 0}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {r.visibility === "public" ? (
                        <span className="text-blue-500 text-[11px]">🌐 Open to all </span>
                      ) : (
                        <SupplierChips suppliers={r.invited_suppliers || []} />
                      )}
                    </td>

                    <td className="px-4 py-3 text-center font-semibold">
                      {r.received_proposals ?? 0}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {r.created_at
                        ? new Date(r.created_at)
                          .toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          .replace(",", "")
                        : "-"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {renderAction(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---------- PAGINATION ---------- */}
        <div className="flex justify-between items-center p-3 border-t text-xs">
          <div className="flex items-center gap-2">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              {[20, 40, 50].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 font-medium">
            <button
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => p - 1)}
              className="px-3 py-1 rounded bg-blue-600 text-white disabled:bg-gray-300"
            >
              Prev
            </button>
            <span>
              {pageIndex + 1} / {totalPages}
            </span>
            <button
              disabled={(pageIndex + 1) * pageSize >= statusFilteredRFQs.length}
              onClick={() => setPageIndex((p) => p + 1)}
              className="px-3 py-1 rounded bg-blue-600 text-white disabled:bg-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ---------- LEADERBOARD MODAL (CENTER, ACCORDION) ---------- */}
      {leaderboardModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Auction Leaderboard</h2>
              <button
                onClick={closeLeaderboard}
                className="text-gray-600 hover:text-black"
              >
                ✖
              </button>
            </div>

            {leaderboardModal.rows.length === 0 ? (
              <p className="text-sm text-gray-500">
                No bids submitted yet for this auction.
              </p>
            ) : (
              <table className="w-full text-xs bg-blue-50 rounded">
                <thead className="bg-blue-200 text-gray-700">
                  <tr>
                    <th className="p-2 text-left">Rank</th>
                    <th className="p-2 text-left">Supplier</th>
                    <th className="p-2 text-right">Total Bid Value</th>
                    <th className="p-2 text-center">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardModal.rows.map((row: any, idx: number) => (
                    <Fragment
                      key={`${row.supplier_id}_${idx}_${row.rank ?? ""}`}
                    >
                      <tr className="border-b border-blue-100 bg-blue-50">
                        <td className="p-2 font-semibold">{row.rank}</td>
                        <td className="p-2">
                          <b>{row.supplier_name || "N/A"}</b>
                        </td>
                        <td className="p-2 text-right text-blue-700 font-semibold">
                          {row.total?.toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 text-xs font-medium"
                            onClick={() => {
                              if (!row.items || row.items.length === 0) {
                                // first time: load items and expand
                                loadItemsForSupplier(row.supplier_id);
                              } else {
                                // just toggle expand
                                toggleExpandRow(row.supplier_id);
                              }
                            }}
                          >
                            {row.expanded ? (
                              <>
                                <ChevronUp size={14} />
                                Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} />
                                View
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {row.expanded && (row.items || []).length > 0 && (
                        <tr className="bg-white">
                          <td colSpan={4} className="p-3">
                            <table className="w-full text-[11px] bg-white border border-blue-100 rounded-md">
                              <thead className="bg-blue-100 text-gray-700">
                                <tr>
                                  <th className="p-2 text-left">Item Name</th>
                                  <th className="p-2 text-center">Quantity</th>
                                  <th className="p-2 text-center">
                                    Unit Price
                                  </th>
                                  <th className="p-2 text-center">
                                    Total Price
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(row.items || []).map(
                                  (it: any, idx2: number) => (
                                    <tr
                                      key={`${row.supplier_id}_${idx}_${idx2}`}
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
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- KPI CARD COMPONENT ---------- */
const KPI = ({ label, value, icon, active, onClick }: any) => (
  <div
    onClick={onClick}
    className={`cursor-pointer p-5 rounded-xl shadow text-center border transition-all
      ${active
        ? "bg-blue-600 text-white border-blue-700 scale-[1.02]"
        : "bg-white text-gray-800 border-blue-200 hover:shadow-md hover:border-blue-700"
      }
    `}
  >
    <div className="text-3xl font-bold">{value}</div>
    <div className="text-sm font-medium mt-1">{label}</div>
  </div>
);

const ChartCard = ({ title, children }: any) => (
  <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
    <h2 className="text-xl font-semibold mb-3">{title}</h2>
    {children}
  </div>
);

const StatusPill = ({ status }: any) => (
  <span
    className={`px-3 py-1 rounded-full text-xs capitalize
    ${status === "draft"
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



const SupplierChips = ({ suppliers = [] }: { suppliers?: any[] }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const count = suppliers.length;
  const remaining = count > 2 ? count - 2 : 0;

  return (
    <div className="flex items-center gap-1 relative">
      {suppliers.slice(0, 2).map((s: any, i: number) => (
        <span
          key={i}
          className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-medium"
        >
          {s.company_name}
        </span>
      ))}

      {remaining > 0 && (
        <span
          className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold cursor-pointer"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          +{remaining} more
        </span>
      )}

      {showTooltip && (
        <div className="absolute top-6 left-0 z-50 bg-white border border-gray-200 shadow-lg rounded-md p-2 text-[11px] w-max">
          {suppliers.slice(2).map((s: any, idx: number) => (
            <div key={idx} className="py-1 px-2">
              {s.company_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};



const TimeStatus = ({ start, end }: any) => {
  const now = new Date().getTime();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();

  let label = "";
  let color = "";

  if (now < s) {
    label = "Upcoming";
    color = "text-yellow-400";
  } else if (now >= s && now <= e) {
    label = "Live";
    color = "text-green-500";
  } else {
    label = "Ended";
    color = "text-red-400";
  }

  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold ${color}`}>
      <span className="w-2 h-2 rounded-full bg-current"></span>
      {label}
    </span>
  );
};

