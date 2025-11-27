"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Building,
  FolderTree,
  Mail,
  Phone,
  FileText,
  Calendar,
  Globe,
  BarChart3,
  Award,
  Gavel,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Supplier = {
  id: string;
  company_name: string;
  country: string;
  registration_no: string;
  status: string;
  created_at: string;
};

type Contact = {
  name: string;
  email: string;
  phone: string;
};

type Document = {
  doc_type: string;
  issued_by: string;
  valid_from: string;
  valid_to: string;
  file_url?: string;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  children?: Category[];
};

export default function SupplierProfilePage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mappedCategoryIds, setMappedCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // =============== FETCH SUPPLIER DETAILS =====================
  useEffect(() => {
    const fetchSupplierDetails = async () => {
      setLoading(true);
      const { data: sup } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", supplierId)
        .single();

      const { data: contactsData } = await supabase
        .from("supplier_contacts")
        .select("name, email, phone")
        .eq("supplier_id", supplierId);

      const { data: docsData } = await supabase
        .from("supplier_documents")
        .select("doc_type, issued_by, valid_from, valid_to, file_url")
        .eq("supplier_id", supplierId);

      const { data: catMap } = await supabase
        .from("supplier_category_map")
        .select("category_id")
        .eq("supplier_id", supplierId);

      const { data: allCats } = await supabase
        .from("categories")
        .select("id, name, parent_id");

      setSupplier(sup);
      setContacts(contactsData || []);
      setDocuments(docsData || []);
      setCategories(allCats || []);
      setMappedCategoryIds(catMap?.map((m) => m.category_id) || []);
      setLoading(false);
    };
    fetchSupplierDetails();
  }, [supplierId]);

  // =============== UTILITIES =====================
  const buildCategoryTree = (cats: Category[], ids: string[]) => {
    const map: Record<string, Category> = {};
    cats.forEach((c) => (map[c.id] = { ...c, children: [] }));
    const roots: Category[] = [];
    cats.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children!.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });

    const relevant = (node: Category): Category | null => {
      const children = node.children || [];
      if (ids.includes(node.id)) {
        const filteredChildren = children.map(relevant).filter((n): n is Category => n !== null);
        return { ...node, children: filteredChildren };
      }
      const childMatches = children.map(relevant).filter((n): n is Category => n !== null);
      return childMatches.length > 0
        ? { ...node, children: childMatches }
        : null;
    };

    return roots.map(relevant).filter((n): n is Category => n !== null);
  };

  const renderCategoryTree = (nodes: Category[], depth = 0) => (
    <>
      {nodes.map((n) => (
        <div key={n.id} style={{ paddingLeft: `${depth * 20}px` }}>
          <div className="text-sm py-1 text-gray-800 font-medium flex items-center gap-1">
            <FolderTree size={12} /> {n.name}
          </div>
          {n.children && n.children.length > 0 && renderCategoryTree(n.children, depth + 1)}
        </div>
      ))}
    </>
  );

  // Static demo data (to be replaced later)
  const kpiData = [
    { name: "RFQs", value: 8 },
    { name: "Awards", value: 3 },
    { name: "Contracts", value: 2 },
  ];

  if (loading)
    return (
      <div className="p-6 text-gray-500 text-center">Loading supplier data...</div>
    );

  if (!supplier)
    return (
      <div className="p-6 text-center text-gray-500">
        Supplier not found. <br />
        <button
          onClick={() => router.back()}
          className="text-blue-600 mt-3 hover:underline"
        >
          Go Back
        </button>
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowLeft
            size={20}
            className="text-gray-600 cursor-pointer hover:text-blue-600"
            onClick={() => router.back()}
          />
          <h1 className="text-2xl font-semibold text-[#012b73]">
            Supplier Profile
          </h1>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm ${supplier.status === "approved"
            ? "bg-green-100 text-green-700"
            : supplier.status === "pending"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-700"
            }`}
        >
          {supplier.status}
        </span>
      </div>

      {/* BASIC INFO CARD */}
      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <Building size={18} /> Company Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <p>
            <b>Company Name:</b> {supplier.company_name}
          </p>
          <p>
            <b>Country:</b> {supplier.country || "—"}
          </p>
          <p>
            <b>Registration No:</b> {supplier.registration_no || "—"}
          </p>
          <p>
            <b>Joined On:</b> {new Date(supplier.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* CATEGORY TREE */}
      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <FolderTree size={18} /> Assigned Categories
        </h2>
        <div className="text-gray-700 text-sm">
          {mappedCategoryIds.length ? (
            renderCategoryTree(buildCategoryTree(categories, mappedCategoryIds))
          ) : (
            <p className="text-gray-500 italic">No categories assigned.</p>
          )}
        </div>
      </div>

      {/* CONTACTS */}
      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <Mail size={18} /> Contact Information
        </h2>
        {contacts.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map((c, i) => (
              <div key={i} className="text-sm text-gray-700 border-b pb-2">
                <p className="font-medium">{c.name}</p>
                <p className="flex items-center gap-1 text-gray-600">
                  <Mail size={12} /> {c.email}
                </p>
                <p className="flex items-center gap-1 text-gray-600">
                  <Phone size={12} /> {c.phone}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No contact data available.</p>
        )}
      </div>

      {/* DOCUMENTS */}
      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <FileText size={18} /> Compliance Documents
        </h2>
        {documents.length ? (
          <div className="space-y-2">
            {documents.map((d, i) => {
              const expired =
                d.valid_to && new Date(d.valid_to) < new Date();
              return (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm border-b pb-2"
                >
                  <div>
                    <b>{d.doc_type}</b> – {d.issued_by}
                    <p className="text-xs text-gray-500">
                      Valid till: {d.valid_to || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {expired ? (
                      <AlertTriangle size={14} className="text-red-500" />
                    ) : (
                      <CheckCircle size={14} className="text-green-500" />
                    )}
                    {d.file_url && (
                      <a
                        href={d.file_url}
                        target="_blank"
                        className="text-blue-600 underline text-xs"
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 italic">No documents uploaded.</p>
        )}
      </div>

      {/* PERFORMANCE / KPIs */}
      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012b73] mb-3 flex items-center gap-2">
          <BarChart3 size={18} /> Engagement Metrics
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={kpiData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#2f6efb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* FOOTER */}
      <div className="text-center text-sm text-gray-500 mt-4">
        © Briskon Procurement System — Supplier Module
      </div>
    </div>
  );
}
