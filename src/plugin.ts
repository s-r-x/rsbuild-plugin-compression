import type { RsbuildPlugin } from "@rsbuild/core";
import { compressAssets } from "./compress-assets.ts";
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
import { formatCompressionResult } from "./format-compression-result.ts";
import { matchAssetFilterRule } from "./match-asset-filter-rule.ts";
import type {
  Asset,
  CompressionAlgorithmWithOptions,
  CompressionPluginOptions,
} from "./types.ts";

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

        const compressionResult = await compressAssets({
          algorithms,
          onError: (e) => api.logger.error(LOG_PREFIX + e),
          concurrency,
          assets: assets.reduce((acc, baseAsset) => {
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
            } else {
              acc.push(asset);
              return acc;
            }
          }, [] as Asset[]),
          outputPath,
        });
        if (!compressionResult) {
          return;
        }
        const { compressedAssetsMap, compressionTime } = compressionResult;
        if (!compressedAssetsMap.size) {
          api.logger.ready(LOG_PREFIX + "nothing was compressed");
          return;
        }
        if (shouldPrintResult) {
          const message = formatCompressionResult({
            compressedAssetsMap,
            compressionTime,
            environmentName,
            algorithms,
          });
          api.logger.ready(LOG_PREFIX + message);
        }
      },
    );
  },
});
