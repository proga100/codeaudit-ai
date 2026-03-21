import { getRequiredUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ScanSearch, GitBranch, KeyRound, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const user = await getRequiredUser();

  // Redirect first-time users to onboarding
  if (!user.hasCompletedOnboarding) {
    redirect("/onboarding");
  }

  const quickActions = [
    {
      title: "Run an audit",
      description: "Select a repo and start a comprehensive codebase analysis.",
      href: "/dashboard/audits",
      icon: ScanSearch,
      cta: "New audit",
    },
    {
      title: "Connect a repo",
      description: "Install the GitHub App to access private repositories.",
      href: "/dashboard/repos",
      icon: GitBranch,
      cta: "Add repo",
    },
    {
      title: "Add API key",
      description: "Add your Anthropic, OpenAI, or Gemini key to run audits.",
      href: "/dashboard/settings/api-keys",
      icon: KeyRound,
      cta: "Add key",
    },
  ] as const;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {user.name
            ? `Welcome back, ${user.name.split(" ")[0]}.`
            : "Welcome back."}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Run a codebase audit or review your previous results.
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-lg border border-border bg-card p-5 hover:border-white/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
                <action.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <ArrowRight
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-sm font-medium text-foreground mb-1">
              {action.title}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {action.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent audits placeholder */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Recent audits</h2>
          <Link
            href="/dashboard/audits"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ScanSearch className="h-8 w-8 text-muted-foreground/40 mb-3" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No audits yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Run your first audit to see results here.
          </p>
          <Link
            href="/dashboard/audits"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/15 transition-colors"
          >
            Start an audit
          </Link>
        </div>
      </div>
    </div>
  );
}
