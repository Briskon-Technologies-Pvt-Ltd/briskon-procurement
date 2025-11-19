// /app/api/profiles/me/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: user, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user.user) return NextResponse.json({ error: "Invalid user" }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.user.id)
    .single();

  if (profileError) throw profileError;
  return NextResponse.json({ user: user.user, profile });
}
