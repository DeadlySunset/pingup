import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import ru from "../messages/ru.json";

type LocaleTree = Record<string, unknown>;

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

describe("locale parity", () => {
  const enFlat = flatten(en as LocaleTree);
  const ruFlat = flatten(ru as LocaleTree);

  it("en and ru contain the same keys", () => {
    const onlyInEn = [...enFlat].filter((k) => !ruFlat.has(k));
    const onlyInRu = [...ruFlat].filter((k) => !enFlat.has(k));
    expect({ onlyInEn, onlyInRu }).toEqual({ onlyInEn: [], onlyInRu: [] });
  });

  it("every leaf in en is a non-empty string or array", () => {
    for (const key of enFlat) {
      const value = lookup(en, key);
      expect(value, `en.${key}`).toBeTruthy();
    }
  });

  it("every leaf in ru is a non-empty string or array", () => {
    for (const key of ruFlat) {
      const value = lookup(ru, key);
      expect(value, `ru.${key}`).toBeTruthy();
    }
  });
});

function lookup(tree: unknown, dotted: string): unknown {
  let cur: unknown = tree;
  for (const part of dotted.split(".")) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}
