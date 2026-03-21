"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import {
  LayoutDashboard,
  ScanSearch,
  GitBranch,
  Settings,
} from "lucide-react";
import Image from "next/image";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Audits",
    href: "/dashboard/audits",
    icon: ScanSearch,
  },
  {
    label: "Repos",
    href: "/dashboard/repos",
    icon: GitBranch,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-white/10 border border-white/20">
          <span className="text-xs font-bold text-white">CA</span>
        </div>
        <span className="text-sm font-semibold text-foreground tracking-wide">
          CodeAudit
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-4" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-white/10 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon
                className="h-4 w-4 flex-shrink-0"
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User profile + sign out */}
      <div className="border-t border-border p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? "User avatar"}
              width={28}
              height={28}
              className="rounded-full flex-shrink-0"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-white">
                {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {user.name ?? "User"}
            </p>
            {user.email && (
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
          </div>
        </div>

        <SignOutButton
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          showIcon={true}
          showLabel={true}
        />
      </div>
    </aside>
  );
}
