"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileDown,
  Users,
  Package,
  Rocket,
  Share2,
  Loader2,
  Trophy,
  ChevronDown,
} from "lucide-react";

export default function RFQDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [rfq, setRfq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"publish" | "convert" | null>(null);

  // ----------- PROPOSALS STATE -----------
  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [proposalsError, setProposalsError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // For Award button loading state
  const [awardLoadingId, setAwardLoadingId] = useState<string | null>(null);

  // ---------------- Load RFQ ----------------
  useEffect(() => {
    if (!id) return;
    const loadRFQ = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/rfqs?id=${id}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load RFQ");
        setRfq(json.rfq);
      } catch (err: any) {
        console.error("RFQ fetch error:", err);
        setError(err.message || "Failed to load RFQ");
      } finally {
        setLoading(false);
      }
    };
    loadRFQ();
  }, [id]);

  // ---------------- Load PROPOSALS (ADMIN) ----------------
  useEffect(() => {
    if (!id) return;
    const loadProposals = async () => {
      try {
        setProposalsLoading(true);
        setProposalsError(null);
        const res = await fetch(`/api/proposals?rfq_id=${id}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load proposals");
        setProposals(json.proposals || []);
      } catch (err: any) {
        console.error("Proposals fetch error:", err);
        setProposalsError(err.message || "Failed to load proposals");
      } finally {
        setProposalsLoading(false);
      }
    };
    loadProposals();
  }, [id]);

  // ---------------- Time-based RFQ state: UPCOMING / LIVE / ENDED ----------------
  const timeStatus = useMemo<"UPCOMING" | "LIVE" | "ENDED" | null>(() => {
    if (!rfq) return null;

    const now = Date.now();
    const end = rfq.end_at ? new Date(rfq.end_at).getTime() : 0;

    if (rfq.status === "draft") return "UPCOMING";
    if (rfq.status === "published" && (!end || now < end)) return "LIVE";
    return "ENDED";
  }, [rfq]);

  const timeStatusClasses = useMemo(() => {
    if (timeStatus === "UPCOMING") {
      return "bg-yellow-50 text-yellow-700 border border-yellow-300 backdrop-blur-sm";
    }
    if (timeStatus === "LIVE") {
      return "bg-green-50 text-green-700 border border-green-300 backdrop-blur-sm";
    }
    if (timeStatus === "ENDED") {
      return "bg-red-50 text-red-700 border border-red-300 backdrop-blur-sm";
    }
    return "bg-gray-50 text-gray-600 border border-gray-200";
  }, [timeStatus]);

  // ---------------- Actions ----------------
  const handleAction = async (action: "publish" | "convert") => {
    if (!id) return;

    if (action === "convert") {
      setConfirmAction(null);
      router.push(`/admin/auctions/new?from_rfq=${id}`);
      return;
    }

    if (action === "publish") {
      try {
        setActionLoading(true);
        const res = await fetch("/api/rfqs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action: "publish" }),
        });
        const json = await res.json();

        if (!res.ok || !json.success) throw new Error(json.error || "Action failed");

        setRfq((prev: any) =>
          prev ? { ...prev, status: "published", published_at: new Date().toISOString() } : prev
        );
        setConfirmAction(null);
        alert("RFQ published successfully!");
      } catch (err: any) {
        console.error("Publish error:", err);
        alert("❌ " + (err.message || "Publish failed"));
      } finally {
        setActionLoading(false);
      }
      return;
    }
  };

  // ---------------- Award handler (now calls /api/awards) ----------------
  const handleAwardClick = async (proposal: any) => {
    if (!rfq) return;

    // 1) UPCOMING → do not allow
    if (timeStatus === "UPCOMING") {
      alert("This RFQ is not live yet. You cannot award before it is open for responses.");
      return;
    }

    // 2) LIVE → extra confirmation about closing further responses
    if (timeStatus === "LIVE") {
      const earlyConfirm = window.confirm(
        "This RFQ is currently LIVE. Awarding now will close further responses.\n\nDo you still want to proceed with awarding?"
      );
      if (!earlyConfirm) return;
    }

    // 3) Final award confirmation
    const finalConfirm = window.confirm(
      "Are you sure you want to award this RFQ to this supplier?"
    );
    if (!finalConfirm) return;

    const supplierId = proposal?.supplier?.id || proposal?.supplier_id;
    if (!supplierId) {
      alert("Unable to determine supplier for this proposal. Cannot award.");
      return;
    }

    // Optional justification
    const award_summary =
      window.prompt(
        "Enter award justification / summary (optional):",
        ""
      ) || "";

    try {
      setAwardLoadingId(proposal.id);

      const res = await fetch("/api/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfq_id: rfq.id,
          supplier_id: supplierId,
          award_summary,
          // If you have logged-in profile id, pass that instead of created_by
          awarded_by_profile_id: rfq.created_by || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Award action failed");
      }

      // Update RFQ status in UI → 'awarded'
      setRfq((prev: any) => (prev ? { ...prev, status: "awarded" } : prev));

      alert("Award recorded successfully.");
    } catch (err: any) {
      console.error("Award error:", err);
      alert("❌ " + (err.message || "Award action failed"));
    } finally {
      setAwardLoadingId(null);
    }
  };

  // ---------------- Derived data for ranking & comparison ----------------
  const sortedProposals = useMemo(() => {
    if (!proposals || !proposals.length) return [];
    const arr = proposals.map((p: any) => ({
      ...p,
      _sortTotal:
        typeof p.total_price === "number" && !isNaN(p.total_price)
          ? p.total_price
          : Number.POSITIVE_INFINITY,
    }));
    arr.sort((a: any, b: any) => a._sortTotal - b._sortTotal);
    return arr;
  }, [proposals]);

  const hasAnyTotal = useMemo(
    () =>
      sortedProposals.some(
        (p: any) => typeof p.total_price === "number" && !isNaN(p.total_price)
      ),
    [sortedProposals]
  );

  // Supplier columns for line-item comparison
  const supplierColumns = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    proposals.forEach((p: any) => {
      const sid = p.supplier?.id || p.supplier_id;
      if (!sid) return;
      if (!map.has(sid)) {
        map.set(sid, {
          id: sid,
          name: p.supplier?.company_name || "Supplier",
        });
      }
    });
    return Array.from(map.values());
  }, [proposals]);

  // Index line items: rfq_item_id -> supplier_id -> unit_price
  const lineItemIndex = useMemo(() => {
    const idx: Record<string, Record<string, number>> = {};
    proposals.forEach((p: any) => {
      const sid = p.supplier?.id || p.supplier_id;
      if (!sid) return;
      (p.line_items || []).forEach((li: any) => {
        if (!li.rfq_item_id) return;
        if (!idx[li.rfq_item_id]) idx[li.rfq_item_id] = {};
        if (typeof li.unit_price === "number" && !isNaN(li.unit_price)) {
          idx[li.rfq_item_id][sid] = li.unit_price;
        }
      });
    });
    return idx;
  }, [proposals]);

  // ---------------- UI guards ----------------
  if (loading)
    return <div className="p-10 text-gray-500 text-center">Loading RFQ details...</div>;
  if (error)
    return (
      <div className="p-10 text-red-500 text-center">
        Error loading RFQ: {error}
      </div>
    );
  if (!rfq) return <div className="p-10 text-gray-500 text-center">No data found</div>;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">{rfq.title}</h1>
          <p className="text-gray-500 text-sm">
            Status:{" "}
            <span
              className={`font-medium ${
                rfq.status === "draft"
                  ? "text-gray-700"
                  : rfq.status === "published"
                  ? "text-green-700"
                  : rfq.status === "converted_to_auction"
                  ? "text-blue-700"
                  : rfq.status === "awarded"
                  ? "text-emerald-700"
                  : "text-gray-500"
              }`}
            >
              {rfq.status}
            </span>{" "}
            • Created {rfq.created_at ? new Date(rfq.created_at).toLocaleDateString() : "—"}
          </p>
          {rfq.end_at && (
            <p className="text-gray-400 text-xs mt-1">
              Ends on: {new Date(rfq.end_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Right side: time-state pill + (for draft) action buttons */}
        <div className="flex flex-col items-end gap-3">
          {timeStatus && (
            <div
              className={`px-4 py-1 rounded-full text-xs font-semibold shadow-sm ${timeStatusClasses}`}
            >
              {timeStatus}
            </div>
          )}

          {rfq.status === "draft" && (
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction("publish")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm text-sm"
              >
                <Share2 size={16} /> Publish RFQ
              </button>
              <button
                onClick={() => setConfirmAction("convert")}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm text-sm"
              >
                <Rocket size={16} /> Convert to Auction
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RFQ Items */}
      <section className="bg-white rounded-2xl shadow p-5 border">
        <div className="flex items-center mb-3">
          <Package className="w-5 h-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-800">RFQ Items</h2>
        </div>
        {rfq.rfq_items?.length ? (
          <table className="w-full text-sm border-collapse border border-gray-200">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 text-left border border-gray-200">Description</th>
                <th className="p-2 border border-gray-200">Qty</th>
                <th className="p-2 border border-gray-200">UOM</th>
                <th className="p-2 border border-gray-200">Est. Value</th>
              </tr>
            </thead>
            <tbody>
              {rfq.rfq_items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-2 border border-gray-200">{item.description}</td>
                  <td className="p-2 text-center border border-gray-200">{item.qty}</td>
                  <td className="p-2 text-center border border-gray-200">{item.uom}</td>
                  <td className="p-2 text-right border border-gray-200">
                    {item.estimated_value ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-sm italic">No items added.</p>
        )}
      </section>

      {/* Suppliers */}
      <section className="bg-white rounded-2xl shadow p-5 border">
        <div className="flex items-center mb-3">
          <Users className="w-5 h-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-800">Suppliers</h2>
        </div>

        {rfq.visibility === "public" && (
          <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded-md">
            🔓 This RFQ is <strong>public</strong> and open to <strong>all approved suppliers</strong>.
          </p>
        )}

        {rfq.visibility === "invited" && (
          <>
            {rfq.invited_suppliers?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {rfq.invited_suppliers.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border border-gray-200 hover:shadow-sm transition"
                  >
                    <div className="font-semibold text-gray-800">{s.company_name}</div>
                    {s.contacts?.length ? (
                      <div className="mt-2 space-y-1">
                        {s.contacts.map((c: any, i: number) => (
                          <div key={i} className="text-sm text-gray-600 leading-tight">
                            {c.email && (
                              <div>
                                <span className="font-medium text-gray-700">Email:</span>{" "}
                                {c.email}
                              </div>
                            )}
                            {c.phone && (
                              <div>
                                <span className="font-medium text-gray-700">Phone:</span>{" "}
                                {c.phone}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic mt-1">
                        No contact information available.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No suppliers invited yet.</p>
            )}
          </>
        )}
      </section>

      {/* Attachments */}
      <section className="bg-white rounded-2xl shadow p-5 border">
        <div className="flex items-center mb-3">
          <FileDown className="w-5 h-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-800">Attachments</h2>
        </div>
        {rfq.rfq_documents?.length ? (
          <ul className="space-y-2">
            {rfq.rfq_documents.map((doc: any, i: number) => (
              <li key={i} className="flex items-center text-sm">
                <FileDown className="w-4 h-4 text-gray-500 mr-2" />
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {doc.file_name || doc.storage_path?.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm italic">No attachments uploaded.</p>
        )}
      </section>

      {/* ==============================================================
                         PROPOSAL COMPARISON SECTION
      ============================================================== */}
      <section className="bg-white rounded-2xl shadow p-6 border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            Proposals Received{" "}
            {proposals?.length ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                {proposals.length}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-400">
                0
              </span>
            )}
          </h2>

          {proposals.length > 0 && (
            <button
              onClick={() => setShowComparison((prev) => !prev)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border bg-blue-500 text-white border-blue-200 hover:bg-blue-800"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${
                  showComparison ? "rotate-180" : "rotate-0"
                }`}
              />
              Line item comparison
            </button>
          )}
        </div>

        {/* Summary / Ranking table */}
        {proposalsLoading ? (
          <div className="text-sm text-gray-500">Loading proposals...</div>
        ) : proposalsError ? (
          <div className="text-sm text-red-600">Error: {proposalsError}</div>
        ) : proposals.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            No proposals received yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 border text-center w-16">Rank</th>
                  <th className="p-2 border text-left">Supplier</th>
                  <th className="p-2 border">Country</th>
                  <th className="p-2 border text-right">Total quote</th>
                  <th className="p-2 border text-center">Submitted</th>
                  <th className="p-2 border text-center">Line items</th>
                  <th className="p-2 border text-center">Attachments</th>
                  <th className="p-2 border text-center">Award</th>
                </tr>
              </thead>
              <tbody>
                {sortedProposals.map((p: any, index: number) => {
                  const isBest =
                    hasAnyTotal && typeof p.total_price === "number" && index === 0;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 ${
                        isBest ? "bg-emerald-50/70" : ""
                      }`}
                    >
                      <td className="p-3 border text-center">
                        {hasAnyTotal ? (
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                              isBest
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 border font-medium text-gray-800">
                        {p.supplier?.company_name || "-"}
                      </td>
                      <td className="p-3 border text-center">
                        {p.supplier?.country || "-"}
                      </td>
                      <td className="p-3 border text-right font-semibold">
                        {typeof p.total_price === "number" && !isNaN(p.total_price) ? (
                          <span
                            className={
                              isBest ? "text-emerald-700 font-bold" : "text-gray-800"
                            }
                          >
                            ${p.total_price.toLocaleString()}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 border text-center text-gray-600">
                        {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : "—"}
                      </td>
                      <td className="p-3 border text-center">
                        {p.line_items?.length || 0} items
                      </td>
                      <td className="p-3 border text-center">
                        {p.attachments?.length ? (
                          <a
                            href={p.attachments[0].file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            {p.attachments.length} file(s)
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      
                      <td className="p-3 border text-center">
  {rfq.status === "awarded" ? (
    // 🏆 Already awarded - show WINNER badge for the awarded supplier and hide others
    p.supplier_id === rfq.awarded_supplier_id ? (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-emerald-600 text-white font-semibold shadow-sm">
        <Trophy className="w-3 h-3" />
        AWARDED
      </span>
    ) : (
      <span className="text-gray-400 text-xs">—</span>
    )
  ) : (
    // 🟢 Not awarded yet — show Award button
    <button
      onClick={() => handleAwardClick(p)}
      disabled={awardLoadingId === p.id}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs ${
        timeStatus === "UPCOMING"
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : isBest
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      } disabled:opacity-60`}
    >
      {awardLoadingId === p.id ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Trophy className="w-3 h-3" />
      )}
      Award
    </button>
  )}
</td>


                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Line item comparison grid */}
        {showComparison && proposals.length > 0 && rfq.rfq_items?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Line item comparison (best unit price highlighted per row)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-[950px] w-full text-xs border border-gray-200 rounded-lg">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-2 border text-left w-64">Item</th>
                    <th className="p-2 border text-center w-16">Qty</th>
                    <th className="p-2 border text-center w-16">UOM</th>
                    {supplierColumns.map((col) => (
                      <th key={col.id} className="p-2 border text-center">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rfq.rfq_items.map((item: any) => {
                    const prices = supplierColumns.map((col) => {
                      const supPrices = lineItemIndex[item.id] || {};
                      return supPrices[col.id];
                    });
                    const numericPrices = prices.filter(
                      (v) => typeof v === "number" && !isNaN(v as number)
                    ) as number[];
                    const minPrice =
                      numericPrices.length > 0
                        ? Math.min(...numericPrices)
                        : null;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-2 border align-top">
                          <div className="font-medium text-gray-800">
                            {item.description}
                          </div>
                        </td>
                        <td className="p-2 border text-center align-top">
                          {item.qty}
                        </td>
                        <td className="p-2 border text-center align-top">
                          {item.uom}
                        </td>
                        {supplierColumns.map((col) => {
                          const supPrices = lineItemIndex[item.id] || {};
                          const price = supPrices[col.id];
                          const isBest =
                            minPrice !== null &&
                            typeof price === "number" &&
                            price === minPrice;

                          return (
                            <td
                              key={col.id}
                              className={`p-2 border text-right align-top ${
                                isBest
                                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                                  : "text-gray-800"
                              }`}
                            >
                              {typeof price === "number" && !isNaN(price)
                                ? price.toLocaleString()
                                : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[400px] p-6 text-center">
            <h3 className="text-lg font-semibold mb-3">
              {confirmAction === "publish" ? "Publish RFQ" : "Convert RFQ to Auction"}
            </h3>
            <p className="text-gray-600 text-sm mb-5">
              {confirmAction === "publish"
                ? "Are you sure you want to publish this RFQ?"
                : "Are you sure you want to convert this RFQ into an Auction?"}
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmAction)}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
