"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ClipboardList, Clock, Users } from "lucide-react";

type OpportunityRow = {
  id: string;
  title: string;
  summary: string | null;
  visibility: string;
  status: string;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
  buyer_name: string | null;
  proposal_status: string;
  proposal_submitted_at: string | null;
};

type TimerInfo = {
  label: string;
  isPast: boolean;
};

export default function SupplierOpportunitiesPage() {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  // Live ticking timer every 1 second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Step 1: resolve supplierId from auth > profile > supplier_contacts
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

  // Step 2: load opportunities for this supplier
  useEffect(() => {
    if (!supplierId) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/supplier/opportunities?supplier_id=${supplierId}`
        );
        const json = await res.json();
        if (json.success) {
          setRows(json.rfqs || []);
        } else {
          console.error("Error:", json.error);
        }
      } catch (err) {
        console.error("Error loading opportunities:", err);
      }
      setLoading(false);
    };

    load();
  }, [supplierId]);

  const formatDateTime = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  const visibilityPill = (v: string) => {
    if (v === "public") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
          Public
        </span>
      );
    }
    if (v === "invited") {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
          Invited
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs bg-gray-500/15 text-gray-300 border border-gray-500/20">
        {v}
      </span>
    );
  };

  const buyerLabel = (buyerName: string | null) => {
    if (!buyerName) return "-";
    return buyerName;
  };

  // Countdown timer formatter
  const computeTimer = (end_at: string | null, now: Date): TimerInfo => {
    if (!end_at) return { label: "-", isPast: false };

    const end = new Date(end_at);
    if (Number.isNaN(end.getTime())) return { label: "-", isPast: false };

    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return { label: "Closed", isPast: true };

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    const label = `${days.toString().padStart(2, "0")}d : ${hours
      .toString()
      .padStart(2, "0")}h : ${minutes.toString().padStart(2, "0")}m : ${seconds
      .toString()
      .padStart(2, "0")}s`;

    return { label, isPast: false };
  };

  const actionLabel = (r: OpportunityRow, timer: TimerInfo) => {
    if (timer.isPast) return "View details";
    if (r.proposal_status === "Not submitted") return "Submit proposal";
    return "View proposal";
  };

  const publicRows = rows.filter((r) => r.visibility === "public");
  const invitedRows = rows.filter((r) => r.visibility === "invited");

  const renderTable = (data: OpportunityRow[]) => {
    if (!data.length) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
          <ClipboardList className="mb-3 h-8 w-8 text-gray-500" />
          <p>No opportunities in this section.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-800/70 bg-slate-950/30 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-800/80 bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-3 pl-4 pr-2 text-left">Name</th>
              <th className="px-2 py-3 text-left">Buyer</th>
              <th className="px-2 py-3 text-left">Start</th>
              <th className="px-2 py-3 text-left">End</th>
              <th className="px-2 py-3 text-left">Time left</th>
              <th className="px-2 py-3 text-left">Proposal status</th>
              <th className="py-3 pr-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const timer = computeTimer(r.end_at, now);
              const isDisabled = timer.isPast;

              return (
                <tr
                  key={r.id}
                  className="border-b border-slate-800/50 bg-gradient-to-r from-slate-950/40 via-slate-950/10 to-slate-950/40 hover:from-indigo-900/20 hover:via-slate-900/40 hover:to-slate-950/60 transition-colors"
                >
                  <td className="py-3 pl-4 pr-2 align-middle">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-slate-50">
                        {r.title}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {formatDateTime(r.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {visibilityPill(r.visibility)}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-3 align-middle text-slate-200">
                    {buyerLabel(r.buyer_name)}
                  </td>

                  <td className="px-2 py-3 align-middle text-slate-200">
                    {formatDateTime(r.start_at)}
                  </td>

                  <td className="px-2 py-3 align-middle text-slate-200">
                    {formatDateTime(r.end_at)}
                  </td>

                  {/* Timer Pill */}
                  <td className="px-2 py-3 align-middle">
                    <span
                      className={
                        timer.isPast
                          ? "inline-flex rounded-full bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30"
                          : "inline-flex rounded-full bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-300 border border-emerald-600/30 animate-pulse-slow"
                      }
                    >
                      {timer.label}
                    </span>
                  </td>

                  <td className="px-2 py-3 align-middle text-sm">
                    <span
                      className={
                        r.proposal_status === "Not submitted"
                          ? "text-slate-400"
                          : "text-emerald-300"
                      }
                    >
                      {r.proposal_status}
                    </span>
                  </td>

                  <td className="py-3 pr-4 align-middle text-right">
                    <a
                      href={`/supplier/opportunities/${r.id}`}
                      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        isDisabled
                          ? "cursor-not-allowed bg-slate-800/70 text-slate-500"
                          : "bg-indigo-600 text-slate-50 hover:bg-indigo-500 shadow-sm shadow-indigo-500/40"
                      }`}
                      aria-disabled={isDisabled}
                      onClick={(e) => {
                        if (isDisabled) e.preventDefault();
                      }}
                    >
                      {actionLabel(r, timer)}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex justify-center items-center py-20 text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading opportunities...
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900/60 to-slate-950 p-10 text-center shadow-xl shadow-slate-900/80">
          <ClipboardList size={40} className="mx-auto mb-4 text-slate-500" />
          <h2 className="mb-1 text-lg font-semibold text-slate-50">
            No opportunities available
          </h2>
          <p className="text-sm text-slate-400">
            You&apos;ll see RFQs here whenever there are public events or you
            are invited to participate.
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Public opportunities
                </h2>
                <p className="text-xs text-slate-400">
                  Open RFQs visible to all eligible suppliers.
                </p>
              </div>
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                {publicRows.length} public RFQ
                {publicRows.length === 1 ? "" : "s"}
              </div>
            </div>
            {renderTable(publicRows)}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Invited opportunities
                </h2>
                <p className="text-xs text-slate-400">
                  RFQs where your organisation has been specifically invited.
                </p>
              </div>
              <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-medium text-indigo-200">
                {invitedRows.length} invited RFQ
                {invitedRows.length === 1 ? "" : "s"}
              </div>
            </div>
            {renderTable(invitedRows)}
          </div>
        </>
      )}
    </div>
  );
}
