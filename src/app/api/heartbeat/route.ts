import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { corsHeaders, touchVisit } from "@/lib/tracking";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  let body: { siteKey?: unknown; visitorId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers });
  }

  const siteKey = typeof body.siteKey === "string" ? body.siteKey : "";
  const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
  if (!siteKey || !visitorId) {
    return NextResponse.json({ ok: false }, { status: 400, headers });
  }

  const site = await db.site.findUnique({ where: { key: siteKey } });
  if (!site) {
    return NextResponse.json({ ok: false }, { status: 404, headers });
  }

  await touchVisit(site.id, visitorId);

  return NextResponse.json({ ok: true }, { headers });
}
