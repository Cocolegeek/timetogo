import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

export async function resolve(specifier, context, next) {
  if (specifier === "@/lib/supabase/client") {
    return { url: pathToFileURL(path.join(root, "tests/stub-supabase.ts")).href, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const base = path.join(root, specifier.slice(2));
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      try {
        const { statSync } = await import("node:fs");
        statSync(base + ext);
        return { url: pathToFileURL(base + ext).href, shortCircuit: true };
      } catch {}
    }
  }
  return next(specifier, context);
}
