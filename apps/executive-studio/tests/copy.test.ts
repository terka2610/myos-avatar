import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { copy } from "../lib/copy";

const ALLOWED_SAME = new Set(["MYOS"]);

describe("consultation copy", () => {
  it("gives every line a distinct Italian and English wording, except product names", () => {
    const problems: string[] = [];
    walk(copy, "copy", problems);
    expect(problems).toEqual([]);
  });

  it("does not hardcode a customer, a company, or a venue", () => {
    const root = path.resolve(__dirname, "..");
    const hits: string[] = [];
    for (const file of files(root)) {
      const text = fs.readFileSync(file, "utf8");
      if (/Federico|UNGUESS|H-FARM|H-Farm/i.test(text)) hits.push(path.relative(root, file));
    }
    expect(hits).toEqual([]);
  });
});

function walk(value: unknown, trail: string, problems: string[]) {
  if (!value || typeof value !== "object") return;
  if ("en" in value && "it" in value && typeof value.en === "string" && typeof value.it === "string") {
    if (!value.en.trim() || !value.it.trim()) problems.push(`${trail} is empty`);
    if (value.en === value.it && !ALLOWED_SAME.has(value.en)) problems.push(`${trail} is the same in both languages`);
    return;
  }
  for (const [key, child] of Object.entries(value)) walk(child, `${trail}.${key}`, problems);
}

function files(dir: string): string[] {
  const skip = new Set(["node_modules", ".next", "data", "docs"]);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (skip.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    if (entry.name === "copy.test.ts") return [];
    if (/\.(ts|tsx|css|md)$/.test(entry.name)) return [full];
    return [];
  });
}
