"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectCard } from "@/components/ui/select-card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { addApiKey, type Provider } from "@/actions/api-keys";
import { completeSetup } from "@/actions/setup";

const providers: { id: Provider; label: string; placeholder: string }[] = [
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-api03-..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-proj-..." },
  { id: "gemini", label: "Google Gemini", placeholder: "AIza..." },
];

const features = [
  {
    icon: "shield",
    title: "13-phase audit",
    desc: "Security, quality, dependencies, and more",
  },
  {
    icon: "key",
    title: "Multi-provider",
    desc: "Anthropic, OpenAI, Google Gemini",
  },
  {
    icon: "activity",
    title: "Live tracking",
    desc: "Real-time progress and cost monitoring",
  },
  {
    icon: "compare",
    title: "Compare audits",
    desc: "Track improvements over time",
  },
];

function FeatureIcon({ name }: { name: string }) {
  if (name === "shield") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  if (name === "key") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    );
  }
  if (name === "activity") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    );
  }
  if (name === "compare") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    );
  }
  return null;
}

export default function SetupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const result = await addApiKey(provider, apiKey, label);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      await completeSetup(); // redirects to /dashboard
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background relative">
        <ThemeToggle className="absolute top-5 right-6" />
        <div className="max-w-[500px] w-full text-center p-10 fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <div
              className="flex items-center justify-center rounded-[20px] shadow-[0_12px_40px_var(--accent-subtle)]"
              style={{
                width: 72,
                height: 72,
                background: "linear-gradient(135deg, var(--accent), #f59e0b)",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0a0a0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-[30px] font-bold tracking-[-0.03em] mb-3">
            Welcome to CodeAudit AI
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] text-text-secondary leading-relaxed mb-9">
            Run comprehensive code audits on your local codebase using AI.
            <br />
            Your code never leaves your machine.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3 text-left mb-10">
            {features.map((feature, i) => (
              <div
                key={feature.icon}
                className={`flex gap-3 p-3.5 bg-surface border border-border rounded-xl fade-in stagger-${i + 1}`}
              >
                <div
                  className="flex items-center justify-center rounded-[10px] bg-accent-subtle text-accent shrink-0"
                  style={{ width: 36, height: 36 }}
                >
                  <FeatureIcon name={feature.icon} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold mb-0.5">
                    {feature.title}
                  </div>
                  <div className="text-xs text-text-muted">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            variant="primary"
            size="lg"
            onClick={() => setStep(2)}
            className="w-full justify-center"
          >
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: API Key
  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative">
      <ThemeToggle className="absolute top-5 right-6" />
      <div className="max-w-[460px] w-full p-10 fade-in">
        {/* Back button */}
        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text mb-6 bg-transparent border-none cursor-pointer"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {/* Heading */}
        <h2 className="text-[22px] font-bold tracking-[-0.02em] mb-2">
          Add your API key
        </h2>
        <p className="text-[13px] text-text-secondary mb-7">
          Choose a provider and enter your API key to get started.
        </p>

        {/* Provider label */}
        <label className="text-xs font-semibold text-text-muted mb-2 block tracking-wider uppercase">
          Provider
        </label>

        {/* Provider selector */}
        <div className="flex gap-3 mb-5">
          {providers.map((p) => (
            <SelectCard
              key={p.id}
              selected={provider === p.id}
              onClick={() => setProvider(p.id)}
              className="flex-1 text-center py-3"
            >
              <div className="text-[13px] font-medium">{p.label}</div>
            </SelectCard>
          ))}
        </div>

        {/* API Key label */}
        <label className="text-xs font-semibold text-text-muted mb-2 block tracking-wider uppercase">
          API Key
        </label>

        {/* API Key input */}
        <Input
          type="password"
          mono
          placeholder={providers.find((p) => p.id === provider)?.placeholder}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="mb-4"
        />

        {/* Label label */}
        <label className="text-xs font-semibold text-text-muted mb-2 block tracking-wider uppercase">
          Label (optional)
        </label>

        {/* Label input */}
        <Input
          placeholder="e.g. Personal, Work"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mb-6"
        />

        {/* Error display */}
        {error && (
          <div className="text-destructive text-[13px] mb-4">{error}</div>
        )}

        {/* Submit button */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={!apiKey.trim() || loading}
          className="w-full justify-center"
        >
          {loading ? "Validating..." : "Add Key & Continue"}
        </Button>
      </div>
    </div>
  );
}
