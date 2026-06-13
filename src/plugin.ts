import type { RsbuildPlugin } from "@rsbuild/core";
import { compressAssets } from "./compress-assets.ts";
import {
  DEFAULT_COMPRESSION_ALGORITHMS,
  DEFAULT_COMPRESSION_THRESHOLD,
  DEFAULT_CONCURRENCY_LIMIT,
  DEFAULT_DISABLE_PLUGIN,
  DEFAULT_INCLUDE_ASSETS,
  DEFAULT_PRINT_RESULT,
  PLUGIN_NAME,
} from "./config.ts";
import { formatCompressionResult } from "./format-compression-result.ts";
import { matchAssetFilterRule } from "./match-asset-filter-rule.ts";
import type {
  Asset,
  CompressionAlgorithmWithOptions,
  CompressionPluginOptions,
  IncludeExtraOptions,
} from "./types.ts";
import { formatLog, getFileSize } from "./utils.ts";
import { glob } from "tinyglobby";
import path from "node:path";

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
  includeExtra: includeExtra_ = [],
  exclude,
  disabled = DEFAULT_DISABLE_PLUGIN,
  printResult: shouldPrintResult = DEFAULT_PRINT_RESULT,
}: CompressionPluginOptions = {}): RsbuildPlugin => ({
  name: PLUGIN_NAME,
  setup(api) {
    if (api.context.action !== "build") {
      api.logger.debug(
        formatLog(`skipping rsbuild action "${api.context.action}"`),
      );
      return;
    }
    if (typeof disabled === "boolean" && disabled) {
      api.logger.debug(formatLog("plugin is disabled"));
      return;
    }
    if (!algorithms_.length) {
      api.logger.warn(formatLog("empty algorithms. skipping..."));
      return;
    }

    const includeExtra: IncludeExtraOptions = Array.isArray(includeExtra_)
      ? { globs: includeExtra_ }
      : includeExtra_;
    const algorithms: CompressionAlgorithmWithOptions[] = algorithms_.map(
      (algorithm) =>
        typeof algorithm === "string" ? { name: algorithm } : algorithm,
    );

    api.onAfterEnvironmentCompile(
      async function handleEnvironmentCompilation(opts) {
        const environmentName = opts.environment.name;
        if (typeof disabled === "function" && disabled({ environmentName })) {
          api.logger.debug(formatLog("plugin is disabled"));
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

        api.logger.start(formatLog("compression started"));

        const assetsToCompressPathsSet = new Set<string>();
        const assetsToCompress = assets.reduce((acc, baseAsset) => {
          const asset: Asset = {
            name: baseAsset.name,
            size: baseAsset.size,
          };
          const shouldCompress =
            (!exclude || !matchAssetFilterRule(asset, exclude)) &&
            (!include || matchAssetFilterRule(asset, include)) &&
            asset.size &&
            asset.size >= threshold;

          if (shouldCompress) {
            assetsToCompressPathsSet.add(asset.name);
            acc.push(asset);
          }
          return acc;
        }, [] as Asset[]);
        if (includeExtra.globs.length) {
          const globResult = await glob(includeExtra.globs, {
            cwd: outputPath,
            onlyFiles: true,
            caseSensitiveMatch: includeExtra.caseSensitive,
            deep: includeExtra.depth,
            dot: includeExtra.dot,
          });
          await Promise.all(
            globResult.map(async function (assetName) {
              if (assetsToCompressPathsSet.has(assetName)) {
                api.logger.debug(
                  formatLog(
                    `${assetName} from "includeExtra" glob is matched, but it's already in the rsbuild output`,
                  ),
                );
              } else {
                assetsToCompressPathsSet.add(assetName);
              }
              try {
                const { size } = await getFileSize(
                  path.join(outputPath, assetName),
                );
                if (size >= threshold) {
                  assetsToCompress.push({ size, name: assetName });
                }
              } catch (e) {
                api.logger.error(e);
              }
            }),
          );
          api.logger.debug(
            formatLog(`Found ${globResult.length} extra assets`),
          );
        }

        const compressionResult = await compressAssets({
          algorithms,
          onError: (e) => api.logger.error(formatLog(e)),
          concurrency,
          assets: assetsToCompress,
          outputPath,
        });
        const { compressedAssetsMap, compressionTime } = compressionResult;
        if (!compressedAssetsMap.size) {
          api.logger.ready(formatLog("nothing was compressed"));
          return;
        }
        if (shouldPrintResult) {
          const message = formatCompressionResult({
            compressedAssetsMap,
            compressionTime,
            environmentName,
            algorithms,
          });
          api.logger.ready(formatLog(message));
        }
      },
    );
  },
});
