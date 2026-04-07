import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const DB_DIR = path.join(os.homedir(), ".codeaudit-ai");
const DB_PATH = process.env["DATABASE_PATH"] ?? path.join(DB_DIR, "codeaudit.db");

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");

    // Auto-create tables on first run (no migration files needed)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL CHECK(provider IN ('anthropic', 'openai', 'gemini', 'openai-compatible')),
        label TEXT NOT NULL DEFAULT 'Default',
        encrypted_key TEXT NOT NULL,
        iv TEXT NOT NULL,
        masked_key TEXT NOT NULL DEFAULT '••••',
        base_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS api_keys_provider_idx ON api_keys(provider);

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audits (
        id TEXT PRIMARY KEY,
        folder_path TEXT NOT NULL,
        folder_name TEXT NOT NULL,
        audit_output_dir TEXT NOT NULL,
        audit_type TEXT NOT NULL DEFAULT 'full' CHECK(audit_type IN ('full', 'security', 'team-collaboration', 'code-quality')),
        depth TEXT NOT NULL DEFAULT 'deep' CHECK(depth IN ('quick', 'deep')),
        status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
        current_phase INTEGER,
        llm_provider TEXT NOT NULL CHECK(llm_provider IN ('anthropic', 'openai', 'gemini', 'openai-compatible')),
        selected_model TEXT,
        api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
        token_count INTEGER NOT NULL DEFAULT 0,
        estimated_cost INTEGER NOT NULL DEFAULT 0,
        actual_cost INTEGER NOT NULL DEFAULT 0,
        is_git_repo INTEGER NOT NULL DEFAULT 1,
        findings TEXT,
        started_at INTEGER,
        completed_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS audits_folder_path_idx ON audits(folder_path);
      CREATE INDEX IF NOT EXISTS audits_status_idx ON audits(status);
      CREATE INDEX IF NOT EXISTS audits_created_at_idx ON audits(created_at);

      CREATE TABLE IF NOT EXISTS audit_phases (
        id TEXT PRIMARY KEY,
        audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
        phase_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
        output TEXT,
        findings TEXT,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        started_at INTEGER,
        completed_at INTEGER
      );
    `);

    // Migrations for existing databases (try/catch — silently skip if already applied)
    try { sqlite.exec(`ALTER TABLE audits ADD COLUMN repo_context TEXT;`); } catch { /* column already exists */ }

    // v0.6.0: Add base_url column and expand provider CHECK to include 'openai-compatible'
    try { sqlite.exec(`ALTER TABLE api_keys ADD COLUMN base_url TEXT;`); } catch { /* column already exists */ }
    // Recreate api_keys with updated CHECK constraint (SQLite can't alter CHECK)
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS api_keys_new (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL CHECK(provider IN ('anthropic', 'openai', 'gemini', 'openai-compatible')),
          label TEXT NOT NULL DEFAULT 'Default',
          encrypted_key TEXT NOT NULL,
          iv TEXT NOT NULL,
          masked_key TEXT NOT NULL DEFAULT '••••',
          base_url TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO api_keys_new SELECT id, provider, label, encrypted_key, iv, masked_key, base_url, created_at, updated_at FROM api_keys;
        DROP TABLE api_keys;
        ALTER TABLE api_keys_new RENAME TO api_keys;
        CREATE INDEX IF NOT EXISTS api_keys_provider_idx ON api_keys(provider);
      `);
    } catch { /* migration already applied or fresh install */ }
    // Recreate audits with updated llm_provider CHECK
    try {
      const hasOldCheck = sqlite.prepare(`SELECT sql FROM sqlite_master WHERE name = 'audits'`).get() as { sql: string } | undefined;
      if (hasOldCheck?.sql && !hasOldCheck.sql.includes('openai-compatible')) {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS audits_new (
            id TEXT PRIMARY KEY,
            folder_path TEXT NOT NULL,
            folder_name TEXT NOT NULL,
            audit_output_dir TEXT NOT NULL,
            audit_type TEXT NOT NULL DEFAULT 'full' CHECK(audit_type IN ('full', 'security', 'team-collaboration', 'code-quality')),
            depth TEXT NOT NULL DEFAULT 'deep' CHECK(depth IN ('quick', 'deep')),
            status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
            current_phase INTEGER,
            llm_provider TEXT NOT NULL CHECK(llm_provider IN ('anthropic', 'openai', 'gemini', 'openai-compatible')),
            selected_model TEXT,
            api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
            token_count INTEGER NOT NULL DEFAULT 0,
            estimated_cost INTEGER NOT NULL DEFAULT 0,
            actual_cost INTEGER NOT NULL DEFAULT 0,
            is_git_repo INTEGER NOT NULL DEFAULT 1,
            findings TEXT,
            repo_context TEXT,
            started_at INTEGER,
            completed_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
          INSERT OR IGNORE INTO audits_new SELECT id, folder_path, folder_name, audit_output_dir, audit_type, depth, status, current_phase, llm_provider, selected_model, api_key_id, token_count, estimated_cost, actual_cost, is_git_repo, findings, repo_context, started_at, completed_at, created_at, updated_at FROM audits;
          DROP TABLE audits;
          ALTER TABLE audits_new RENAME TO audits;
          CREATE INDEX IF NOT EXISTS audits_folder_path_idx ON audits(folder_path);
          CREATE INDEX IF NOT EXISTS audits_status_idx ON audits(status);
          CREATE INDEX IF NOT EXISTS audits_created_at_idx ON audits(created_at);
        `);
      }
    } catch { /* migration already applied or fresh install */ }

    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export type DbClient = ReturnType<typeof getDb>;
