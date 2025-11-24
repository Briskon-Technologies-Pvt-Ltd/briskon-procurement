// /app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
type AnyRecord = Record<string, any>;
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId =
    searchParams.get("org_id") ||
    searchParams.get("organization_id") ||
    searchParams.get("organizationId") ||
    null;
  const applyOrgFilter = (query: any, column = "organization_id") => {
    if (organizationId) return query.eq(column, organizationId);
    return query;
  };

  // =====================================================
  // Helper: Resolve readable entity name from type + ID
  // =====================================================
  async function resolveEntityName(entityType: string, entityId: string) {
    try {
      switch (entityType) {
        case "requisition": {
          const { data } = await supabase.from("requisitions").select("description").eq("id", entityId).single();
          return data?.description || `Requisition ${entityId.slice(0, 6)}`;
        }
        case "rfq": {
          const { data } = await supabase.from("rfqs").select("title").eq("id", entityId).single();
          return data?.title || `RFQ ${entityId.slice(0, 6)}`;
        }
        case "auction": {
          const { data } = await supabase
            .from("auctions")
            .select("id, rfq:rfqs ( title )")
            .eq("id", entityId)
            .single();
          return data?.rfq?.title || `Auction ${entityId.slice(0, 6)}`;
        }
        case "purchase_order": {
          const { data } = await supabase.from("purchase_orders").select("po_number").eq("id", entityId).single();
          return data?.po_number || `PO ${entityId.slice(0, 6)}`;
        }
        case "supplier": {
          const { data } = await supabase.from("suppliers").select("company_name").eq("id", entityId).single();
          return data?.company_name || `Supplier ${entityId.slice(0, 6)}`;
        }
        case "award":
          return `Award ${entityId.slice(0, 6)}`;

        default:
          return `${entityType} ${entityId.slice(0, 6)}`;
      }
    } catch {
      return `${entityType} ${entityId.slice(0, 6)}`;
    }
  }

  try {
    // COUNT KPIs
    const requisitionsPromise = applyOrgFilter(supabase.from("requisitions").select("id", { count: "exact" }));
    const rfqsPromise = applyOrgFilter(supabase.from("rfqs").select("id", { count: "exact" }));
    const auctionsPromise = applyOrgFilter(supabase.from("auctions").select("id", { count: "exact" }));
    const suppliersPromise = applyOrgFilter(supabase.from("suppliers").select("id", { count: "exact" }), "org_onboarded_to");
    const awardsPromise = applyOrgFilter(supabase.from("awards").select("id", { count: "exact" }));
  // Spend
    const spendPromise = applyOrgFilter(supabase.from("requisitions").select("cost_center, estimated_value"));
    // Awards per month
    const awardsForPerfPromise = applyOrgFilter(supabase.from("awards").select("id, awarded_at"));
    // Cards Data
    const auctionsListPromise = applyOrgFilter(
      supabase
        .from("auctions")
        .select(`
          id,
          auction_type,
          start_at,
          end_at,
          status,
          created_at,
          rfq:rfqs ( title ),
          organization:organizations ( name )
        `)
        .order("created_at", { ascending: false })
        .limit(10)
    );

    const proposalsListPromise = applyOrgFilter(
      supabase
        .from("proposal_submissions")
        .select(`
          id,
          status,
          submitted_at,
          rfq:rfqs ( id, title ),
          supplier:suppliers ( company_name )
        `)
        .order("submitted_at", { ascending: false })
        .limit(10)
    );

    const purchaseOrdersPromise = applyOrgFilter(
      supabase
        .from("purchase_orders")
        .select(`
          id,
          po_number,
          total_amount,
          currency,
          status,
          due_date,
          created_at,
          supplier:suppliers ( company_name )
        `)
        .order("created_at", { ascending: false })
        .limit(10)
    );

    const approvalsPromise = applyOrgFilter(
      supabase
        .from("approvals")
        .select(`
          id,
          entity_type,
          entity_id,
          status,
          created_at,
          created_by:profiles ( fname, lname )
        `)
        .order("created_at", { ascending: false })
        .limit(10)
    );

    const notificationsPromise = applyOrgFilter(
      supabase
        .from("notifications")
        .select("id, message, type, related_entity, entity_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      "recipient_profile_id"
    );
// Force raw query without organization filtering
const messagesPromise = supabase
  .from("messages")
  .select("id, body, created_at")
  .order("created_at", { ascending: false })
  .limit(10);
    const [
      requisitionsRes,
      rfqsRes,
      auctionsResCount,
      suppliersRes,
      awardsResCount,
      spendRes,
      awardsForPerfRes,
      auctionsListRes,
      proposalsListRes,
      purchaseOrdersRes,
      approvalsRes,
      notificationsRes,
      messagesRes,
    ] = await Promise.all([
      requisitionsPromise,
      rfqsPromise,
      auctionsPromise,
      suppliersPromise,
      awardsPromise,
      spendPromise,
      awardsForPerfPromise,
      auctionsListPromise,
      proposalsListPromise,
      purchaseOrdersPromise,
      approvalsPromise,
      notificationsPromise,
      messagesPromise,
    ]);
    // KPIs JSON 
    const kpis = {
      totalRequisitions: requisitionsRes.count ?? 0,
      activeRfqs: rfqsRes.count ?? 0,
      liveAuctions: auctionsResCount.count ?? 0,
      totalSuppliers: suppliersRes.count ?? 0,
      awardsIssued: awardsResCount.count ?? 0,
    };
    // Spend map
    const spendRows = (spendRes.data ?? []) as AnyRecord[];
    const spendMap = new Map<string, number>();
    for (const row of spendRows) {
      const key = row.cost_center || "Unclassified";
      const value = Number(row.estimated_value || 0);
      spendMap.set(key, (spendMap.get(key) || 0) + value);
    }
    const spendByCategory = Array.from(spendMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Awards performance
    const perfRows = (awardsForPerfRes.data ?? []) as AnyRecord[];
    const perfMap = new Map<string, number>();
    for (const row of perfRows) {
      if (!row.awarded_at) continue;
      const d = new Date(row.awarded_at);
      const key = d.toLocaleString("default", { month: "short" });
      perfMap.set(key, (perfMap.get(key) || 0) + 1);
    }
    const supplierPerformance = Array.from(perfMap.entries()).map(([month, count]) => ({ month, score: count }));

    // Auctions
    const auctions = (auctionsListRes.data ?? []).map((row: any) => ({
      id: row.id,
      title: row.rfq?.title || "Auction",
      start_at: row.start_at,
      end_at: row.end_at,
      status: row.status,
      type: row.auction_type,
      organization: row.organization?.name || "Organization",
    }));

    // Proposals
    const proposals = (proposalsListRes.data ?? []).map((row: any) => ({
      id: row.id,
      rfq_ref: row.rfq?.id || row.rfq?.title || "RFQ",
      rfq_name: row.rfq?.title || "Untitled RFQ",
      supplier_name: row.supplier?.company_name || "Supplier",
      status: row.status,
    }));

    // Purchase Orders
    const purchaseOrders = (purchaseOrdersRes.data ?? []).map((row: any) => ({
      id: row.id,
      po_number: row.po_number,
      supplier_name: row.supplier?.company_name || "Supplier",
      total: Number(row.total_amount || 0),
      currency: row.currency,
      status: row.status,
      due_date: row.due_date,
    }));

    // Approvals (resolved name)
    const approvals = await Promise.all(
      (approvalsRes.data ?? []).map(async (row: any) => ({
        id: row.id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        entity_name: await resolveEntityName(row.entity_type, row.entity_id),
        requester_name: `${row.created_by?.fname || ""} ${row.created_by?.lname || ""}`.trim(),
        status: row.status,
        created_at: row.created_at,
      }))
    );

    // Notifications (resolved name)
    const notifications = await Promise.all(
      (notificationsRes.data ?? []).map(async (row: any) => ({
        id: row.id,
        message: row.message,
        type: row.type,
        created_at: row.created_at,
        related_entity_name: row.entity_id
          ? await resolveEntityName(row.related_entity, row.entity_id)
          : null,
      }))
    );

    const messages = (messagesRes.data ?? []).map((row: any) => ({
      id: row.id,
      subject: row.body.slice(0, 30) || "Message",
      body: row.body,
      created_at: row.created_at
    }));
    
    // FINAL PAYLOAD (structure unchanged)
    return NextResponse.json({
      kpis,
      spendByCategory,
      supplierPerformance,
      auctions,
      proposals,
      purchaseOrders,
      approvals,
      notifications,
      messages,
    });
  } catch (err: any) {
    console.error("Dashboard API fatal error:", err);
    return NextResponse.json({ error: "Failed to load dashboard", details: err.message }, { status: 500 });
  }
}
