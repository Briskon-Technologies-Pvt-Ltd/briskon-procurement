"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

type ProposalRow = {
  proposal_id: string;
  rfq_id: string;
  title: string;
  summary: string;
  visibility: string;
  rfq_status: string;
  proposal_status: string;
  total_price: number;
  currency: string;
  submitted_at: string;
};

export default function SupplierProposalsPage() {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------------
  // Load Supplier ID
  // ------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
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

      const { data: supplierMap } = await supabase
        .from("supplier_contacts")
        .select("supplier_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (!supplierMap?.supplier_id) return;

      setSupplierId(supplierMap.supplier_id);
    };

    load();
  }, []);

  // ------------------------------------------------------------
  // Load Proposals once supplier_id available
  // ------------------------------------------------------------
  useEffect(() => {
    if (!supplierId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/supplier/proposals?supplier_id=${supplierId}`);
        const json = await res.json();
        if (json.success) {
          setProposals(json.proposals || []);
        }
      } catch (err) {
        console.error("Error loading proposals:", err);
      }
      setLoading(false);
    };

    loadData();
  }, [supplierId]);

  // ------------------------------------------------------------
  // KPI counts
  // ------------------------------------------------------------
  const countByStatus = (st: string) =>
    proposals.filter((p) => p.proposal_status === st).length;

  const kpi = {
    total: proposals.length,
    underReview: countByStatus("under_review"),
    shortlisted: countByStatus("shortlisted"),
    awarded: countByStatus("awarded"),
  };

  // Status pill color helper
  const pillColor = (s: string) => {
    switch (s) {
      case "submitted":
        return "bg-indigo-500/20 text-indigo-300";
      case "under_review":
        return "bg-yellow-500/20 text-yellow-400";
      case "shortlisted":
        return "bg-blue-500/20 text-blue-400";
      case "awarded":
        return "bg-green-500/20 text-green-400";
      case "rejected":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-600/20 text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
        <p className="text-gray-400 text-sm mt-1">
          View submitted responses & track evaluation progress.
        </p>
      </div>

      {/* KPI BAR */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{kpi.total}</div>
          <p className="text-sm text-gray-400 mt-1">Total Submitted</p>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{kpi.underReview}</div>
          <p className="text-sm text-gray-400 mt-1">Under Review</p>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{kpi.shortlisted}</div>
          <p className="text-sm text-gray-400 mt-1">Shortlisted</p>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{kpi.awarded}</div>
          <p className="text-sm text-gray-400 mt-1">Awarded</p>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-3" />
          Loading proposals...
        </div>
      )}

      {/* EMPTY */}
      {!loading && proposals.length === 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-10 text-center">
          <h2 className="text-lg font-semibold mb-1">No Proposals Found</h2>
          <p className="text-sm text-gray-400">
            Submit a proposal from the Opportunities page to see them listed here.
          </p>
        </div>
      )}

      {/* TABLE */}
      {!loading && proposals.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
          <table className="w-full text-sm">
            <thead className="text-gray-400 text-xs uppercase border-b border-gray-800">
              <tr>
                <th className="py-3 text-left">RFQ</th>
                <th className="py-3">Submitted</th>
                <th className="py-3">Total Value</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {proposals.map((p) => (
                <tr
                  key={p.proposal_id}
                  className="border-b border-gray-800/60 hover:bg-gray-900/80 transition"
                >
                  <td className="py-3">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-400">{p.summary}</div>
                  </td>

                  <td className="py-3 text-center text-gray-300 text-xs">
                    {new Date(p.submitted_at).toLocaleString()}
                  </td>

                  <td className="py-3 text-center text-gray-300">
                    {p.currency} {p.total_price.toLocaleString()}
                  </td>

                  <td className="py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${pillColor(p.proposal_status)}`}>
                      {p.proposal_status.replace("_", " ")}
                    </span>
                  </td>

                  <td className="py-3 text-right">
                    <Link
                      href={`/supplier/opportunities/${p.rfq_id}`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold transition"
                    >
                      View / Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
