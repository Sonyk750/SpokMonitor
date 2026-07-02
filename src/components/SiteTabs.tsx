import Link from "next/link";

type Site = { key: string; name: string };

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export default function SiteTabs({
  sites,
  activeSite,
  basePath,
  extraParams = {},
}: {
  sites: Site[];
  activeSite: string | null;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const tabs = [{ key: "", name: "Toate" }, ...sites];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(tab => {
        const isActive = (activeSite ?? "") === tab.key;
        return (
          <Link
            key={tab.key || "all"}
            href={buildHref(basePath, { ...extraParams, site: tab.key || undefined })}
            className={`rounded-full px-3 py-1.5 text-sm ${
              isActive
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
