// /app/admin/awards/new/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  FileText,
} from "lucide-react";

type Auction = {
  id: string;
  rfq_id: string | null;
  currency: string;
  status: string;
  config: any;
  start_at?: string;
  end_at?: string;
};

type LeaderboardRow = {
  bid_id?: string; // if your leaderboard API returns bid_id
  rank: number;
  supplier_id: string;
  supplier_name: string;
  total: number;
  items?: any[];
  expanded?: boolean;
};

type AuditEvent = {
  id: string;
  action: string;
  created_at: string;
  actor_profile_id: string | null;
  payload: any;
};

export default function NewAwardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auctionId = searchParams.get("auction_id");

  const [auction, setAuction] = useState<Auction | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null
  );
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // TODO: wire this from your auth context
  const awardedByProfileId = ""; // put profile_id from AuthProvider / session

  // ---------------- LOAD AUCTION SUMMARY + LEADERBOARD + AUDITS ----------------
  useEffect(() => {
    if (!auctionId) return;

    const loadAll = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Auction summary
        const auctionRes = await fetch(`/api/auctions?id=${auctionId}`);
        const auctionJson = await auctionRes.json();
        if (!auctionJson.success || !auctionJson.auction) {
          throw new Error("Unable to load auction details");
        }
        setAuction(auctionJson.auction);

        // 2) Leaderboard
        const lbRes = await fetch(
          `/api/bids/leaderboard?auction_id=${auctionId}`
        );
        const lbJson = await lbRes.json();
        if (lbJson.success) {
          const rows: LeaderboardRow[] = (lbJson.leaderboard || []).map(
            (t: any, idx: number) => ({
              rank: idx + 1,
              supplier_id: t.supplier_id,
              supplier_name: t.supplier_name,
              total: t.total,
              bid_id: t.bid_id, // if your API sends it
              expanded: false,
              items: [],
            })
          );
          setLeaderboard(rows);

          // default selection to Rank #1
          if (rows.length > 0) {
            setSelectedSupplierId(rows[0].supplier_id);
            if (rows[0].bid_id) setSelectedBidId(rows[0].bid_id);
          }
        }

        // 3) Audit events (optional but recommended)
        const auditRes = await fetch(
          `/api/audit-log?resource_type=auction&resource_id=${auctionId}`
        );
        const auditJson = await auditRes.json();
        if (auditJson.success) {
          setAuditEvents(auditJson.events || []);
        }
      } catch (err: any) {
        console.error("NewAward load error:", err?.message || err);
        setError(err?.message || "Failed to load details");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [auctionId]);

  // ---------------- LOAD ITEM DETAILS FOR A SUPPLIER ----------------
  const loadItemsForSupplier = async (supplierId: string) => {
    if (!auctionId) return;

    try {
      const res = await fetch(
        `/api/bids/items?auction_id=${auctionId}&supplier_id=${supplierId}`
      );
      const json = await res.json();
      if (json.success) {
        setLeaderboard((prev) =>
          prev.map((row) =>
            row.supplier_id === supplierId
              ? { ...row, items: json.items || [] }
              : row
          )
        );
      }
    } catch (err) {
      console.error("Error loading item details:", err);
    }
  };

  const currency = auction?.currency || "";

  const selectedSupplierRow = useMemo(
    () => leaderboard.find((l) => l.supplier_id === selectedSupplierId),
    [leaderboard, selectedSupplierId]
  );

  // ---------------- SUBMIT AWARD ----------------
  const handleSubmit = async () => {
    if (!auctionId || !selectedSupplierId) {
      setError("Please select a supplier to award");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auction_id: auctionId,
          supplier_id: selectedSupplierId,
          winning_bid_id: selectedBidId, // if you have it
          award_summary: notes,
          awarded_by_profile_id: awardedByProfileId || null,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to create award");
      }

      setSuccessMsg("Award created successfully");
      // redirect to Awards listing after short delay
      setTimeout(() => {
        router.push("/admin/awards");
      }, 1000);
    } catch (err: any) {
      console.error("Award submit error:", err?.message || err);
      setError(err?.message || "Failed to create award");
    } finally {
      setSubmitting(false);
    }
  };

  if (!auctionId) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">
          Missing auction_id in query string.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600">Loading award details...</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">
          Auction not found. Please go back and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-xl font-semibold text-gray-800">
            Issue Award – {auction.config?.title || "Auction"}
          </h1>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Layout: Summary + Award details + Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Auction Summary + Audit */}
        <div className="space-y-4 lg:col-span-1">
          {/* Auction summary */}
          <div className="bg-white rounded-xl shadow border border-blue-100 p-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-700">
                Auction summary
              </h2>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                Status: {auction.status}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              <b>Currency:</b> {auction.currency}
            </p>
            <p className="text-xs text-gray-600">
              <b>Start:</b>{" "}
              {auction.start_at
                ? new Date(auction.start_at).toLocaleString()
                : "N/A"}
            </p>
            <p className="text-xs text-gray-600">
              <b>End:</b>{" "}
              {auction.end_at
                ? new Date(auction.end_at).toLocaleString()
                : "N/A"}
            </p>
            {auction.rfq_id && (
              <p className="text-xs text-gray-600">
                <b>Linked RFQ:</b> {auction.rfq_id.slice(0, 8)}...
              </p>
            )}
          </div>

          {/* Audit log */}
          <div className="bg-white rounded-xl shadow border border-blue-100 p-4 max-h-[320px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <Info size={16} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                Audit log (auction)
              </h2>
            </div>
            {auditEvents.length === 0 ? (
              <p className="text-xs text-gray-500">No audit events found.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {auditEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="border-b border-gray-100 pb-1 last:border-0"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        {ev.action}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                    {ev.payload && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {JSON.stringify(ev.payload)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT: Leaderboard + award form */}
        <div className="space-y-4 lg:col-span-2">
          {/* Leaderboard + comparison */}
          <div className="bg-white rounded-xl shadow border border-blue-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Supplier leaderboard & price comparison
              </h2>
              <span className="text-[11px] text-gray-500">
                Select the supplier you want to award
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs text-gray-500">No bids were submitted.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-blue-50 text-gray-700">
                  <tr>
                    <th className="p-2 text-left">Rank</th>
                    <th className="p-2 text-left">Supplier</th>
                    <th className="p-2 text-right">Total bid ({currency})</th>
                    <th className="p-2 text-center">Select</th>
                    <th className="p-2 text-center">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((l, idx) => {
                    const key = `${l.supplier_id}_${idx}`;
                    const isSelected = l.supplier_id === selectedSupplierId;

                    return (
                      <>
                        <tr
                          key={key}
                          className={`border-b ${
                            isSelected ? "bg-blue-50" : "bg-white"
                          }`}
                        >
                          <td className="p-2 font-semibold text-gray-800">
                            {l.rank}
                          </td>
                          <td className="p-2 font-medium text-gray-800">
                            {l.supplier_name || "N/A"}
                          </td>
                          <td className="p-2 text-right font-semibold text-blue-700">
                            {l.total?.toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="radio"
                              name="selectedSupplier"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedSupplierId(l.supplier_id);
                                if (l.bid_id) setSelectedBidId(l.bid_id);
                              }}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              className="text-blue-600 hover:text-blue-800 text-[11px] font-medium"
                              onClick={() => {
                                if (!l.items || l.items.length === 0) {
                                  loadItemsForSupplier(l.supplier_id);
                                }
                                setLeaderboard((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? { ...x, expanded: !x.expanded }
                                      : x
                                  )
                                );
                              }}
                            >
                              {l.expanded ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>

                        {l.expanded && (l.items || []).length > 0 && (
                          <tr className="bg-white border-b" key={`${key}_items`}>
                            <td colSpan={5} className="p-3">
                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-[11px]">
                                  <thead className="bg-blue-100 text-gray-700">
                                    <tr>
                                      <th className="p-2 text-left">Item</th>
                                      <th className="p-2 text-center">Qty</th>
                                      <th className="p-2 text-center">
                                        Unit price ({currency})
                                      </th>
                                      <th className="p-2 text-center">
                                        Total ({currency})
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(l.items || []).map(
                                      (it: any, index: number) => (
                                        <tr
                                          key={`${key}_${index}`}
                                          className="border-t border-gray-100"
                                        >
                                          <td className="p-2 text-left">
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
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Award notes + submit */}
          <div className="bg-white rounded-xl shadow border border-blue-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={18} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                Award notes & justification
              </h2>
            </div>
            <p className="text-xs text-gray-500 mb-1">
              Capture a short justification for your award decision. This will
              be stored with the award and also referenced in audit logs.
            </p>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-xs min-h-[90px] focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Example: Awarded to Rank #1 supplier based on lowest total cost and compliance with technical specifications..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <Info size={14} className="text-gray-400" />
                A notification and audit entry will be created when you submit
                this award.
              </p>

              <button
                disabled={submitting || !selectedSupplierId}
                onClick={handleSubmit}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold ${
                  submitting || !selectedSupplierId
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                }`}
              >
                <CheckCircle size={16} />
                {submitting ? "Issuing award..." : "Issue award"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
