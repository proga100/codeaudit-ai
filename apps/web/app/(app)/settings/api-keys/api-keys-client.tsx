"use client";

import { useState, useTransition } from "react";
import {
  Trash2,
  Plus,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Key,
} from "lucide-react";
import {
  createApiKey,
  deleteApiKey,
  updateApiKeyLabel,
  type ApiKeyRecord,
} from "@/actions/api-keys";
import type { Provider } from "@/lib/api-key-validator";

const PROVIDERS: {
  id: Provider;
  label: string;
  hint: string;
  initial: string;
}[] = [
  { id: "anthropic", label: "Anthropic", hint: "Starts with sk-ant-", initial: "A" },
  { id: "openai", label: "OpenAI", hint: "Starts with sk-", initial: "O" },
  { id: "gemini", label: "Google Gemini", hint: "AIza... format", initial: "G" },
];

// ============================================================
// Delete confirmation dialog
// ============================================================

function DeleteConfirmDialog({
  keyLabel,
  onConfirm,
  onCancel,
  isPending,
}: {
  keyLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
        }}
        onClick={onCancel}
      />
      <div
        className="fade-in"
        style={{
          position: "relative",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: 28,
          maxWidth: 400,
          width: "90%",
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              flexShrink: 0,
              background: "var(--destructive-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle
              style={{ width: 20, height: 20, color: "var(--destructive)" }}
            />
          </div>
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 4,
                color: "var(--text)",
              }}
            >
              Delete API Key
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to delete{" "}
              <span style={{ fontWeight: 600, color: "var(--text)" }}>
                {keyLabel}
              </span>
              ?
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--warning)",
            padding: "10px 12px",
            background: "var(--warning-subtle)",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          This action cannot be undone.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              background: "var(--elevated)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              opacity: isPending ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              background: "var(--destructive-subtle)",
              color: "var(--destructive)",
              border: "1px solid rgba(239,68,68,0.19)",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {isPending && (
              <Loader2
                style={{
                  width: 14,
                  height: 14,
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Add key form
// ============================================================

function AddKeyForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (key: ApiKeyRecord) => void;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [label, setLabel] = useState("Default");
  const [rawKey, setRawKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const providerInfo = PROVIDERS.find((p) => p.id === provider)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createApiKey(provider, rawKey, label);
      if (result.success) {
        onSuccess(result.data);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fade-in"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* Provider buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: `1px solid ${
                  provider === p.id ? "var(--accent)" : "var(--border)"
                }`,
                background:
                  provider === p.id ? "var(--accent-subtle)" : "var(--elevated)",
                color:
                  provider === p.id
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: provider === p.id ? 600 : 400,
                transition: "all 0.15s ease",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* API key input */}
        <input
          type="password"
          value={rawKey}
          onChange={(e) => setRawKey(e.target.value)}
          placeholder={`Paste your ${providerInfo.label} API key`}
          required
          autoComplete="off"
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

        {/* Label input */}
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
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

        {error && (
          <p
            style={{
              fontSize: 12,
              color: "var(--destructive)",
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
            }}
          >
            <X style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              background: "var(--elevated)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              opacity: isPending ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              background: "var(--accent)",
              color: "#0a0a0b",
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {isPending ? (
              <>
                <Loader2
                  style={{
                    width: 14,
                    height: 14,
                    animation: "spin 1s linear infinite",
                  }}
                />
                Validating...
              </>
            ) : (
              "Add Key"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// Edit label form
// ============================================================

function EditLabelForm({
  keyId,
  currentLabel,
  onSuccess,
  onCancel,
}: {
  keyId: string;
  currentLabel: string;
  onSuccess: (newLabel: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(currentLabel);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateApiKeyLabel(keyId, label);
      if (result.success) {
        onSuccess(label);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        maxLength={64}
        required
        autoFocus
        style={{
          padding: "6px 12px",
          fontSize: 13,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--elevated)",
          color: "var(--text)",
          outline: "none",
          width: 160,
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: 6,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        {isPending ? (
          <Loader2
            style={{
              width: 14,
              height: 14,
              animation: "spin 1s linear infinite",
              color: "var(--text-muted)",
            }}
          />
        ) : (
          <Check style={{ width: 14, height: 14, color: "var(--accent)" }} />
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: 6,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        <X style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
      </button>
    </form>
  );
}

// ============================================================
// Key row
// ============================================================

function KeyRow({
  apiKey,
  providerInfo,
  onDelete,
  onLabelUpdate,
}: {
  apiKey: ApiKeyRecord;
  providerInfo: (typeof PROVIDERS)[number];
  onDelete: (id: string) => void;
  onLabelUpdate: (id: string, newLabel: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteApiKey(apiKey.id);
      onDelete(apiKey.id);
    });
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Provider initial */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--elevated)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--accent)",
            }}
          >
            {providerInfo.initial}
          </div>

          <div>
            {isEditing ? (
              <EditLabelForm
                keyId={apiKey.id}
                currentLabel={apiKey.label}
                onSuccess={(newLabel) => {
                  onLabelUpdate(apiKey.id, newLabel);
                  setIsEditing(false);
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  {providerInfo.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {apiKey.label} &middot;{" "}
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                    }}
                  >
                    {apiKey.maskedKey}
                  </span>{" "}
                  &middot; Added{" "}
                  {new Date(apiKey.createdAt).toLocaleDateString()}
                </div>
              </>
            )}
          </div>
        </div>

        {!isEditing && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 10,
                background: "transparent",
                color: "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 10,
                background: "transparent",
                color: "var(--destructive)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <DeleteConfirmDialog
          keyLabel={apiKey.label}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          isPending={isPending}
        />
      )}
    </>
  );
}

// ============================================================
// Main client component
// ============================================================

export function ApiKeysClient({
  initialKeys,
}: {
  initialKeys: ApiKeyRecord[];
}) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>(initialKeys);
  const [showAdd, setShowAdd] = useState(false);

  function handleKeyAdded(newKey: ApiKeyRecord) {
    setKeys((prev) => [...prev, newKey]);
    setShowAdd(false);
  }

  function handleKeyDeleted(id: string) {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function handleLabelUpdated(id: string, newLabel: string) {
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, label: newLabel } : k))
    );
  }

  return (
    <div style={{ padding: "36px 40px", maxWidth: 640 }}>
      {/* Header */}
      <div
        className="fade-in"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--text)",
          }}
        >
          API Keys
        </h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 10,
            background: "var(--accent)",
            color: "#0a0a0b",
            border: "none",
            cursor: "pointer",
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
          <Plus style={{ width: 14, height: 14 }} />
          Add New Key
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <AddKeyForm
          onSuccess={handleKeyAdded}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Keys list */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {keys.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
            }}
          >
            <Key
              style={{
                width: 20,
                height: 20,
                margin: "0 auto 8px",
                color: "var(--text-muted)",
                opacity: 0.4,
              }}
            />
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              No API keys yet. Add one to get started.
            </p>
          </div>
        ) : (
          keys.map((key, i) => {
            const providerInfo =
              PROVIDERS.find((p) => p.id === key.provider) ?? PROVIDERS[0]!;
            return (
              <div
                key={key.id}
                className={`fade-in stagger-${Math.min(i + 1, 5)}`}
              >
                <KeyRow
                  apiKey={key}
                  providerInfo={providerInfo}
                  onDelete={handleKeyDeleted}
                  onLabelUpdate={handleLabelUpdated}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
