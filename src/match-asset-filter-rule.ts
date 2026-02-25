import type { Asset, AssetFilterRules } from "./types.ts";

export function matchAssetFilterRule(
  asset: Asset,
  rules?: AssetFilterRules,
): boolean {
  if (!rules) return false;
  const ruleArray = Array.isArray(rules) ? rules : [rules];
  return ruleArray.some((rule) => {
    if (rule instanceof RegExp) {
      return rule.test(asset.name);
    } else if (typeof rule === "function") {
      return rule(asset);
    } else {
      return asset.name.includes(rule);
    }
  });
}
