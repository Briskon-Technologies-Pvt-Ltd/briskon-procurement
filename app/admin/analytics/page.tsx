"use client";

import React from "react";
import "@/app/styles/admin.css";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Gavel,
  ClipboardList,
  PieChart,
  LineChart,
  Award,
} from "lucide-react";
import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart as RBarChart,
  Bar,
} from "recharts";
import { PieChart as RPieChart, Pie, Cell, Tooltip } from "recharts";


// ===================== MOCK DATA =====================
const spendTrend = [
  { month: "Jan", spend: 120000 },
  { month: "Feb", spend: 155000 },
  { month: "Mar", spend: 110000 },
  { month: "Apr", spend: 175000 },
  { month: "May", spend: 190000 },
  { month: "Jun", spend: 205000 },
];

const categorySpend = [
  { name: "IT & Tech", value: 350000 },
  { name: "Office Supplies", value: 120000 },
  { name: "Logistics", value: 80000 },
  { name: "Facilities", value: 95000 },
  { name: "Safety & PPE", value: 110000 },
];

const supplierPerformance = [
  { name: "Supplier A", rating: 4.8 },
  { name: "Supplier B", rating: 4.2 },
  { name: "Supplier C", rating: 3.7 },
  { name: "Supplier D", rating: 4.5 },
  { name: "Supplier E", rating: 3.9 },
];

const COLORS = ["#2f6efb", "#0eb25c", "#f59e0b", "#dc2626", "#155ee5"];

export default function AnalyticsPage() {
  return (
    <div className="admin-content">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#012b73] flex items-center gap-2 mb-1">
            <BarChart3 size={22} /> Procurement Analytics
          </h1>
          <p className="text-sm text-gray-600">
            Real-time spend visibility, sourcing efficiency, and supplier
            performance insights.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 text-center">
          <DollarSign size={20} className="mx-auto text-[#2f6efb] mb-1" />
          <div className="text-xs text-gray-500">Total Spend (YTD)</div>
          <div className="text-xl font-bold">$1.25M</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 text-center">
          <ClipboardList size={20} className="mx-auto text-[#0eb25c] mb-1" />
          <div className="text-xs text-gray-500">RFQs Completed</div>
          <div className="text-xl font-bold">134</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 text-center">
          <Gavel size={20} className="mx-auto text-[#f59e0b] mb-1" />
          <div className="text-xs text-gray-500">Auctions Conducted</div>
          <div className="text-xl font-bold">47</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 text-center">
          <Users size={20} className="mx-auto text-[#dc2626] mb-1" />
          <div className="text-xs text-gray-500">Active Suppliers</div>
          <div className="text-xl font-bold">89</div>
        </div>
      </div>

      {/* SPEND TREND LINE CHART */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 mb-8">
        <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <TrendingUp size={16} /> Monthly Spend Trend
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <RLineChart data={spendTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="spend"
              stroke="#2f6efb"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </RLineChart>
        </ResponsiveContainer>
      </div>

      {/* CATEGORY SPEND DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* PIE CHART */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
          <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
            <PieChart size={16} /> Category Spend Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <RPieChart>
              <Pie
                data={categorySpend}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={(props: any) =>
                  `${props.name} ${(props.percent * 100).toFixed(0)}%`
                }
              >
                {categorySpend.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </RPieChart>
          </ResponsiveContainer>

        </div>

        {/* SUPPLIER PERFORMANCE BAR */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
          <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
            <Award size={16} /> Supplier Performance Ratings
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <RBarChart data={supplierPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="rating" fill="#0eb25c" radius={[4, 4, 0, 0]} />
            </RBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SOURCING METRICS TABLE */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 mb-8">
        <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <FileText size={16} /> Sourcing Efficiency Summary
        </h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#f9fafc] text-gray-600 text-xs uppercase border-b">
              <th className="p-3 text-left">Metric</th>
              <th className="p-3 text-left">Current Month</th>
              <th className="p-3 text-left">Previous Month</th>
              <th className="p-3 text-left">Change</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-[#f5f7fb] transition">
              <td className="p-3">Average RFQ Cycle Time</td>
              <td className="p-3">3.5 days</td>
              <td className="p-3">4.1 days</td>
              <td className="p-3 text-green-600">▼ 15%</td>
            </tr>
            <tr className="border-b hover:bg-[#f5f7fb] transition">
              <td className="p-3">Average Auction Duration</td>
              <td className="p-3">1.8 hrs</td>
              <td className="p-3">2.4 hrs</td>
              <td className="p-3 text-green-600">▼ 25%</td>
            </tr>
            <tr className="border-b hover:bg-[#f5f7fb] transition">
              <td className="p-3">PO Approval SLA Compliance</td>
              <td className="p-3">93%</td>
              <td className="p-3">88%</td>
              <td className="p-3 text-green-600">▲ +5%</td>
            </tr>
            <tr className="border-b hover:bg-[#f5f7fb] transition">
              <td className="p-3">Supplier Response Rate</td>
              <td className="p-3">78%</td>
              <td className="p-3">81%</td>
              <td className="p-3 text-red-600">▼ 3%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>Total Analytics Records: 6 datasets</div>
          <div className="text-gray-500">
            Last refresh: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
