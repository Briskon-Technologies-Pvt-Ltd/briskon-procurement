"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  XCircle,
  CheckCircle,
} from "lucide-react";

export default function AwardDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [award, setAward] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // -------- LOAD AWARD --------
  const loadAward = async () => {
    try {
      const res = await fetch(`/api/awards?id=${id}`);
      const json = await res.json();

      if (!json.success || !json.award) {
        setNotFound(true);
        return;
      }
      setAward(json.award);
    } catch (err) {
      console.error("Award fetch error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAward();
  }, [id]);

  // -------- CANCEL AWARD --------
  const cancelAward = async () => {
    if (!confirm("Are you sure you want to cancel this award?")) return;

    await fetch("/api/awards/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ award_id: id, status: "cancelled" }),
    });

    loadAward();
  };

  // -------- CREATE PURCHASE ORDER --------
  const createPO = async () => {
    if (!confirm("Create Purchase Order and mark award completed?")) return;

    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ award_id: id }),
    });

    const json = await res.json();

    if (json.success) {
      alert(`PO Created Successfully. PO Number: ${json.po_number}`);
      router.push(`/admin/purchase-orders/${json.po_id}`);
    } else {
      alert(json.error || "Something went wrong while creating PO");
    }
  };

  // -------- VIEW PURCHASE ORDER (for completed awards) --------
  const viewPO = async () => {
    const res = await fetch(`/api/purchase-orders?award_id=${id}`);
    const json = await res.json();

    if (json.success && json.po?.id) {
      router.push(`/admin/purchase-orders/${json.po.id}`);
    } else {
      alert("Purchase Order not found for this award.");
    }
  };

  const navigateBack = () => router.push("/admin/awards");

  // -------- UI STATES --------
  if (loading) return <div className="text-center mt-10">Loading Award...</div>;
  if (notFound)
    return (
      <div className="text-center mt-10 text-red-600 text-lg">
        Award not found.
      </div>
    );
  if (!award) return null;

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={navigateBack}
          className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
        >
          <ArrowLeft size={16} /> Back to Awards
        </button>
      </div>

      {/* Header */}
      <h1 className="text-2xl font-semibold text-[#012b73] mb-2">
        Award Details
      </h1>
      <p className="text-gray-500 mb-6">Award ID: {award.id}</p>

      {/* Status & Buttons */}
      <div className="flex items-center gap-4 mb-6">
        <span
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            award.status === "completed"
              ? "bg-green-100 text-green-700"
              : award.status === "cancelled"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {award.status}
        </span>

        {award.status === "issued" && (
          <>
            <button
              onClick={createPO}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <FileText size={16} /> Create Purchase Order
            </button>

            <button
              onClick={cancelAward}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <XCircle size={16} /> Cancel Award
            </button>
          </>
        )}

        {award.status === "completed" && (
          <button
            onClick={viewPO}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            <CheckCircle size={16} /> View PO
          </button>
        )}
      </div>

      {/* Supplier Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow border p-5">
          <h3 className="text-lg font-semibold text-[#012b73] mb-2">
            Supplier Details
          </h3>
          <p className="font-medium">{award.suppliers.company_name}</p>
          <p className="text-gray-600 text-sm mt-1">
            {award.suppliers.country}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow border p-5">
          <h3 className="text-lg font-semibold text-[#012b73] mb-2">
            Proposal Overview
          </h3>
          <p className="text-gray-700 font-medium">
            {award.rfqs.currency}{" "}
            {award.proposal?.total_price?.toLocaleString()}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Submitted:{" "}
            {award.proposal?.submitted_at
              ? new Date(award.proposal.submitted_at).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>

      {/* RFQ Title */}
      <div className="bg-white border shadow rounded-lg p-5 mb-6">
        <h3 className="text-lg font-semibold text-[#012b73] mb-2">
          RFQ Information
        </h3>
        <p className="font-medium">{award.rfqs.title}</p>
      </div>

      {/* Line items */}
      {award.proposal?.line_items?.length > 0 && (
        <div className="bg-white border shadow rounded-lg p-5">
          <h3 className="text-lg font-semibold text-[#012b73] mb-3">
            Line Item Breakdown
          </h3>
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 border">Description</th>
                <th className="p-2 border text-center">Qty</th>
                <th className="p-2 border text-center">UOM</th>
                <th className="p-2 border text-right">Unit Price</th>
                <th className="p-2 border text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {award.proposal.line_items.map((item: any, idx: number) => (
                <tr
                  key={`${item.rfq_item_id}-${idx}`}
                  className="hover:bg-gray-50"
                >
                  <td className="p-2 border">
                    {item.rfq_items?.description || "-"}
                  </td>
                  <td className="p-2 border text-center">
                    {item.rfq_items?.qty}
                  </td>
                  <td className="p-2 border text-center">
                    {item.rfq_items?.uom}
                  </td>
                  <td className="p-2 border text-right">
                    {item.unit_price?.toLocaleString()}
                  </td>
                  <td className="p-2 border text-right font-semibold">
                    {item.total?.toLocaleString()}
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
