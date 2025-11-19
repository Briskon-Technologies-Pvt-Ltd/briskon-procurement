"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Calendar,
  FileText,
  User,
  DollarSign,
  Edit3,
  Folder,
} from "lucide-react";
import { useAuth } from "../../../components/auth/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function RequisitionDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { profile } = useAuth();

  const [requisition, setRequisition] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ===================================================
  // LOAD REQUISITION + AUDIT TRAIL
  // ===================================================
  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [reqRes, logRes] = await Promise.all([
        fetch(`/api/requisitions?id=${id}`),
        fetch(`/api/audit-log?entity=requisition&entity_id=${id}`),
      ]);

      const reqJson = await reqRes.json();
      const logJson = await logRes.json();

      if (reqJson.success) setRequisition(reqJson.data);
      if (logJson.success) setAuditLogs(logJson.data || []);
    } catch (err) {
      console.error("Failed to load requisition:", err);
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // HANDLE APPROVE / REJECT
  // ===================================================
  async function handleAction(action: "approve" | "reject", reason?: string) {
    if (!profile) return alert("Profile not found. Please re-login.");

    const confirmMsg =
      action === "approve"
        ? "Approve this requisition?"
        : "Reject this requisition?";
    if (!confirm(confirmMsg)) return;

    let comments = reason || "";
    if (action === "reject" && !comments) {
      comments = prompt("Enter rejection reason:") || "";
      if (!comments.trim()) {
        alert("Rejection reason required!");
        return;
      }
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/requisitions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          actor_id: profile.id,
          comments,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Requisition ${action}ed successfully`);
        await loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert("Failed to perform action: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ===================================================
  // UI HELPERS
  // ===================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Loading requisition details...
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="p-6 text-red-600">
        No requisition found for ID: <span className="font-mono">{id}</span>
      </div>
    );
  }

  const statusColor =
    requisition.status === "approved"
      ? "text-green-700 bg-green-100"
      : requisition.status === "pending"
      ? "text-yellow-700 bg-yellow-100"
      : requisition.status === "rejected"
      ? "text-red-700 bg-red-100"
      : "text-gray-700 bg-gray-100";

  const isAdmin = profile?.metadata?.role === "admin";

  // ===================================================
  // RENDER
  // ===================================================
  return (
    <div className="admin-content max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.push("/admin/requisitions")}
          className="flex items-center gap-2 text-[#012b73] hover:underline"
        >
          <ArrowLeft size={18} /> Back to list
        </button>

        {/* ACTION BUTTONS */}
        {isAdmin && (
          <div className="flex gap-3">
            {["draft", "pending"].includes(requisition.status) && (
              <button
                onClick={() => router.push(`/admin/requisitions/edit/${id}`)}
                className="cta-btn flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Edit3 size={16} /> Edit
              </button>
            )}
            {requisition.status === "pending" && (
              <>
                <button
                  onClick={() => handleAction("approve")}
                  disabled={actionLoading}
                  className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg"
                >
                  <CheckCircle size={16} />
                  {actionLoading ? "Processing..." : "Approve"}
                </button>
                <button
                  onClick={() => handleAction("reject")}
                  disabled={actionLoading}
                  className="cta-btn flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500 text-red-600 hover:bg-red-50"
                >
                  <XCircle size={16} /> Reject
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* DETAILS CARD */}
      <div className="bg-white shadow-md rounded-lg border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-[#012b73]">
            Requisition Details
          </h1>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColor}`}
          >
            {requisition.status}
          </span>
        </div>

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 text-sm">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-gray-500" />
            <b>Requisition ID:</b> {requisition.id}
          </div>

          <div className="flex items-center gap-2">
            <User size={16} className="text-gray-500" />
            <b>Requested By:</b>{" "}
            {requisition.profiles?.fname} {requisition.profiles?.lname}
          </div>

          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-500" />
            <b>Created:</b>{" "}
            {new Date(requisition.created_at).toLocaleString()}
          </div>

          <div className="flex items-center gap-2">
            <Folder size={16} className="text-gray-500" />
            <b>Department:</b> {requisition.departments?.name || "-"}
          </div>

          <div className="flex items-center gap-2">
            <Folder size={16} className="text-gray-500" />
            <b>Cost Center:</b>{" "}
            {requisition.cost_centers
              ? `${requisition.cost_centers.code} - ${requisition.cost_centers.name}`
              : "-"}
          </div>

          <div className="flex items-center gap-2">
            <Folder size={16} className="text-gray-500" />
            <b>Category:</b> {requisition.category?.name || "-"}
          </div>

          <div className="flex items-center gap-2">
            <Folder size={16} className="text-gray-500" />
            <b>Subcategory:</b> {requisition.subcategory?.name || "-"}
          </div>

          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-gray-500" />
            <b>Estimated Value:</b>{" "}
            {requisition.currency}{" "}
            {requisition.estimated_value?.toLocaleString()}
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="mt-6">
          <h2 className="text-gray-800 font-semibold mb-2">Description</h2>
          <p className="text-gray-600 border border-gray-200 rounded-md p-3 bg-[#f9fafc]">
            {requisition.description}
          </p>
        </div>

        {/* ATTACHMENTS */}
        {requisition.attachments?.length > 0 && (
          <div className="mt-6">
            <h2 className="text-gray-800 font-semibold mb-2">Attachments</h2>
            <ul className="list-disc pl-5 text-sm text-blue-700">
              {requisition.attachments.map((file: any, idx: number) => (
                <li key={idx}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {file.name}
                  </a>{" "}
                  <span className="text-gray-500 text-xs">
                    ({new Date(file.uploaded_at).toLocaleString()})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* APPROVAL INFO */}
        {requisition.approved_at && (
          <div className="mt-4 text-sm text-green-700">
            <CheckCircle size={14} className="inline mr-1" />
            Approved at{" "}
            {new Date(requisition.approved_at).toLocaleString()}
          </div>
        )}
        {requisition.rejected_at && (
          <div className="mt-4 text-sm text-red-700">
            <XCircle size={14} className="inline mr-1" />
            Rejected at{" "}
            {new Date(requisition.rejected_at).toLocaleString()}
            {requisition.reject_reason && (
              <span className="ml-2 italic text-red-500">
                Reason: {requisition.reject_reason}
              </span>
            )}
          </div>
        )}
      </div>

      {/* AUDIT TRAIL */}
      <div className="bg-white shadow-md rounded-lg border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-[#012b73] mb-3">
          Audit Trail
        </h2>
        {auditLogs.length > 0 ? (
          <ul className="divide-y divide-gray-200 text-sm text-gray-700">
            {auditLogs.slice(0, 5).map((log) => (
              <li key={log.id} className="py-2">
                <span className="font-medium text-[#012b73]">
                  {log.action.toUpperCase()}
                </span>{" "}
                —{" "}
                <span className="text-gray-600">
                  {log.payload?.note || log.payload?.reason || "-"}
                </span>
                <div className="text-gray-500 text-xs mt-1">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">No audit entries yet.</div>
        )}
      </div>
    </div>
  );
}
