import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function TopNav({ active }: { active: "dashboard" | "vizitatori" }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
      <div className="flex items-center gap-6">
        <span className="text-base font-semibold text-white">SpokMonitor</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className={active === "dashboard" ? "text-white" : "text-slate-400 hover:text-white"}
          >
            Dashboard
          </Link>
          <Link
            href="/vizitatori"
            className={active === "vizitatori" ? "text-white" : "text-slate-400 hover:text-white"}
          >
            Vizitatori
          </Link>
        </nav>
      </div>
      <LogoutButton />
    </div>
  );
}
