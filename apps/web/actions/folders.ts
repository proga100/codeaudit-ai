"use server";
import fs from "node:fs/promises";
import path from "node:path";
import { isGitRepo } from "@/lib/folder-safety";

export type FolderValidationResult =
  | { valid: true; folderName: string; folderPath: string; isGitRepo: boolean }
  | { valid: false; error: string };

export async function validateFolder(inputPath: string): Promise<FolderValidationResult> {
  const folderPath = inputPath.trim();
  if (!folderPath) return { valid: false, error: "Please enter a folder path" };

  try {
    const stat = await fs.stat(folderPath);
    if (!stat.isDirectory()) {
      return { valid: false, error: "Path exists but is not a directory" };
    }
  } catch {
    return { valid: false, error: `Folder not found: ${folderPath}` };
  }

  const gitRepo = await isGitRepo(folderPath);
  return {
    valid: true,
    folderName: path.basename(folderPath),
    folderPath,
    isGitRepo: gitRepo,
  };
}
