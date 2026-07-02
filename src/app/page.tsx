import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import TopNav from "@/components/TopNav";
import SiteTabs from "@/components/SiteTabs";
import RangeTabs from "@/components/RangeTabs";
import StatTile from "@/components/StatTile";
import VisitorsChart from "@/components/VisitorsChart";
import { formatDuration } from "@/lib/format";
import { daysAgo } from "@/lib/dateRange";

const RANGE_OPTIONS = [7, 30, 90];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const range = RANGE_OPTIONS.includes(Number(params.range)) ? Number(params.range) : 30;
  const siteKey = params.site || null;

  const sites = await db.site.findMany({ orderBy: { name: "asc" } });
  const since = daysAgo(range);

  const visits = await db.visit.findMany({
    where: {
      startedAt: { gte: since },
      ...(siteKey ? { site: { key: siteKey } } : {}),
    },
    select: {
      visitorId: true,
      startedAt: true,
      lastSeenAt: true,
      referrerSource: true,
      entryPath: true,
    },
  });

  const pageviewCount = await db.pageView.count({
    where: {
      createdAt: { gte: since },
      ...(siteKey ? { visit: { site: { key: siteKey } } } : {}),
    },
  });

  const uniqueVisitors = new Set(visits.map(v => v.visitorId)).size;
  const sessionCount = visits.length;
  const totalDurationSec = visits.reduce(
    (sum, v) => sum + Math.max(0, (v.lastSeenAt.getTime() - v.startedAt.getTime()) / 1000),
    0,
  );
  const avgDurationSec = sessionCount ? Math.round(totalDurationSec / sessionCount) : 0;

  const dayBuckets = new Map<string, Set<string>>();
  for (let i = range - 1; i >= 0; i--) {
    const d = daysAgo(i);
    dayBuckets.set(d.toISOString().slice(0, 10), new Set());
  }
  for (const v of visits) {
    const key = v.startedAt.toISOString().slice(0, 10);
    if (!dayBuckets.has(key)) dayBuckets.set(key, new Set());
    dayBuckets.get(key)!.add(v.visitorId);
  }
  const series = Array.from(dayBuckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, set]) => ({ date, count: set.size }));

  const referrerCounts = new Map<string, number>();
  for (const v of visits) {
    const src = v.referrerSource || "direct";
    referrerCounts.set(src, (referrerCounts.get(src) ?? 0) + 1);
  }
  const topReferrers = Array.from(referrerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const entryCounts = new Map<string, number>();
  for (const v of visits) {
    entryCounts.set(v.entryPath, (entryCounts.get(v.entryPath) ?? 0) + 1);
  }
  const topEntries = Array.from(entryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav active="dashboard" />

      <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SiteTabs
            sites={sites.map(s => ({ key: s.key, name: s.name }))}
            activeSite={siteKey}
            basePath="/"
            extraParams={{ range: String(range) }}
          />
          <RangeTabs active={range} basePath="/" site={siteKey} />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Vizitatori unici" value={String(uniqueVisitors)} />
          <StatTile label="Sesiuni" value={String(sessionCount)} />
          <StatTile label="Durată medie" value={formatDuration(avgDurationSec)} />
          <StatTile label="Pageview-uri" value={String(pageviewCount)} />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Vizitatori unici / zi</h2>
          {series.some(p => p.count > 0) ? (
            <VisitorsChart series={series} />
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">
              Încă nu există date pentru perioada selectată.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-sm font-medium text-slate-300 mb-3">Top surse</h2>
            {topReferrers.length === 0 ? (
              <p className="text-sm text-slate-500">Fără date.</p>
            ) : (
              <ul className="space-y-2">
                {topReferrers.map(([source, count]) => (
                  <li key={source} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{source}</span>
                    <span className="tabular-nums text-slate-400">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-sm font-medium text-slate-300 mb-3">Top pagini de intrare</h2>
            {topEntries.length === 0 ? (
              <p className="text-sm text-slate-500">Fără date.</p>
            ) : (
              <ul className="space-y-2">
                {topEntries.map(([path, count]) => (
                  <li key={path} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 truncate">{path}</span>
                    <span className="tabular-nums text-slate-400">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
