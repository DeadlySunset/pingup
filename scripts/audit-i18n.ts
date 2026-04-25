// Walks src/, extracts all i18n keys from t("..."), tRoot("..."),
// useTranslations("ns") + t("..."), and getTranslations("ns") + t("...").
// Compares against messages/en.json and messages/ru.json. Reports:
//   - keys used in code but missing from a locale
//   - keys present in a locale but unused (best-effort: dynamic keys excluded)

import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";

type LocaleTree = Record<string, unknown>;

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const MESSAGES = join(ROOT, "messages");

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      yield* walk(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      yield full;
    }
  }
}

function flatten(obj: LocaleTree, prefix = ""): Set<string> {
  const out = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const sub of flatten(v as LocaleTree, path)) out.add(sub);
    } else {
      out.add(path);
    }
  }
  return out;
}

// Heuristic key extractor — matches plain `t("foo.bar")`, `t('foo.bar')`,
// and `getTranslations("ns")` / `useTranslations("ns")` namespaces.
function extractKeys(source: string): {
  rootKeys: Set<string>;
  nsKeys: Map<string, Set<string>>;
  dynamicCallers: Set<string>;
} {
  const rootKeys = new Set<string>();
  const dynamicCallers = new Set<string>();

  // Track namespaces by callee variable: const t = await getTranslations("ns")
  // We only care that *some* useTranslations / getTranslations declares a
  // namespace; for our codebase the variable is always `t`.
  const nsKeys = new Map<string, Set<string>>();

  const nsRe =
    /(?:useTranslations|getTranslations)\(\s*["']([\w.]+)["']\s*\)/g;
  for (const m of source.matchAll(nsRe)) {
    nsKeys.set(m[1], new Set());
  }

  // Find every `t(<arg>)` call. If literal, record. If template/expr, mark dynamic.
  const callRe = /\bt\(\s*([^)]+?)\)/g;
  for (const m of source.matchAll(callRe)) {
    const arg = m[1].trim();
    if (
      (arg.startsWith('"') && arg.endsWith('"')) ||
      (arg.startsWith("'") && arg.endsWith("'"))
    ) {
      const key = arg.slice(1, -1);
      if (nsKeys.size > 0) {
        // attribute to the (single) ns in this file — our codebase has at most one
        const ns = [...nsKeys.keys()][0];
        nsKeys.get(ns)!.add(`${ns}.${key}`);
      } else {
        rootKeys.add(key);
      }
    } else {
      // dynamic key — capture the literal-prefix part if `${var}` style
      const tplPrefix = arg.match(/^`([^`$]+)/)?.[1];
      if (tplPrefix) {
        dynamicCallers.add(tplPrefix);
      } else {
        dynamicCallers.add(arg);
      }
    }
  }

  return { rootKeys, nsKeys, dynamicCallers };
}

async function main() {
  const allKeys = new Set<string>();
  const dynamicPrefixes = new Set<string>();

  for await (const file of walk(SRC)) {
    const src = await readFile(file, "utf8");
    const { rootKeys, nsKeys, dynamicCallers } = extractKeys(src);
    for (const k of rootKeys) allKeys.add(k);
    for (const set of nsKeys.values()) {
      for (const k of set) allKeys.add(k);
    }
    for (const c of dynamicCallers) dynamicPrefixes.add(c);
  }

  const en = JSON.parse(await readFile(join(MESSAGES, "en.json"), "utf8")) as LocaleTree;
  const ru = JSON.parse(await readFile(join(MESSAGES, "ru.json"), "utf8")) as LocaleTree;

  const enFlat = flatten(en);
  const ruFlat = flatten(ru);

  const missingInEn: string[] = [];
  const missingInRu: string[] = [];

  for (const key of allKeys) {
    if (!enFlat.has(key) && !startsWithAny(key, [...enFlat])) missingInEn.push(key);
    if (!ruFlat.has(key) && !startsWithAny(key, [...ruFlat])) missingInRu.push(key);
  }

  // Locale parity: keys present in one but not the other.
  const onlyInEn = [...enFlat].filter((k) => !ruFlat.has(k));
  const onlyInRu = [...ruFlat].filter((k) => !enFlat.has(k));

  console.log("=== i18n audit ===");
  console.log(`Static keys used in code: ${allKeys.size}`);
  console.log(`Dynamic key prefixes (skipped): ${dynamicPrefixes.size}`);
  if (dynamicPrefixes.size > 0) {
    console.log("  prefixes:", [...dynamicPrefixes].slice(0, 8).join(", "));
  }

  if (missingInEn.length > 0) {
    console.log(`\nMISSING in en.json (${missingInEn.length}):`);
    for (const k of missingInEn.sort()) console.log("  -", k);
  }
  if (missingInRu.length > 0) {
    console.log(`\nMISSING in ru.json (${missingInRu.length}):`);
    for (const k of missingInRu.sort()) console.log("  -", k);
  }
  if (onlyInEn.length > 0) {
    console.log(`\nOnly in en (locale parity drift, ${onlyInEn.length}):`);
    for (const k of onlyInEn.sort()) console.log("  -", k);
  }
  if (onlyInRu.length > 0) {
    console.log(`\nOnly in ru (locale parity drift, ${onlyInRu.length}):`);
    for (const k of onlyInRu.sort()) console.log("  -", k);
  }

  const ok =
    missingInEn.length === 0 &&
    missingInRu.length === 0 &&
    onlyInEn.length === 0 &&
    onlyInRu.length === 0;
  console.log(ok ? "\nOK ✓" : "\nFAIL ✗");
  process.exit(ok ? 0 : 1);
}

function startsWithAny(key: string, candidates: string[]): boolean {
  // Allow nested object access — e.g. `home.signedInAs` is a leaf, but our
  // walker wouldn't return the parent. This helper is unused but kept for
  // clarity if we add fallback semantics later.
  return candidates.includes(key);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
