"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Hash, BadgeDollarSign, ArrowRight } from "lucide-react";

type AuctionRow = {
  id: string;
  title: string;
  auction_type: string;
  visibility_mode: string;
  access_type: string; // open | invited
  start_at: string | null;
  end_at: string | null;
  currency: string;
  bid_attempts: number;
  supplier_count: number;
  last_bid_time: string | null;
  best_bid: number | null;
  rank_position: number | null;
  rank_total: number;
};

type TimerInfo = { label: string; isPast: boolean };

export default function SupplierAuctionsPage() {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  // Timer tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Supplier resolution
  useEffect(() => {
    const init = async () => {
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

      if (contact?.supplier_id) setSupplierId(contact.supplier_id);
    };

    init();
  }, []);

  // Load auctions
  useEffect(() => {
    if (!supplierId) return;
    const loadAuctions = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/supplier/auctions?supplier_id=${supplierId}`);
        const j = await r.json();
        if (j.success) setAuctions(j.auctions);
      } catch (err) {
        console.error("Error loading auctions:", err);
      }
      setLoading(false);
    };
    loadAuctions();
  }, [supplierId]);

  // Helpers
  const formatDate = (v: string | null) =>
    v ? new Date(v).toLocaleDateString() : "-";

  const formatTime = (v: string | null) =>
    v ? new Date(v).toLocaleTimeString() : "-";

  const computeTimer = (end_at: string | null, now: Date): TimerInfo => {
    if (!end_at) return { label: "-", isPast: false };

    const end = new Date(end_at);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return { label: "Closed", isPast: true };

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      label: `${days}d : ${hours}h : ${minutes}m : ${seconds}s`,
      isPast: false,
    };
  };

  const formatAuctionType = (type: string) => {
    if (type === "standard_reverse")
      return (
        <span className="px-3 py-1 rounded-full text-xs bg-blue-600/30 text-blue-300">
          Standard
        </span>
      );
    if (type === "ranked_reverse")
      return (
        <span className="px-3 py-1 rounded-full text-xs bg-purple-600/30 text-purple-300">
          Ranked
        </span>
      );
    return (
      <span className="px-3 py-1 rounded-full text-xs bg-red-600/30 text-red-300">
        Sealed
      </span>
    );
  };

  const bidStatusCol = (a: AuctionRow) => {
    if (a.auction_type === "standard_reverse") {
      if (a.best_bid == null) return "—";
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
          <BadgeDollarSign size={14} /> Best Bid: {a.currency}{" "}
          {a.best_bid.toLocaleString()}
        </span>
      );
    }

    if (a.auction_type === "ranked_reverse") {
      if (!a.rank_position) return "—";
      return (
        <span className="inline-flex items-center gap-1 text-purple-300 font-semibold">
          <Hash size={14} /> You are #{a.rank_position} / {a.rank_total}
        </span>
      );
    }

    return <span className="text-red-400 font-semibold">Sealed</span>;
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex justify-center items-center py-20 text-gray-400">
          <Loader2 className="animate-spin mr-2" /> Loading auctions...
        </div>
      )}

      {!loading && auctions.length === 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-10 text-center">
          <p className="text-gray-300 font-medium mb-1">No Auctions Available</p>
          <p className="text-gray-500 text-sm">
            Auctions will appear once you are eligible or invited.
          </p>
        </div>
      )}

      {!loading && auctions.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="text-gray-400 text-[11px] font-semibold border-b border-gray-800">
              <tr>
                <th className="py-2 pl-3 text-left w-[32%]">Auction</th>
                <th className="py-2 text-left w-[12%]">Format</th>
                <th className="py-2 text-left w-[12%]">Start</th>
                <th className="py-2 text-left w-[12%]">End</th>
                <th className="py-2 text-left w-[14%]">Ends In</th>
                <th className="py-2 text-left w-[14%]">Bid Status</th>
                <th className="py-2 text-center w-[8%]">Bids</th>
                <th className="py-2 pr-3 text-right w-[10%]">Action</th>
              </tr>
            </thead>

            <tbody>
              {auctions.map((a) => {
                const timer = computeTimer(a.end_at, now);
                const closed = timer.label === "Closed";

                return (
                  <tr
                    key={a.id}
                    className="border-b border-gray-800/60 hover:bg-gray-900/70 transition"
                  >
                    <td className="py-3 pl-3 pr-2 align-top">
                      <div className="flex flex-col gap-1 leading-tight">
                        <span className="font-medium text-slate-100 line-clamp-2 break-words">
                          {a.title}
                        </span>

                        <span
                          className={`text-[11px] ${
                            a.access_type === "open"
                              ? "text-emerald-300"
                              : "text-indigo-300"
                          }`}
                        >
                          {a.access_type === "open"
                            ? "Open Auction"
                            : "Invited Auction"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 align-middle">{formatAuctionType(a.auction_type)}</td>

                    <td className="py-3 align-middle text-gray-200">
                      <div className="flex flex-col leading-tight">
                        <span>{formatDate(a.start_at)}</span>
                        <span className="text-[11px] text-gray-400">{formatTime(a.start_at)}</span>
                      </div>
                    </td>

                    <td className="py-3 align-middle text-gray-200">
                      <div className="flex flex-col leading-tight">
                        <span>{formatDate(a.end_at)}</span>
                        <span className="text-[11px] text-gray-400">{formatTime(a.end_at)}</span>
                      </div>
                    </td>

                    <td className="py-3 align-middle">
                      <span
                        className={
                          closed
                            ? "inline-flex rounded-full bg-rose-600/20 px-2 py-1 text-[11px] font-semibold text-rose-300 border border-rose-600/40"
                            : "inline-flex rounded-full bg-emerald-600/20 px-2 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-600/40"
                        }
                      >
                        {timer.label}
                      </span>
                    </td>

                    <td className="py-3 align-middle">{bidStatusCol(a)}</td>

                    <td className="py-3 align-middle text-center">
                      <span className="text-indigo-400 font-semibold">
                        {a.bid_attempts}
                      </span>
                      <span className="text-gray-400"> ({a.supplier_count})</span>
                    </td>

                    <td className="py-3 pr-3 align-middle text-right">
                      <a
                        href={`/supplier/auctions/${a.id}`}
                        className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-[11px] font-semibold ${
                          closed
                            ? "cursor-not-allowed bg-slate-800/70 text-slate-500"
                            : "bg-indigo-600 hover:bg-indigo-500 text-slate-50"
                        }`}
                      >
                        Enter Room <ArrowRight size={14} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
