"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Eye,
  Award as AwardIcon,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

// ---- COLORS FOR PIE ----
const STATUS_COLORS: Record<string, string> = {
  issued: "#2f6efb",
  pending: "#f59e0b",
  completed: "#0eb25c",
};

export default function AwardsPage() {
  const router = useRouter();
  const [awards, setAwards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  // ---------------- LOAD AWARDS ----------------
  useEffect(() => {
    const loadAwards = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/awards`);
        const json = await res.json();

        if (json.success) setAwards(json.awards || []);
      } catch (err: any) {
        console.error("Awards fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    loadAwards();
  }, []);

  // ---------------- FILTER / SEARCH ----------------
  const filteredData = useMemo(() => {
    let data = awards;
    if (filter !== "All") data = data.filter((a) => a.status === filter);
    if (search.trim())
      data = data.filter(
        (a) =>
          a.suppliers?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
          a.rfqs?.title?.toLowerCase().includes(search.toLowerCase())
      );
    return data;
  }, [awards, filter, search]);

  // ---------------- KPI DATA ----------------
  const totalAwards = awards.length;
  const issuedAwards = awards.filter((a) => a.status === "issued").length;
  const pendingAwards = awards.filter((a) => a.status === "pending").length;
  const completedAwards = awards.filter((a) => a.status === "completed").length;

  const pieData = [
    { name: "issued", value: issuedAwards },
    { name: "pending", value: pendingAwards },
    { name: "completed", value: completedAwards },
  ].filter((d) => d.value > 0);

  const barData = [
    { month: "Aug", value: 18000 },
    { month: "Sep", value: 24000 },
    { month: "Oct", value: 26000 },
    { month: "Nov", value: 35000 },
  ];

  // ---------------- UI ----------------
  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#012b73]">Awards Management</h1>
          <p className="text-sm text-gray-600">
            Track awarded suppliers, issued awards, pending POs, and completed contracts.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border p-4 rounded-lg shadow-md">
          <div className="text-xs text-gray-500">Total Awards</div>
          <div className="text-2xl font-bold">{totalAwards}</div>
        </div>
        <div className="bg-white border p-4 rounded-lg shadow-md">
          <div className="text-xs text-gray-500">Issued</div>
          <div className="text-2xl font-bold text-blue-600">{issuedAwards}</div>
        </div>
        <div className="bg-white border p-4 rounded-lg shadow-md">
          <div className="text-xs text-gray-500">Pending PO</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingAwards}</div>
        </div>
        <div className="bg-white border p-4 rounded-lg shadow-md">
          <div className="text-xs text-gray-500">Completed</div>
          <div className="text-2xl font-bold text-green-600">{completedAwards}</div>
        </div>
      </div>

      {/* FILTERS + TABLE + CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* TABLE */}
        <div className="bg-white rounded-lg p-4 shadow-md border lg:col-span-3">
          {/* Search + Filter */}
          <div className="flex justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search awards..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded-md px-3 py-1 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border rounded-md text-sm px-2 py-1"
              >
                <option value="All">All</option>
                <option value="issued">Issued</option>
                <option value="pending">Pending PO</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 text-xs uppercase border-b">
                <tr>
                  <th className="p-3 text-left">Award ID</th>
                  <th className="p-3 text-left">RFQ</th>
                  <th className="p-3 text-left">Supplier</th>
                  <th className="p-3 text-right">Value</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Date</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-[#f5f7fb] transition">
                    <td className="p-3 text-[#012b73] font-medium">{a.id.slice(0, 8)}</td>
                    <td className="p-3">{a.rfqs?.title}</td>
                    <td className="p-3">{a.suppliers?.company_name}</td>
                    <td className="p-3 text-right">
                      {a.rfqs?.currency} {a.proposal?.total_price?.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.status === "issued"
                            ? "bg-blue-100 text-blue-700"
                            : a.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {new Date(a.awarded_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => router.push(`/admin/awards/${a.id}`)}
                        className="text-[#2f6efb] hover:text-[#1952c3]"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="text-center text-gray-600 py-8">No awards found</div>
            )}
          </div>
        </div>

        {/* CHARTS */}
        <div className="bg-white rounded-lg shadow-md border p-4">
          <h3 className="font-semibold text-[#012b73] mb-3">Awards by Status</h3>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <hr className="my-4" />

          <h3 className="font-semibold text-[#012b73] mb-3">
            Award Value by Month (Sample)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2f6efb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
