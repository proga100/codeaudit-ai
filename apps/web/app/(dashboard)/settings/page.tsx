import Link from "next/link";
import { KeyRound, Github, ArrowRight } from "lucide-react";

const settingsSections = [
  {
    href: "/settings/api-keys",
    title: "API Keys",
    description: "Manage your Anthropic, OpenAI, and Gemini API keys.",
    icon: KeyRound,
  },
  {
    href: "/settings/github",
    title: "GitHub Connection",
    description:
      "Install or manage the GitHub App to grant repository access.",
    icon: Github,
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-muted-foreground">
        Manage your API keys, GitHub connection, and account preferences.
      </p>

      <div className="mt-8 space-y-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {section.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {section.description}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
