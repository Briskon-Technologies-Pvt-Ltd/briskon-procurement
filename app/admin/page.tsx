"use client";

import React, { useEffect, useState } from "react";
import "@/app/styles/admin.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  Gavel,
  FileText,
  Trophy,
  FileCheck,
  Download,
  Clock,
} from "lucide-react";

function formatCurrency(value: number, currency = "USD") {
  if (isNaN(value)) return `${currency} 0`;
  return `${currency} ${value.toLocaleString()}`;
}

function shortDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
}

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function classifyAuction(start: string, end: string) {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (s <= now && e >= now) return "Live";
  if (s > now) return "Upcoming";
  return "Closed";
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const r = await fetch("/api/dashboard");
      const j = await r.json();
      setData(j);
    }
    load();
  }, []);

  if (!data) return <div className="p-6 text-gray-500">Loading…</div>;

  const auctions = data.auctions ?? [];
  const proposals = data.proposals ?? [];
  const purchaseOrders = data.purchaseOrders ?? [];
  const approvals = data.approvals ?? [];
  const notifications = data.notifications ?? [];
  const messages = data.messages ?? [];

  const spend = data.spendByCategory ?? [];
  const performance = data.supplierPerformance ?? [];

  const kpis = [
    { label: "Total Requisitions", value: data.kpis.totalRequisitions, icon: <FileText size={20} /> },
    { label: "Active RFQs", value: data.kpis.activeRfqs, icon: <Gavel size={20} /> },
    { label: "Live Auctions", value: data.kpis.liveAuctions, icon: <Trophy size={20} /> },
    { label: "Total Suppliers", value: data.kpis.totalSuppliers, icon: <Users size={20} /> },
    { label: "Awards Issued", value: data.kpis.awardsIssued, icon: <FileCheck size={20} /> },
  ];

  return (
    <div className="admin-content">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-md border border-blue-200  hover:shadow-lg">
            <div className="flex gap-2 text-[#2f6efb]">{k.icon}<span className="font-medium">{k.label}</span></div>
            <div className="text-3xl font-bold text-[#012b73] mt-2">{k.value}</div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-md border border-blue-200">
          <h3 className="font-semibold text-[#012b73] mb-4 text-xl">Category-wise Spend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spend}>
              <defs>
                <linearGradient id="briskonBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0052CC" stopOpacity={1} />
                  <stop offset="100%" stopColor="#66A8FF" stopOpacity={0.6} />
                </linearGradient>
              </defs>

              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />

                <Bar
                dataKey="total"
                fill="url(#briskonBlue)"
                radius={[8, 8, 0, 0]}  // soft rounded top edges
              />
            </BarChart>
          </ResponsiveContainer>
                  
        </div>

        <div className="bg-white rounded-lg p-4 shadow-md border border-blue-200">
          <h3 className="font-semibold text-[#012b73] mb-4 text-xl">Supplier Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={performance}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AUCTIONS / PROPOSALS  */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Auctions */}
        <div className="bg-white rounded-lg p-4 shadow-md border border-blue-200">
          <h3 className="font-semibold text-[#012b73] mb-3 text-xl">Auctions</h3>
          <div className="text-xs text-gray-500 mb-1">(Live / Upcoming / Closed)</div>

          {auctions.length === 0 ? (
            <p className="text-gray-500 text-sm">No auctions available.</p>
          ) : auctions.map(a => (
            <div key={a.id} className="py-2 border-b border-gray-100 flex justify-between">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-gray-500">{a.organization} • {a.type}</div>
              </div>
              <div className="text-xs font-semibold text-right">
                {classifyAuction(a.start_at, a.end_at) === "Live" && <span className="text-green-600">Live</span>}
                {classifyAuction(a.start_at, a.end_at) === "Upcoming" && <span className="text-blue-600">Upcoming</span>}
                {classifyAuction(a.start_at, a.end_at) === "Closed" && <span className="text-red-500">Closed</span>}
              </div>
            </div>
          ))}
        </div>
        {/* Proposals */}
        <div className="bg-white rounded-lg p-4 shadow-md border border-blue-200">
          <h3 className="font-semibold text-[#012b73] mb-3 text-xl">Proposals / Submissions</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="pb-1 text-left">RFQ</th>
                <th className="pb-1 text-left">Supplier</th>
                <th className="pb-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p: any) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="py-2">{p.rfq_name}</td>
                  <td className="py-2">{p.supplier_name}</td>
                  <td className="py-2">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Orders */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-blue-200 mb-6">
          <h3 className="font-semibold text-[#012b73] mb-3 text-xl">Purchase Orders</h3>
          {purchaseOrders.map(po => (
            <div key={po.id} className="py-2 flex justify-between border-b border-gray-100">
              <div>
                <div className="font-medium">{po.po_number} • {po.supplier_name}</div>
                <div className="text-xs text-gray-500">{formatCurrency(po.total, po.currency)} • {po.status}</div>
              </div>
              <Download size={16} className="text-[#2f6efb]" />
            </div>
          ))}
        </div>

      {/* ACTIVITY */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-blue-200   mb-6">
        <h3 className="font-semibold text-[#012b73] mb-3 text-xl">Recent activity</h3>
        {notifications.map(n => (
          <div key={n.id} className="py-2 border-b border-gray-100 flex justify-between text-xs">
            <span>{n.message}</span>
            <span className="text-xs text-gray-500">{timeAgo(n.created_at)}</span>
          </div>
        ))}
      </div>

      {/* MESSAGES */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-blue-200  mb-8">
        <h3 className="font-semibold text-[#012b73] mb-3 text-xl">Messages</h3>
        {messages.map(m => (
          <div key={m.id} className="py-2 border-b border-gray-100  flex justify-between text-xs">
          <span>{m.subject}</span>
          <span className="text-xs text-gray-500">{timeAgo(m.created_at)}</span>
          </div>


    


        ))}
      </div>

    </div>
  );
}
