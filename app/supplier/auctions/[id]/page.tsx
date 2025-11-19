"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Loader2, FileDown, DollarSign, Trophy } from "lucide-react";

type AuctionItem = {
  id: string;
  description: string | null;
  qty: number | null;
  uom: string | null;
};

type AuctionFile = {
  filename: string;
  public_url: string | null;
};

type LeaderRow = {
  supplier_id: string;
  supplier_name: string;
  total: number;
  rank: number;
};

export default function SupplierAuctionRoomPage() {
  const router = useRouter();
  const params = useParams();
  const auctionId = params?.id as string;

  const [auction, setAuction] = useState<any>(null);
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [files, setFiles] = useState<AuctionFile[]>([]);
  const [loading, setLoading] = useState(true);

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [placingBid, setPlacingBid] = useState(false);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<string>("");

  const [myRank, setMyRank] = useState<number | null>(null);
  const [myTotal, setMyTotal] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);

  /* ============================================================
     1. Resolve profile_id and supplier_id from current user
  ============================================================ */
  useEffect(() => {
    const resolveIdentity = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.id) return;

      setProfileId(profile.id);

      const { data: supplierContact } = await supabase
        .from("supplier_contacts")
        .select("supplier_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (supplierContact?.supplier_id) {
        setSupplierId(supplierContact.supplier_id);
      }
    };

    resolveIdentity();
  }, [router]);

  /* ============================================================
     2. Load auction details
  ============================================================ */
  useEffect(() => {
    if (!auctionId) return;

    const loadAuction = async () => {
      try {
        const res = await fetch(`/api/auctions?id=${auctionId}`);
        const json = await res.json();
        if (!json.success) {
          console.error("Failed to load auction:", json.error);
          return;
        }

        const a = json.auction;
        setAuction(a);

        setItems(
          (a.auction_items || []).map((it: any) => ({
            id: it.id,
            description: it.description,
            qty: it.qty ? Number(it.qty) : null,
            uom: it.uom,
          }))
        );

        setFiles(a.files || []);
      } catch (err) {
        console.error("Error loading auction:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAuction();
  }, [auctionId]);

  /* ============================================================
     3. Fetch rank / totals / my lines via /api/bids
  ============================================================ */
  const fetchBidStatus = async () => {
    if (!supplierId || !auctionId) return;

    try {
      const res = await fetch(
        `/api/bids?auction_id=${auctionId}&supplier_id=${supplierId}`
      );
      const json = await res.json();
      if (!json.success) {
        console.warn("bids GET error:", json.error);
        return;
      }

      setMyRank(json.myRank ?? null);
      setMyTotal(json.myTotal ?? null);
      setLeaderboard(json.leaderboard || []);

      // Pre-fill inputs with my latest bids if available
      const myLines = json.myLines || {};
      const newInputs: Record<string, string> = { ...inputs };

      Object.entries(myLines).forEach(([itemId, val]: any) => {
        newInputs[itemId] = String(val.amount ?? "");
      });

      setInputs(newInputs);
    } catch (err) {
      console.error("fetchBidStatus error:", err);
    }
  };

  useEffect(() => {
    if (!supplierId || !auctionId) return;

    // initial load
    fetchBidStatus();

    // realtime via supabase channel
    const channel = supabase
      .channel(`auction_${auctionId}_bids_room`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${auctionId}`,
        },
        () => {
          fetchBidStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, auctionId]);

  /* ============================================================
     4. Countdown timer
  ============================================================ */
  useEffect(() => {
    if (!auction?.end_at) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const end = new Date(auction.end_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Closed");
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [auction?.end_at]);

  /* ============================================================
     5. Submit all bids via /api/bids (POST)
  ============================================================ */
  const submitAll = async () => {
    if (!supplierId || !profileId || !auction) {
      alert("Unable to resolve supplier; please re-login.");
      return;
    }

    const sealed =
      auction.auction_type === "sealed_reverse" &&
      myTotal !== null &&
      myTotal !== undefined;

    if (sealed) {
      alert("You have already submitted your sealed bid.");
      return;
    }

    const missing = items.some((i) => !inputs[i.id]);
    if (missing) {
      alert("Please enter bid for all line items.");
      return;
    }

    setPlacingBid(true);
    try {
      const lines = items.map((i) => ({
        auction_item_id: i.id,
        amount: Number(inputs[i.id]),
      }));

      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auction_id: auctionId,
          supplier_id: supplierId,
          placed_by_profile_id: profileId,
          currency: auction.currency,
          lines,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Failed to submit bids.");
        return;
      }

      // Refresh rank / totals / sealed status
      await fetchBidStatus();
    } catch (err) {
      console.error("Error submitting bids:", err);
      alert("Error submitting bids.");
    } finally {
      setPlacingBid(false);
    }
  };

  /* ============================================================
     6. Derived flags & labels
  ============================================================ */
  if (loading || !auction) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-300">
        <Loader2 className="animate-spin mr-3" /> Loading auction room...
      </div>
    );
  }

  const isSealedAuction = auction.auction_type === "sealed_reverse";
  const sealedLocked = isSealedAuction && myTotal !== null && myTotal !== undefined;

  const visMode = auction.visibility_mode as
    | "open_lowest"
    | "rank_only"
    | "sealed"
    | string;

  const auctionTypeLabel =
    auction.auction_type === "sealed_reverse"
      ? "Sealed bid"
      : auction.auction_type === "ranked_reverse"
      ? "Ranked"
      : "Standard";

  const auctionTypeClass =
    auction.auction_type === "sealed_reverse"
      ? "bg-red-600/30 text-red-200 border border-red-500/50"
      : auction.auction_type === "ranked_reverse"
      ? "bg-purple-600/30 text-purple-200 border border-purple-500/50"
      : "bg-blue-600/30 text-blue-200 border border-blue-500/50";

  /* ============================================================
     7. UI
  ============================================================ */
  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">

      {/* LEFT PANEL */}
      <div className="w-full lg:w-1/3 space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-300 hover:text-white text-sm"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-5">
          {/* Title + pill in top-right */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">
                {auction.config?.title || "Auction"}
              </h1>
              <p className="text-sm text-gray-400 mt-2">
                {auction.config?.description ||
                  "Participate by submitting your best prices for each line item."}
              </p>
            </div>
            <span
              className={
                "inline-flex px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap " +
                auctionTypeClass
              }
            >
              {auctionTypeLabel}
            </span>
          </div>

          {/* Timer */}
          <div className="mt-3 text-red-400 font-semibold text-lg animate-pulse">
            ⏳ {timeLeft}
          </div>

          {/* Documents slider */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Documents & media</p>
            {files.length === 0 && (
              <p className="text-xs text-gray-500">No files attached.</p>
            )}
            {files.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {files.map((f, idx) => (
                  <div
                    key={`${f.filename}-${idx}`}
                    className="min-w-[80px] h-[80px] border border-gray-700 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={() => f.public_url && window.open(f.public_url, "_blank")}
                  >
                    {f.filename.toLowerCase().endsWith(".pdf") ? (
                      <FileDown className="text-red-400" size={32} />
                    ) : f.public_url ? (
                      <img
                        src={f.public_url}
                        alt={f.filename}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileDown className="text-gray-400" size={28} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rank / leader panel */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-3">
            {visMode === "sealed" && (
              <>
                <p className="text-sm text-gray-300">
                  Sealed-bid visibility
                </p>
                <p className="text-xs text-gray-400">
                  You will not see ranks or competitor information during this auction.
                  Your bid will be evaluated after closing.
                </p>
                {sealedLocked && (
                  <p className="text-xs text-green-400 mt-2">
                    Sealed bid submitted – waiting for auction close.
                  </p>
                )}
              </>
            )}

            {visMode === "rank_only" && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={20} className="text-yellow-400" />
                    <span className="text-sm text-gray-200">Your Rank</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {myRank ? `#${myRank}` : "-"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>Your total bid</span>
                  <span className="font-mono">
                    {myTotal != null ? `₹ ${myTotal.toFixed(2)}` : "-"}
                  </span>
                </div>
              </>
            )}

            {visMode === "open_lowest" && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy size={20} className="text-yellow-400" />
                    <span className="text-sm text-gray-200">
                      Leaderboard (lowest total)
                    </span>
                  </div>
                  <span className="text-xs text-gray-300">
                    Your rank:{" "}
                    <strong>{myRank ? `#${myRank}` : "-"}</strong>
                  </span>
                </div>

                {leaderboard.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No bids yet. Be the first to submit.
                  </p>
                )}

                {leaderboard.length > 0 && (
                  <div className="space-y-1 text-xs">
                    {leaderboard.map((row) => (
                      <div
                        key={row.supplier_id}
                        className={`flex justify-between items-center px-3 py-1 rounded-md ${
                          row.supplier_id === supplierId
                            ? "bg-indigo-600/30 border border-indigo-500/50"
                            : "bg-gray-900/50 border border-gray-800"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">#{row.rank}</span>
                          <span className="text-gray-100">
                            {row.supplier_id === supplierId ? "You" : row.supplier_name}
                          </span>
                        </span>
                        <span className="font-mono">
                          ₹ {row.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - BID GRID */}
      <div className="flex-1 bg-gray-900/70 border border-gray-800 rounded-2xl p-6 flex flex-col">
        <h2 className="text-lg font-semibold mb-5">Enter your bids</h2>

        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-950/80 text-[11px] text-gray-400 px-3 py-2 border-b border-gray-800">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Item</div>
            <div className="col-span-2 text-right">Qty / UOM</div>
            <div className="col-span-3 text-right">Your Unit Price</div>
          </div>

          {items.map((item, idx) => (
            <div
              key={item.id}
              className="grid grid-cols-12 items-center px-3 py-2 text-xs border-b border-gray-800/60 last:border-0"
            >
              <div className="col-span-1 text-gray-400">#{idx + 1}</div>
              <div className="col-span-6 text-gray-100 pr-2">
                {item.description}
              </div>
              <div className="col-span-2 text-right text-gray-300">
                {item.qty ?? 0}{" "}
                <span className="text-gray-500">{item.uom || ""}</span>
              </div>
              <div className="col-span-3 flex justify-end">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-24 bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    placeholder="0.00"
                    disabled={
                      placingBid ||
                      sealedLocked ||
                      !supplierId ||
                      !profileId
                    }
                    value={inputs[item.id] || ""}
                    onChange={(e) =>
                      setInputs((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SUBMIT CTA */}
        {!sealedLocked && (
          <button
            disabled={placingBid || !supplierId || !profileId}
            onClick={submitAll}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {placingBid && <Loader2 size={16} className="animate-spin" />}
            <DollarSign size={16} />
            {placingBid ? "Submitting..." : "Submit final bid"}
          </button>
        )}

        {sealedLocked && (
          <div className="mt-4 text-xs text-green-400 text-center">
            Your sealed bid has been submitted. Inputs are locked until auction closes.
          </div>
        )}
      </div>

      {/* FLOATING SUMMARY BAR */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/70 border border-gray-700 rounded-full px-6 py-2 flex items-center gap-8 text-xs text-gray-200 shadow-lg backdrop-blur">
        <span>
          Rank:{" "}
          <span className="font-semibold text-white">
            {visMode === "sealed" ? "-" : myRank ?? "-"}
          </span>
        </span>
        <span>
          Total Bid:{" "}
          <span className="font-semibold text-white">
            {myTotal != null ? `₹ ${myTotal.toFixed(2)}` : "-"}
          </span>
        </span>
        <span className="text-red-400 font-semibold">
          ⏳ {timeLeft}
        </span>
      </div>
    </div>
  );
}
