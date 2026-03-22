"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Activity,
  GitCompareArrows,
  Key,
  ChevronLeft,
  Sun,
  Moon,
} from "lucide-react";
import { createApiKey } from "@/actions/api-keys";
import { completeSetup } from "./actions";
import type { Provider } from "@/lib/api-key-validator";

const PROVIDERS: { id: Provider; label: string; hint: string }[] = [
  { id: "anthropic", label: "Anthropic", hint: "sk-ant-api03-..." },
  { id: "openai", label: "OpenAI", hint: "sk-proj-..." },
  { id: "gemini", label: "Google Gemini", hint: "AIza..." },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "13-phase audit",
    description: "Security, quality, dependencies, and more",
  },
  {
    icon: Key,
    title: "Multi-provider",
    description: "Anthropic, OpenAI, Google Gemini",
  },
  {
    icon: Activity,
    title: "Live tracking",
    description: "Real-time progress and cost monitoring",
  },
  {
    icon: GitCompareArrows,
    title: "Compare audits",
    description: "Track improvements over time",
  },
];

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function setTheme(dark: boolean) {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--elevated)",
      }}
    >
      <button
        onClick={() => setTheme(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 28,
          border: "none",
          cursor: "pointer",
          background: !isDark ? "var(--text)" : "transparent",
          padding: 0,
          transition: "all 0.2s ease",
        }}
      >
        <Sun
          style={{
            width: 14,
            height: 14,
            color: !isDark ? "var(--background)" : "var(--text-muted)",
          }}
        />
      </button>
      <button
        onClick={() => setTheme(true)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 28,
          border: "none",
          cursor: "pointer",
          background: isDark ? "var(--text)" : "transparent",
          padding: 0,
          transition: "all 0.2s ease",
        }}
      >
        <Moon
          style={{
            width: 14,
            height: 14,
            color: isDark ? "var(--background)" : "var(--text-muted)",
          }}
        />
      </button>
    </div>
  );
}

export function SetupWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createApiKey(
        provider,
        apiKey,
        label || `${PROVIDERS.find((p) => p.id === provider)?.label} Key`
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 800));
      await completeSetup();
    });
  }

  if (step === 1) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--background)",
          position: "relative",
        }}
      >
        {/* Floating theme toggle */}
        <div style={{ position: "absolute", top: 20, right: 24 }}>
          <ThemeToggle />
        </div>

        <div className="fade-in" style={{ maxWidth: 500, textAlign: "center", padding: 40 }}>
          {/* Logo */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              margin: "0 auto 28px",
              background: "linear-gradient(135deg, var(--accent), #f59e0b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 40px rgba(250,204,21,0.15)",
            }}
          >
            <ShieldCheck style={{ width: 32, height: 32, color: "#0a0a0b" }} />
          </div>

          <h1
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: 12,
              color: "var(--text)",
            }}
          >
            Welcome to CodeAudit AI
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: 36,
            }}
          >
            Run comprehensive code audits on your local codebase using AI.
            <br />
            Your code never leaves your machine.
          </p>

          {/* Feature grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              textAlign: "left",
              marginBottom: 40,
            }}
          >
            {FEATURES.map(({ icon: Icon, title, description }, i) => (
              <div
                key={title}
                className={`fade-in stagger-${i + 1}`}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 14,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: "var(--accent-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: "var(--accent)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: "var(--text)" }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Get Started button */}
          <button
            onClick={() => setStep(2)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 500,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: "var(--accent)",
              color: "#0a0a0b",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "none";
            }}
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  // Step 2: API Key form
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--background)",
        position: "relative",
      }}
    >
      {/* Floating theme toggle */}
      <div style={{ position: "absolute", top: 20, right: 24 }}>
        <ThemeToggle />
      </div>

      <div className="fade-in" style={{ maxWidth: 460, width: "100%", padding: 40 }}>
        {/* Back button */}
        <button
          onClick={() => setStep(1)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            marginBottom: 24,
            padding: 0,
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} /> Back
        </button>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 8,
            color: "var(--text)",
          }}
        >
          Add your API key
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 28 }}>
          Choose a provider and enter your API key to get started.
        </p>

        {success ? (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 0" }}>
            <CheckCircle2 style={{ width: 40, height: 40, color: "var(--success)" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
              API key added — redirecting...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Provider selector */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  display: "block",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Provider
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {PROVIDERS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      textAlign: "center",
                      borderRadius: 12,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: provider === p.id ? "var(--accent-subtle)" : "var(--surface)",
                      border: `2px solid ${provider === p.id ? "var(--accent)" : "var(--border)"}`,
                      boxShadow:
                        provider === p.id
                          ? "0 0 0 1px var(--accent), 0 4px 12px rgba(250,204,21,0.08)"
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: provider === p.id ? 600 : 400,
                        color: provider === p.id ? "var(--accent)" : "var(--text-secondary)",
                      }}
                    >
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  display: "block",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={PROVIDERS.find((p) => p.id === provider)?.hint}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontSize: 13,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Label */}
            <div style={{ marginBottom: 28 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  display: "block",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Label <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Personal, Work"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontSize: 13,
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Error */}
            {error && (
              <p style={{ fontSize: 12, color: "var(--destructive)", marginBottom: 12 }}>{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || !apiKey.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "12px 24px",
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 10,
                border: "none",
                cursor: isPending || !apiKey.trim() ? "not-allowed" : "pointer",
                background: "var(--accent)",
                color: "#0a0a0b",
                opacity: isPending || !apiKey.trim() ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isPending && apiKey.trim()) {
                  e.currentTarget.style.opacity = "0.85";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity =
                  isPending || !apiKey.trim() ? "0.5" : "1";
                e.currentTarget.style.transform = "none";
              }}
            >
              {isPending && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
              {isPending ? "Validating..." : "Add Key & Continue"}
            </button>

            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 16,
                textAlign: "center",
              }}
            >
              You can add more keys in Settings &rarr; API Keys
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
