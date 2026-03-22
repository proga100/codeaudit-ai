"use client";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type Provider = "anthropic" | "openai" | "gemini";
type ApiKeyOption = { id: string; provider: Provider; label: string; maskedKey: string };

interface ModelSelectorProps {
  keys: ApiKeyOption[];
  selectedKeyId: string | null;
  selectedModel: string | null; // null = Auto
  onKeyChange: (keyId: string) => void;
  onModelChange: (model: string | null) => void;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

export function ModelSelector({ keys, selectedKeyId, selectedModel, onKeyChange, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (!selectedKeyId) return;
    setLoadingModels(true);
    fetch(`/api/models?keyId=${selectedKeyId}`)
      .then(r => r.json())
      .then((data: { models: Array<{ id: string; name: string }> }) => {
        setModels(data.models ?? []);
        onModelChange(null); // Reset to Auto when key changes
      })
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeyId]);

  // Group keys by provider
  const grouped = keys.reduce<Record<Provider, ApiKeyOption[]>>(
    (acc, k) => { (acc[k.provider] ??= []).push(k); return acc; },
    {} as Record<Provider, ApiKeyOption[]>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Provider & Key</p>
      <Select value={selectedKeyId ?? ""} onValueChange={onKeyChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an API key…" />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(grouped) as [Provider, ApiKeyOption[]][]).map(([provider, providerKeys]) => (
            <SelectGroup key={provider}>
              <SelectLabel>{PROVIDER_LABELS[provider]}</SelectLabel>
              {providerKeys.map(k => (
                <SelectItem key={k.id} value={k.id}>
                  {PROVIDER_LABELS[k.provider]} — {k.label} ({k.maskedKey})
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {selectedKeyId && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Model</p>
          {loadingModels ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading models…
            </div>
          ) : (
            <Select value={selectedModel ?? "auto"} onValueChange={(v) => onModelChange(v === "auto" ? null : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (recommended — best model per phase)</SelectItem>
                {models.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
