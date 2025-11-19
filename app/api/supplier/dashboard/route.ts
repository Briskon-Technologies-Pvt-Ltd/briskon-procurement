// /app/api/supplier/dashboard/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/supplier/dashboard?supplier_id=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const supplierId = url.searchParams.get("supplier_id");

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "supplier_id required" },
        { status: 400 }
      );
    }

    const now = new Date();

    // -----------------------------------------
    // 1) RFQs visible to this supplier
    //    - Public RFQs (status = published, visibility = public)
    //    - RFQs where we have an invitation for this supplier
    // -----------------------------------------
    const { data: publicRfqs, error: publicErr } = await supabase
      .from("rfqs")
      .select("id, title, visibility, status, created_at")
      .eq("status", "published")
      .eq("visibility", "public");

    if (publicErr) throw publicErr;

    const { data: invitedRows, error: invitedErr } = await supabase
      .from("invitations")
      .select(
        `
        rfq_id,
        supplier_id,
        rfqs (
          id,
          title,
          visibility,
          status,
          created_at
        )
      `
      )
      .eq("supplier_id", supplierId)
      .not("rfq_id", "is", null);

    if (invitedErr) throw invitedErr;

    const invitedRfqs = (invitedRows || [])
      .map((row: any) => row.rfqs)
      .filter(
        (r: any | null) => r && r.status === "published"
      ) as any[];

    const rfqById = new Map<string, any>();
    for (const rfq of publicRfqs || []) {
      rfqById.set(rfq.id, rfq);
    }
    for (const rfq of invitedRfqs) {
      if (!rfqById.has(rfq.id)) {
        rfqById.set(rfq.id, rfq);
      }
    }

    const visibleRfqs = Array.from(rfqById.values());
    const invitedRfqIds = new Set(invitedRfqs.map((r) => r.id as string));

    // -----------------------------------------
    // 2) Proposals by this supplier
    // -----------------------------------------
    const { data: proposals, error: proposalsErr } = await supabase
      .from("proposal_submissions")
      .select("id, rfq_id, auction_id, submitted_at")
      .eq("supplier_id", supplierId)
      .eq("status", "submitted");

    if (proposalsErr) throw proposalsErr;

    // -----------------------------------------
    // 3) Auctions visible to this supplier
    //    - Published auctions
    //    - Visibility:
    //        • if NO rows in auction_visibility → treat as public
    //        • if rows exist → visible only if supplier_id = this supplier
    // -----------------------------------------
    const { data: allAuctions, error: auctionsErr } = await supabase
      .from("auctions")
      .select("id, auction_type, status, start_at, end_at, config")
      .eq("status", "published");

    if (auctionsErr) throw auctionsErr;

    const auctionIds = (allAuctions || []).map((a) => a.id as string);

    let visibleAuctions: any[] = [];
    let visibleAuctionIds = new Set<string>();

    if (auctionIds.length > 0) {
      const { data: visRows, error: visErr } = await supabase
        .from("auction_visibility")
        .select("auction_id, supplier_id")
        .in("auction_id", auctionIds);

      if (visErr) throw visErr;

      const auctionsWithVisibility = new Set(
        (visRows || []).map((v) => v.auction_id as string)
      );
      const invitedAuctionIds = new Set(
        (visRows || [])
          .filter((v) => v.supplier_id === supplierId)
          .map((v) => v.auction_id as string)
      );

      for (const a of allAuctions || []) {
        const id = a.id as string;
        const hasVis = auctionsWithVisibility.has(id);
        const isPublic = !hasVis; // no visibility rows → public
        const isInvited = invitedAuctionIds.has(id);

        if (isPublic || isInvited) {
          visibleAuctions.push(a);
          visibleAuctionIds.add(id);
        }
      }
    }

    // -----------------------------------------
    // 4) Bids for these auctions by this supplier
    // -----------------------------------------
    let bidActivity: {
      id: string;
      auction_id: string;
      auction_title: string;
      amount: number;
      created_at: string;
    }[] = [];
    let openBidsCount = 0;

    if (visibleAuctionIds.size > 0) {
      const { data: bids, error: bidsErr } = await supabase
        .from("bids")
        .select("id, auction_id, amount, created_at")
        .eq("supplier_id", supplierId)
        .in("auction_id", Array.from(visibleAuctionIds))
        .order("created_at", { ascending: false })
        .limit(20);

      if (bidsErr) throw bidsErr;

      const auctionById = new Map<string, any>();
      for (const a of visibleAuctions) {
        auctionById.set(a.id as string, a);
      }

      const activeAuctionIds = new Set<string>();
      for (const a of visibleAuctions) {
        const start = a.start_at ? new Date(a.start_at) : null;
        const end = a.end_at ? new Date(a.end_at) : null;
        if (start && end && start <= now && end >= now) {
          activeAuctionIds.add(a.id as string);
        }
      }

      openBidsCount = new Set(
        (bids || [])
          .filter((b) => activeAuctionIds.has(b.auction_id as string))
          .map((b) => b.auction_id as string)
      ).size;

      bidActivity =
        (bids || []).map((b) => {
          const a = auctionById.get(b.auction_id as string);
          return {
            id: b.id as string,
            auction_id: b.auction_id as string,
            auction_title: a?.config?.title ?? "Auction",
            amount: Number(b.amount),
            created_at: b.created_at as string,
          };
        }) ?? [];
    }

    // -----------------------------------------
    // 5) KPIs
    // -----------------------------------------
    const activeAuctionCount = visibleAuctions.filter((a) => {
      const start = a.start_at ? new Date(a.start_at) : null;
      const end = a.end_at ? new Date(a.end_at) : null;
      return start && end && start <= now && end >= now;
    }).length;

    const kpis = {
      visibleRfqCount: visibleRfqs.length,
      invitedRfqCount: invitedRfqIds.size,
      activeAuctionCount,
      openBidsCount,
      proposalCount: proposals?.length ?? 0,
    };

    // -----------------------------------------
    // 6) Lists for dashboard cards
    // -----------------------------------------
    visibleRfqs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const recentOpportunities = visibleRfqs.slice(0, 5).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      visibility: r.visibility as string,
      status: r.status as string,
      created_at: r.created_at as string,
    }));

    visibleAuctions.sort(
      (a, b) =>
        new Date(a.start_at ?? 0).getTime() -
        new Date(b.start_at ?? 0).getTime()
    );

    const upcomingAndActiveAuctions = visibleAuctions.slice(0, 5).map((a) => ({
      id: a.id as string,
      title: (a.config?.title as string) ?? "Auction",
      auction_type: a.auction_type as string,
      start_at: a.start_at as string | null,
      end_at: a.end_at as string | null,
      status: a.status as string,
    }));

    const data = {
      kpis,
      opportunities: recentOpportunities,
      auctions: upcomingAndActiveAuctions,
      bidActivity,
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error(
      "GET /api/supplier/dashboard error:",
      err?.message || err
    );
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
