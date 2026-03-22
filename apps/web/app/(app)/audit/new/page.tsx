"use client";
import { useState } from "react";
import { FolderPicker } from "@/components/audit/folder-picker";
import type { FolderValidationResult } from "@/actions/folders";

export default function NewAuditPage() {
  const [folderPaths, setFolderPaths] = useState<string[]>([""]);
  const [folderValidations, setFolderValidations] = useState<(FolderValidationResult | null)[]>([null]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New Audit</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select one or more folders and configure your audit.
        </p>
      </div>

      <FolderPicker
        value={folderPaths}
        onChange={(paths, validations) => {
          setFolderPaths(paths);
          setFolderValidations(validations);
        }}
      />

      {/* Audit configuration (type, depth, model, cost estimate) — added in Plan 03 */}
    </div>
  );
}
