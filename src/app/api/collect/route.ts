import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { corsHeaders, getClientIp, getCountry, findOrCreateVisit } from "@/lib/tracking";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  let body: { siteKey?: unknown; visitorId?: unknown; path?: unknown; referrer?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers });
  }

  const siteKey = typeof body.siteKey === "string" ? body.siteKey : "";
  const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
  const path = typeof body.path === "string" && body.path ? body.path : "/";
  const referrer = typeof body.referrer === "string" && body.referrer ? body.referrer : null;

  if (!siteKey || !visitorId) {
    return NextResponse.json({ ok: false }, { status: 400, headers });
  }

  const site = await db.site.findUnique({ where: { key: siteKey } });
  if (!site) {
    return NextResponse.json({ ok: false }, { status: 404, headers });
  }

  await findOrCreateVisit({
    siteId: site.id,
    siteDomain: site.domain,
    visitorId,
    path,
    referrer,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent"),
    country: getCountry(req),
  });

  return NextResponse.json({ ok: true }, { headers });
}
