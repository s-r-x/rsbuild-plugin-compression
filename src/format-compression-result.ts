import chalk from "chalk";
import type { CompressedAssetsMap } from "./compress-assets.ts";
import type {
  CompressionAlgorithm,
  CompressionAlgorithmWithOptions,
} from "./types.ts";
import { formatByteSize, formatMs } from "./utils.ts";

export function formatCompressionResult({
  compressedAssetsMap,
  environmentName,
  compressionTime,
  algorithms,
}: {
  compressedAssetsMap: CompressedAssetsMap;
  environmentName: string;
  compressionTime: number;
  algorithms: CompressionAlgorithmWithOptions[];
}): string {
  let maxNameLength = 0;
  for (const fileName of compressedAssetsMap.keys()) {
    if (fileName.length > maxNameLength) {
      maxNameLength = fileName.length;
    }
  }
  const nameColWidth = maxNameLength + 4;
  const algColWidth = 12;
  const header =
    chalk.bold(
      `File${(environmentName || "") && ` (${environmentName})`}`.padEnd(
        nameColWidth,
      ),
    ) +
    chalk.bold("base".padEnd(algColWidth)) +
    algorithms.map(({ name }) => chalk.bold(name.padEnd(algColWidth))).join("");
  const outputLines = [header];
  const bundleSizeMap = new Map<CompressionAlgorithm | "base", number>();
  for (const [assetName, { asset, result }] of compressedAssetsMap) {
    let line =
      assetName.padEnd(nameColWidth) +
      formatByteSize(asset.size).padEnd(algColWidth);
    const baseNewSize = (bundleSizeMap.get("base") || 0) + asset.size;
    bundleSizeMap.set("base", baseNewSize);
    for (const { name } of algorithms) {
      const resultEntry = result.get(name);
      if (resultEntry) {
        line += formatByteSize(resultEntry.size).padEnd(algColWidth);
        const newSize = (bundleSizeMap.get(name) || 0) + resultEntry.size;
        bundleSizeMap.set(name, newSize);
      } else {
        line += "-".padEnd(algColWidth);
      }
    }
    outputLines.push(line);
  }
  let resultLine =
    chalk.bold("Total:".padEnd(nameColWidth)) +
    chalk.bold(
      formatByteSize(bundleSizeMap.get("base") || 0).padEnd(algColWidth),
    );
  for (const { name } of algorithms) {
    const size = bundleSizeMap.get(name);
    resultLine += chalk.bold(
      (typeof size === "number" ? formatByteSize(size) : "-").padEnd(
        algColWidth,
      ),
    );
  }
  outputLines.push(resultLine);
  return (
    `compressed in ${chalk.bold(formatMs(compressionTime))}\n` +
    outputLines.join("\n")
  );
}
