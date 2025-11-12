"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();
  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/expenses", label: "Expenses" },
    { to: "/manager", label: "Approvals" },
    { to: "/policies", label: "Policies" },
    { to: "/reports", label: "Reports" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
          >
            Expense Detective
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ to, label }) => {
            const isActive =
              pathname === to ||
              (to !== "/dashboard" && pathname?.startsWith(to));
            return (
              <Link
                key={to}
                href={to}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  isActive
                    ? "text-primary bg-primary/10 dark:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
