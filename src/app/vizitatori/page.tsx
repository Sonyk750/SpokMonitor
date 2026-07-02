import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import TopNav from "@/components/TopNav";
import SiteTabs from "@/components/SiteTabs";
import { formatDuration } from "@/lib/format";

const PAGE_SIZE = 30;

export default async function VizitatoriPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const siteKey = params.site || null;
  const page = Math.max(1, Number(params.page) || 1);

  const sites = await db.site.findMany({ orderBy: { name: "asc" } });

  const where = siteKey ? { site: { key: siteKey } } : {};

  const [total, visits] = await Promise.all([
    db.visit.count({ where }),
    db.visit.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        site: { select: { name: true, key: true } },
        _count: { select: { pageviews: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav active="vizitatori" />

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-4">
        <SiteTabs
          sites={sites.map(s => ({ key: s.key, name: s.name }))}
          activeSite={siteKey}
          basePath="/vizitatori"
        />

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Sursă</th>
                <th className="px-4 py-3 font-medium">Pagină intrare</th>
                <th className="px-4 py-3 font-medium">Durată</th>
                <th className="px-4 py-3 font-medium">Pagini</th>
                <th className="px-4 py-3 font-medium">Device</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Fără vizitatori încă.
                  </td>
                </tr>
              )}
              {visits.map(v => {
                const durationSec = Math.max(
                  0,
                  Math.round((v.lastSeenAt.getTime() - v.startedAt.getTime()) / 1000),
                );
                return (
                  <tr key={v.id} className="border-b border-slate-800/60 text-slate-300">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {v.startedAt.toLocaleString("ro-RO", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">{v.site.name}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-400">{v.ip ?? "—"}</td>
                    <td className="px-4 py-3">{v.referrerSource ?? "direct"}</td>
                    <td className="px-4 py-3 max-w-[220px] truncate">{v.entryPath}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDuration(durationSec)}</td>
                    <td className="px-4 py-3 tabular-nums">{v._count.pageviews}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {[v.device, v.browser].filter(Boolean).join(" · ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Pagina {page} din {totalPages} ({total} vizite)
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/vizitatori?${new URLSearchParams({
                    ...(siteKey ? { site: siteKey } : {}),
                    page: String(page - 1),
                  }).toString()}`}
                  className="rounded-md border border-slate-800 px-3 py-1 hover:text-white"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/vizitatori?${new URLSearchParams({
                    ...(siteKey ? { site: siteKey } : {}),
                    page: String(page + 1),
                  }).toString()}`}
                  className="rounded-md border border-slate-800 px-3 py-1 hover:text-white"
                >
                  Următor
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
