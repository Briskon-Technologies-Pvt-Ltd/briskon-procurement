"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../components/auth/AuthProvider";
import "../../../styles/admin.css";
import { Grid, Save, ArrowLeft } from "lucide-react";

type CategoryPayload = {
  id?: string;
  name: string;
  code?: string | null;
  description?: string | null;
  parent_id?: string | null;
};

export default function NewCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit") || null;

  const { profile } = useAuth();
  const actorProfileId = profile?.id;

  const [parents, setParents] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [loadingParents, setLoadingParents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);

  const [form, setForm] = useState<CategoryPayload>({
    name: "",
    code: "",
    description: "",
    parent_id: null,
  });

  // Fetch parent categories for dropdown
  useEffect(() => {
    async function loadParents() {
      setLoadingParents(true);
      try {
        const res = await fetch("/api/categories");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // exclude the editing category itself (will re-filter later if edit)
          setParents(json.data);
        } else {
          setParents([]);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
        setParents([]);
      } finally {
        setLoadingParents(false);
      }
    }
    loadParents();
  }, []);

  // If editId is present, load category data (find from parents list first; otherwise fetch list and find)
  useEffect(() => {
    if (!editId) return;

    const loadCategory = async () => {
      try {
        setLoadingCategory(true);
        // Try fetch all and find
        const res = await fetch("/api/categories");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const found = json.data.find((c: any) => String(c.id) === String(editId));
          if (found) {
            setForm({
              id: found.id,
              name: found.name || "",
              code: found.code ?? "",
              description: found.description ?? "",
              parent_id: found.parent_id ?? null,
            });
            return;
          }
        }
        // fallback: if not found, try GET by filtering (API doesn't provide single-get so we rely on list)
        alert("Category to edit not found");
        router.push("/admin/categories");
      } catch (err) {
        console.error("Error loading category for edit:", err);
        alert("Failed to load category for edit.");
        router.push("/admin/categories");
      } finally {
        setLoadingCategory(false);
      }
    };

    loadCategory();
  }, [editId, router]);

  // Validation helper
  const validate = (payload: CategoryPayload) => {
    if (!payload.name || payload.name.trim().length < 2) {
      return "Category name is required (minimum 2 characters).";
    }
    // parent cannot equal self (only relevant in edit)
    if (payload.id && payload.parent_id && String(payload.parent_id) === String(payload.id)) {
      return "Parent category cannot be the category itself.";
    }
    return null;
  };

  // Submit handler (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actorProfileId) {
      alert("Profile not loaded. Please login again.");
      return;
    }

    const payload: any = {
      name: form.name.trim(),
      code: form.code?.trim() || null,
      description: form.description?.trim() || null,
      parent_id: form.parent_id || null,
      actor_profile_id: actorProfileId,
    };

    const validationError = validate({ ...payload, id: form.id });
    if (validationError) {
      alert(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const method = form.id ? "PUT" : "POST";
      if (form.id) payload.id = form.id;

      const res = await fetch("/api/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || json.message || "Unknown error");
      }

      alert(form.id ? "Category updated successfully" : "Category created successfully");
      router.push("/admin/categories");
    } catch (err: any) {
      console.error("Submit error:", err);
      alert("Error saving category: " + (err.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-content">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#012b73] flex items-center gap-2">
            <Grid size={22} /> {form.id ? "Edit Category" : "Create Category / Subcategory"}
          </h1>
          <p className="text-sm text-gray-600">
            Use this form to create a new category or add it under an existing parent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/categories")}
            className="cta-btn secondary flex items-center gap-2 px-3 py-2 rounded-lg"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={() => {}}
            className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg"
            onMouseDown={(e) => e.preventDefault()} // keep focus behavior smooth
            aria-hidden
            style={{ display: "none" }}
          >
            <Save size={16} /> Save
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md border border-gray-100 max-w-2xl"
      >
        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
          <input
            type="text"
            className="border border-gray-300 rounded-md w-full p-2 text-sm"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. IT & Technology"
          />
        </div>

        {/* Code */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Code</label>
          <input
            type="text"
            className="border border-gray-300 rounded-md w-full p-2 text-sm"
            value={form.code ?? ""}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="Optional short code (e.g. IT)"
          />
        </div>

        {/* Parent */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category (optional)</label>
          <select
            className="border border-gray-300 rounded-md w-full p-2 text-sm"
            value={form.parent_id ?? ""}
            onChange={(e) =>
              setForm({ ...form, parent_id: e.target.value ? e.target.value : null })
            }
          >
            <option value="">-- None (Top Level) --</option>
            {loadingParents ? (
              <option disabled>Loading...</option>
            ) : (
              parents
                .filter((p) => String(p.id) !== String(form.id ?? "")) // don't show self if editing
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
            )}
          </select>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={4}
            className="border border-gray-300 rounded-md w-full p-2 text-sm"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description to help buyers/suppliers"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="cta-btn primary flex items-center gap-2 px-4 py-2 rounded-lg"
            disabled={submitting || loadingCategory}
          >
            <Save size={16} />
            {submitting ? (form.id ? "Updating..." : "Creating...") : form.id ? "Update Category" : "Create Category"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/categories")}
            className="cta-btn secondary px-3 py-2 rounded-md"
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
