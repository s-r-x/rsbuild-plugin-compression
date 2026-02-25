import type { BrotliOptions, ZlibOptions } from "node:zlib";
import type { CompressionAlgorithm } from "./config.ts";

export type Asset = {
  name: string;
  /**
   * in bytes
   */
  size: number;
};
export type { CompressionAlgorithm };
export type AssetFilterRule = string | RegExp | ((asset: Asset) => boolean);
export type AssetFilterRules = AssetFilterRule | AssetFilterRule[];

export interface CompressionPluginOptions {
  /**
   * How many assets will be compressed simultaneously
   * @defaultValue 4
   */
  concurrency?: number;
  /**
   * Compression algorithms to apply
   * @defaultValue ["gzip", "brotli"]
   * @example
   * ```ts
   * ["gzip", "brotli", "zstd"]
   * ```
   * @example
   * ```ts
   * [{name: "gzip", options: {level: 9}}, "zstd"]
   * ```
   */
  algorithms?: (CompressionAlgorithm | CompressionAlgorithmWithOptions)[];
  /**
   * Minimum asset size (in bytes) to apply the compression
   * @defaultValue 0
   */
  threshold?: number;
  /**
   * Compression will be applied only to the assets matching any of the provided conditions
   * @defaultValue /\.(js|mjs|cjs|css|html|txt|xml|json|wasm|svg)$/i
   * @example
   * ```ts
   * (asset) => asset.size > 16000 && asset.name.endsWith(".js")
   * ```
   * @example
   * ```ts
   * ["my-script", "my-html"]
   * ```
   * @example
   * ```ts
   * [/\.(js|mjs)$/i]
   * ```
   */
  include?: AssetFilterRules;
  /**
   * Compression won't be applied to the assets matching any of the provided conditions
   * @example
   * ```ts
   * (asset) => asset.name.endsWith(".txt")
   * ```
   * @example
   * ```ts
   * [/\.(html|json)$/i]
   * ```
   * @example
   * ```ts
   * ["my-script", "my-html"]
   * ```
   */
  exclude?: AssetFilterRules;
  /**
   * Disable the plugin?
   * @defaultValue false
   * @example
   * ```ts
   * ({environmentName}) => environmentName !== "web"
   * ```
   */
  disabled?: boolean | ((ctx: { environmentName: string }) => boolean);
  /**
   * Print the compression result?
   * @defaultValue true
   */
  printResult?: boolean;
}

export type BaseAlgorithmWithOptions<
  TAlgorithmName extends CompressionAlgorithm,
  TAlgorithmOptions,
> = {
  name: TAlgorithmName;
  options?: TAlgorithmOptions;
};
export type GzipAlgorithmWithOptions = BaseAlgorithmWithOptions<
  "gzip",
  ZlibOptions
>;
export type BrotliAlgorithmWithOptions = BaseAlgorithmWithOptions<
  "brotli",
  BrotliOptions
>;
export type ZstdAlgorithmWithOptions = BaseAlgorithmWithOptions<
  "zstd",
  ZstdOptions
>;
export type CompressionAlgorithmWithOptions =
  | GzipAlgorithmWithOptions
  | BrotliAlgorithmWithOptions
  | ZstdAlgorithmWithOptions;

// copypasted from nodejs types
export interface ZstdOptions {
  /**
   * @default constants.ZSTD_e_continue
   */
  flush?: number | undefined;
  /**
   * @default constants.ZSTD_e_end
   */
  finishFlush?: number | undefined;
  /**
   * @default 16 * 1024
   */
  chunkSize?: number | undefined;
  /**
   * Key-value object containing indexed
   * [Zstd parameters](https://nodejs.org/docs/latest-v24.x/api/zlib.html#zstd-constants).
   */
  params?: { [key: number]: number | boolean } | undefined;
  /**
   * Limits output size when using
   * [convenience methods](https://nodejs.org/docs/latest-v24.x/api/zlib.html#convenience-methods).
   * @default buffer.kMaxLength
   */
  maxOutputLength?: number | undefined;
  /**
   * If `true`, returns an object with `buffer` and `engine`.
   */
  info?: boolean | undefined;
  /**
   * Optional dictionary used to improve compression efficiency when compressing or decompressing data that
   * shares common patterns with the dictionary.
   * @since v24.6.0
   */
  dictionary?: NodeJS.ArrayBufferView | undefined;
}
