// /app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, password, fname, lname, phone, role_id, organization_id } = await req.json();

    // 1️⃣ Create user in Supabase Auth
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (signUpError) throw signUpError;
    const userId = userData.user?.id;

    // 2️⃣ Insert profile record
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          user_id: userId,
          organization_id,
          fname,
          lname,
          phone,
          primary_role_id: role_id,
        },
      ])
      .select()
      .single();

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, user: userData.user, profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
