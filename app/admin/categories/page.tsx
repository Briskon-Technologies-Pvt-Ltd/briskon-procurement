"use client";

import React, { JSX, useEffect, useState } from "react";
import "@/app/styles/admin.css";
import {
  Grid,
  FolderTree,
  PlusCircle,
  Search,
  FileText,
  Users,
  Gavel,
  Edit,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    parent_id: "",
    description: "",
  });

  // ===================== FETCH =====================
  useEffect(() => {
    async function loadCategories() {
      setLoading(true);
      try {
        const res = await fetch("/api/categories");
        const json = await res.json();
        if (json.success) {
          setCategories(json.data || []);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  // ===================== TREE BUILD =====================
  const buildTree = (list: any[]) => {
    const map = new Map();
    list.forEach((cat) => map.set(cat.id, { ...cat, children: [] }));
    const roots: any[] = [];
    list.forEach((cat) => {
      if (cat.parent_id) {
        const parent = map.get(cat.parent_id);
        if (parent) parent.children.push(map.get(cat.id));
      } else roots.push(map.get(cat.id));
    });
    return roots;
  };
  const tree = buildTree(categories);

  const filtered = tree.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // ===================== EDIT =====================
  const openEditModal = (cat: any) => {
    setSelectedCategory(cat);
    setEditForm({
      name: cat.name || "",
      parent_id: cat.parent_id || "",
      description: cat.description || "",
    });
    setShowEditModal(true);
  };

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const performEdit = async () => {
    if (!selectedCategory) return;
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCategory.id,
          ...editForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCategories((prev) =>
          prev.map((c) => (c.id === selectedCategory.id ? json.data : c))
        );
        setShowEditModal(false);
      } else alert("Update failed: " + json.error);
    } catch (e) {
      console.error(e);
    }
  };

  // ===================== DELETE =====================
  const confirmDelete = (cat: any) => {
    setSelectedCategory(cat);
    setShowDeleteModal(true);
  };
  const performDelete = async () => {
    if (!selectedCategory) return;
    try {
      const res = await fetch(`/api/categories?id=${selectedCategory.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setCategories((prev) => prev.filter((c) => c.id !== selectedCategory.id));
      } else alert("Delete failed: " + json.error);
    } catch (e) {
      console.error(e);
    } finally {
      setShowDeleteModal(false);
      setSelectedCategory(null);
    }
  };

  // ===================== SUBCATEGORY RENDER =====================
  const renderSubcategories = (subs: any[], level = 0): JSX.Element | null => {
    if (!subs?.length) return null;

    return (
      <ul
        className={`ml-${level * 4} mt-1 list-disc text-xs text-gray-700 transition-all`}
      >
        {subs.map((sub: any) => (
          <li
            key={sub.id}
            className="mb-1 flex flex-col border-l border-gray-200 pl-3"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {"— ".repeat(level)}
                {sub.name}
                <div className="flex items-center gap-1 text-gray-400">
                  <button
                    onClick={() => openEditModal(sub)}
                    className="hover:text-blue-600"
                    title="Edit subcategory"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => confirmDelete(sub)}
                    className="hover:text-red-600"
                    title="Delete subcategory"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </span>
            </div>
            {sub.children && sub.children.length > 0 && (
              <div className="ml-4">{renderSubcategories(sub.children, level + 1)}</div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // ===================== PARENT CATEGORY RECURSIVE DROPDOWN =====================
  const renderParentSelector = (
    nodes: any[],
    level = 0
  ): JSX.Element[] => {
    let options: JSX.Element[] = [];
    nodes.forEach((node) => {
      options.push(
        <option
          key={node.id}
          value={node.id}
          disabled={node.id === selectedCategory?.id}
        >
          {`${"— ".repeat(level)}${node.name}`}
        </option>
      );
      if (node.children && node.children.length > 0) {
        options = options.concat(renderParentSelector(node.children, level + 1));
      }
    });
    return options;
  };

  // ===================== ANALYTICS MOCKS =====================
  const COLORS = ["#2563eb", "#0eb25c", "#f59e0b", "#dc2626"];
  const pieData = categories.map((cat) => ({
    name: cat.name,
    value: Math.floor(Math.random() * 100000) + 20000,
  }));
  const barData = categories.map((cat) => ({
    name: cat.name.length > 12 ? cat.name.slice(0, 12) + "…" : cat.name,
    suppliers: Math.floor(Math.random() * 20),
    rfqs: Math.floor(Math.random() * 10),
    auctions: Math.floor(Math.random() * 8),
  }));

  // ===================== RENDER =====================
  return (
    <div className="admin-content">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#012b73] mb-1 flex items-center gap-2">
            <Grid size={22} /> Category Management
          </h1>
          <p className="text-sm text-gray-600">
            Manage nested categories, suppliers, and procurement data hierarchically.
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/admin/categories/new")}
          className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg"
        >
          <PlusCircle size={18} /> Add Category
        </button>
      </div>

      {/* SEARCH */}
      <div className="flex items-center gap-2 mb-6">
        <Search size={18} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2f6efb] w-full md:w-1/3"
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
            <FileText size={16} /> Category Spend Distribution
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <h3 className="font-semibold text-[#012b73] mb-3 flex items-center gap-2">
            <Users size={16} /> Category Utilization Metrics
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="suppliers" fill="#0eb25c" />
              <Bar dataKey="rfqs" fill="#2563eb" />
              <Bar dataKey="auctions" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CATEGORY CARDS */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 mb-8">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#012b73] text-lg mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Manager: <b>{cat.manager || "Unassigned"}</b>
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Edit size={13} /> Edit
                  </button>
                  <button
                    onClick={() => confirmDelete(cat)}
                    className="text-red-600 hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                <FolderTree size={14} className="inline mr-1" />
                Subcategories:
              </div>
              {renderSubcategories(cat.children)}

              <div className="flex justify-between text-xs mt-3 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  <FileText size={12} className="text-gray-500" />
                  RFQs: <b>{Math.floor(Math.random() * 10) + 1}</b>
                </div>
                <div className="flex items-center gap-1">
                  <Gavel size={12} className="text-gray-500" />
                  Auctions: <b>{Math.floor(Math.random() * 5) + 1}</b>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-gray-500" />
                  Suppliers: <b>{Math.floor(Math.random() * 8) + 1}</b>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-sm shadow-xl relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setShowDeleteModal(false)}
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-600" size={24} />
              <h2 className="text-lg font-semibold text-[#012b73]">
                Confirm Deletion
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete{" "}
              <b>{selectedCategory.name}</b>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-xl relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setShowEditModal(false)}
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-[#012b73] mb-4">
              Edit Category
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => handleEditChange("name", e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Parent Category
                </label>
                <select
                  value={editForm.parent_id}
                  onChange={(e) => handleEditChange("parent_id", e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">— None (Top-level)</option>
                  {renderParentSelector(tree)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    handleEditChange("description", e.target.value)
                  }
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={3}
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={performEdit}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
