import Link from "next/link";

const RANGES = [7, 30, 90];

export default function RangeTabs({
  active,
  basePath,
  site,
}: {
  active: number;
  basePath: string;
  site: string | null;
}) {
  return (
    <div className="flex gap-2">
      {RANGES.map(r => {
        const qs = new URLSearchParams();
        if (site) qs.set("site", site);
        qs.set("range", String(r));
        return (
          <Link
            key={r}
            href={`${basePath}?${qs.toString()}`}
            className={`rounded-md px-2.5 py-1 text-sm ${
              active === r ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {r}z
          </Link>
        );
      })}
    </div>
  );
}
