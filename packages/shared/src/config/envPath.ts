/**
 * Resolve the monorepo-root `.env` path.
 * Prefer a single root `.env` over per-service copies.
 */
import fs from "fs";
import path from "path";

export function resolveRootEnvPath(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), ".env"), // cwd = repo root
    path.resolve(process.cwd(), "../../.env"), // cwd = services/<name>
    path.resolve(process.cwd(), "../.env"), // cwd = services/
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
