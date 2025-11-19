"use client";

import React, { useState } from "react";
import "@/app/styles/admin.css";
import {
  ListChecks,
  PlusCircle,
  Users,
  Clock,
  ArrowRight,
  Filter,
  Search,
  FileText,
  Settings,
  Edit,
  Trash,
} from "lucide-react";

const templates = [
  {
    id: "TMP-001",
    name: "Requisition Approval Flow",
    entity: "Requisition",
    steps: [
      { step: 1, role: "Requester", sla: "4h" },
      { step: 2, role: "Procurement Manager", sla: "8h" },
      { step: 3, role: "Finance Approver", sla: "12h" },
    ],
    default: true,
  },
  {
    id: "TMP-002",
    name: "Purchase Order Authorization",
    entity: "Purchase Order",
    steps: [
      { step: 1, role: "Procurement Officer", sla: "6h" },
      { step: 2, role: "Finance Approver", sla: "12h" },
    ],
    default: false,
  },
  {
    id: "TMP-003",
    name: "Contract Signing Workflow",
    entity: "Contract",
    steps: [
      { step: 1, role: "Legal Team", sla: "24h" },
      { step: 2, role: "Finance Head", sla: "8h" },
      { step: 3, role: "CEO", sla: "24h" },
    ],
    default: false,
  },
];

export default function ApprovalTemplatesPage() {
  const [search, setSearch] = useState("");

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-content">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#012b73] mb-1 flex items-center gap-2">
            <ListChecks size={22} /> Approval Templates
          </h1>
          <p className="text-sm text-gray-600">
            Configure approval workflows for requisitions, RFQs, POs, and contracts.
          </p>
        </div>
        <button className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg">
          <PlusCircle size={18} /> Create Template
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-2 mb-6">
        <Search size={18} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2f6efb] w-full md:w-1/3"
        />
      </div>

      {/* TEMPLATES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 mb-8">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-[#012b73] text-lg">{t.name}</h3>
                <div className="text-xs text-gray-500">{t.entity}</div>
              </div>
              {t.default && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  Default
                </span>
              )}
            </div>

            {/* Flow Display */}
            <div className="flex items-center flex-wrap gap-2 mt-3 mb-3">
              {t.steps.map((s, idx) => (
                <React.Fragment key={idx}>
                  <div className="px-3 py-2 bg-[#f9fafc] rounded-lg border border-gray-200 shadow-sm text-sm">
                    <Users size={12} className="inline mr-1 text-[#2f6efb]" />
                    {s.role}
                    <span className="text-[10px] text-gray-500 ml-1">
                      ({s.sla})
                    </span>
                  </div>
                  {idx < t.steps.length - 1 && (
                    <ArrowRight size={14} className="text-gray-400" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 mt-3">
              <button className="text-blue-600 hover:text-blue-700 flex items-center text-xs gap-1">
                <Edit size={14} /> Edit
              </button>
              <button className="text-red-600 hover:text-red-700 flex items-center text-xs gap-1">
                <Trash size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DEFAULT WORKFLOW SUMMARY */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 mb-8">
        <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <Clock size={16} /> SLA Summary Overview
        </h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#f9fafc] text-gray-600 text-xs uppercase border-b">
              <th className="p-3 text-left">Template</th>
              <th className="p-3 text-left">Total Steps</th>
              <th className="p-3 text-left">Total SLA Time</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const totalHours = t.steps.reduce((sum, s) => sum + parseInt(s.sla), 0);
              return (
                <tr key={t.id} className="border-b hover:bg-[#f5f7fb] transition">
                  <td className="p-3 font-medium text-[#012b73]">{t.name}</td>
                  <td className="p-3">{t.steps.length}</td>
                  <td className="p-3">{totalHours} hrs</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <FileText size={14} className="inline mr-1 text-[#2f6efb]" />
            {templates.length} workflow templates configured
          </div>
          <div className="text-gray-500">
            Last modified: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
