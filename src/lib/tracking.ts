import { db } from "@/lib/db";

const ALLOWED_ORIGINS = new Set([
  "https://spokapp.ro",
  "https://www.spokapp.ro",
  "https://spokinvoice.ro",
  "https://www.spokinvoice.ro",
  "https://spokadmin.ro",
  "https://www.spokadmin.ro",
  "https://vosmart.ro",
  "https://www.vosmart.ro",
]);

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

export function corsHeaders(origin: string | null): HeadersInit {
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export function getCountry(req: Request): string | null {
  return req.headers.get("x-vercel-ip-country");
}

export function parseUserAgent(ua: string | null): {
  browser: string | null;
  os: string | null;
  device: string | null;
} {
  if (!ua) return { browser: null, os: null, device: null };

  let browser: string | null = null;
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";

  let os: string | null = null;
  if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ios/i.test(ua)) os = "iOS";
  else if (/mac os/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let device: string = "desktop";
  if (/ipad|tablet/i.test(ua)) device = "tablet";
  else if (/mobile|iphone|android/i.test(ua)) device = "mobile";

  return { browser, os, device };
}

export function normalizeReferrer(
  referrer: string | null,
  siteDomain: string,
): { referrer: string | null; referrerSource: string } {
  if (!referrer) return { referrer: null, referrerSource: "direct" };
  try {
    const url = new URL(referrer);
    const host = url.hostname.replace(/^www\./, "");
    const ownHost = siteDomain.replace(/^www\./, "");
    if (host === ownHost) return { referrer, referrerSource: "direct" };
    return { referrer, referrerSource: host };
  } catch {
    return { referrer, referrerSource: "direct" };
  }
}

const SESSION_GAP_MS = 30 * 60 * 1000;

export async function findOrCreateVisit(params: {
  siteId: string;
  siteDomain: string;
  visitorId: string;
  path: string;
  referrer: string | null;
  ip: string | null;
  userAgent: string | null;
  country: string | null;
}) {
  const cutoff = new Date(Date.now() - SESSION_GAP_MS);

  const existing = await db.visit.findFirst({
    where: { siteId: params.siteId, visitorId: params.visitorId, lastSeenAt: { gte: cutoff } },
    orderBy: { lastSeenAt: "desc" },
  });

  if (existing) {
    await db.visit.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
    await db.pageView.create({ data: { visitId: existing.id, path: params.path } });
    return existing.id;
  }

  const { browser, os, device } = parseUserAgent(params.userAgent);
  const { referrer, referrerSource } = normalizeReferrer(params.referrer, params.siteDomain);

  const created = await db.visit.create({
    data: {
      siteId: params.siteId,
      visitorId: params.visitorId,
      ip: params.ip,
      userAgent: params.userAgent,
      browser,
      os,
      device,
      referrer,
      referrerSource,
      entryPath: params.path,
      country: params.country,
      pageviews: { create: { path: params.path } },
    },
  });
  return created.id;
}

export async function touchVisit(siteId: string, visitorId: string) {
  const cutoff = new Date(Date.now() - SESSION_GAP_MS);
  const existing = await db.visit.findFirst({
    where: { siteId, visitorId, lastSeenAt: { gte: cutoff } },
    orderBy: { lastSeenAt: "desc" },
  });
  if (!existing) return;
  await db.visit.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
}
