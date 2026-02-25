import path from "node:path";
import type { RsbuildPlugin } from "@rsbuild/core";
import chalk from "chalk";
import pLimit from "p-limit";
import { compressFile, UnsupportedCompressionError } from "./compress-file.ts";
import {
  DEFAULT_COMPRESSION_ALGORITHMS,
  DEFAULT_COMPRESSION_THRESHOLD,
  DEFAULT_CONCURRENCY_LIMIT,
  DEFAULT_DISABLE_PLUGIN,
  DEFAULT_INCLUDE_ASSETS,
  DEFAULT_PRINT_RESULT,
  LOG_PREFIX,
  PLUGIN_NAME,
} from "./config.ts";
import { matchAssetFilterRule } from "./match-asset-filter-rule.ts";
import type {
  Asset,
  CompressionAlgorithm,
  CompressionAlgorithmWithOptions,
  CompressionPluginOptions,
} from "./types.ts";
import { formatByteSize, formatMs, getFileSize } from "./utils.ts";

/**
 * @example
 * ```ts
 * // rsbuild.config.ts
 * import {defineConfig} from "@rsbuild/core";
 * import {pluginCompression} from "rsbuild-plugin-compression";
 * export default defineConfig({
 *   plugins: [pluginCompression()]
 * });
 * ```
 */
export const pluginCompression = ({
  threshold = DEFAULT_COMPRESSION_THRESHOLD,
  algorithms: algorithms_ = DEFAULT_COMPRESSION_ALGORITHMS,
  concurrency = DEFAULT_CONCURRENCY_LIMIT,
  include = DEFAULT_INCLUDE_ASSETS,
  exclude,
  disabled = DEFAULT_DISABLE_PLUGIN,
  printResult: shouldPrintResult = DEFAULT_PRINT_RESULT,
}: CompressionPluginOptions = {}): RsbuildPlugin => ({
  name: PLUGIN_NAME,
  setup(api) {
    if (api.context.action !== "build") {
      api.logger.debug(
        LOG_PREFIX + `skipping rsbuild action "${api.context.action}"`,
      );
      return;
    }
    if (typeof disabled === "boolean" && disabled) {
      api.logger.debug(LOG_PREFIX + "plugin is disabled");
      return;
    }
    if (!algorithms_.length) {
      api.logger.warn(LOG_PREFIX + "empty algorithms. skipping...");
      return;
    }
    const algorithms: CompressionAlgorithmWithOptions[] = algorithms_.map(
      (algorithm) =>
        typeof algorithm === "string" ? { name: algorithm } : algorithm,
    );

    api.onAfterEnvironmentCompile(
      async function handleEnvironmentCompilation(opts) {
        const environmentName = opts.environment.name;
        if (typeof disabled === "function" && disabled({ environmentName })) {
          api.logger.debug(LOG_PREFIX + "plugin is disabled");
          return;
        }
        const stats = opts.stats?.toJson({
          all: false,
          outputPath: true,
          assets: true,
        });
        if (!stats) return;

        const { outputPath, assets } = stats;
        if (!outputPath || !assets?.length) return;

        api.logger.start(LOG_PREFIX + "compression started");

        interface CompressionResultMetadata {
          path: string;
          size: number;
        }
        const compressedAssetsMap = new Map<
          string,
          {
            asset: Asset;
            result: Map<CompressionAlgorithm, CompressionResultMetadata>;
          }
        >();
        const limit = pLimit({ concurrency });
        const compressionStartedAt = performance.now();
        let wasUnsupportedCompressionErrorPrinted = false;
        const promises = assets.reduce(function (acc, baseAsset) {
          const asset: Asset = {
            name: baseAsset.name,
            size: baseAsset.size,
          };
          if (
            (exclude && matchAssetFilterRule(asset, exclude)) ||
            (include && !matchAssetFilterRule(asset, include)) ||
            !asset.size ||
            asset.size < threshold
          ) {
            return acc;
          }
          for (const algorithm of algorithms) {
            const assetPath = path.join(outputPath, asset.name);
            acc.push(
              limit(async function compressAsset() {
                try {
                  const { outputPath } = await compressFile({
                    inputPath: assetPath,
                    algorithm,
                  });
                  const resultMetadata: CompressionResultMetadata = {
                    path: outputPath,
                    // TODO:: because of this the compression time metric might be less accurate
                    size: await getFileSize(outputPath).then((v) => v.size),
                  };
                  const mapEntry = compressedAssetsMap.get(asset.name);
                  if (mapEntry) {
                    mapEntry.result.set(algorithm.name, resultMetadata);
                  } else {
                    const result = new Map<
                      CompressionAlgorithm,
                      CompressionResultMetadata
                    >();
                    result.set(algorithm.name, resultMetadata);
                    compressedAssetsMap.set(asset.name, {
                      asset,
                      result,
                    });
                  }
                } catch (e) {
                  if (e instanceof UnsupportedCompressionError) {
                    if (!wasUnsupportedCompressionErrorPrinted) {
                      wasUnsupportedCompressionErrorPrinted = true;
                      api.logger.error(e);
                    }
                  } else {
                    api.logger.error(e);
                  }
                }
              }),
            );
          }
          return acc;
        }, [] as Promise<void>[]);
        if (!promises.length) {
          api.logger.ready(LOG_PREFIX + "nothing to compress");
          return;
        }
        await Promise.all(promises);
        const compressionTime = performance.now() - compressionStartedAt;
        if (!compressedAssetsMap.size) {
          api.logger.ready(LOG_PREFIX + "nothing was compressed");
          return;
        }
        if (shouldPrintResult) {
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
            algorithms
              .map(({ name }) => chalk.bold(name.padEnd(algColWidth)))
              .join("");
          const outputLines = [header];
          const bundleSizeMap = new Map<
            CompressionAlgorithm | "base",
            number
          >();
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
                const newSize =
                  (bundleSizeMap.get(name) || 0) + resultEntry.size;
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
              formatByteSize(bundleSizeMap.get("base") || 0).padEnd(
                algColWidth,
              ),
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
          api.logger.ready(
            LOG_PREFIX +
              `compressed in ${chalk.bold(formatMs(compressionTime))}\n` +
              outputLines.join("\n"),
          );
        }
      },
    );
  },
});
