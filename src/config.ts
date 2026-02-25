import chalk from "chalk";

export const PLUGIN_NAME = "rsbuild:compression";
export const LOG_PREFIX = chalk.blue("compression") + ": ";
export const SUPPORTED_ALGORITHMS = ["gzip", "brotli", "zstd"] as const;
export type CompressionAlgorithm = (typeof SUPPORTED_ALGORITHMS)[number];

export const DEFAULT_COMPRESSION_ALGORITHMS: CompressionAlgorithm[] = [
  "gzip",
  "brotli",
];
export const DEFAULT_CONCURRENCY_LIMIT = 4;
export const DEFAULT_COMPRESSION_THRESHOLD = 0;
export const DEFAULT_INCLUDE_ASSETS =
  /\.(js|mjs|cjs|css|html|txt|xml|json|wasm|svg)$/i;
export const DEFAULT_PRINT_RESULT = true;
export const DEFAULT_DISABLE_PLUGIN = false;

export const COMPRESSED_FILE_EXTENSIONS: Record<CompressionAlgorithm, string> =
  {
    brotli: ".br",
    gzip: ".gz",
    zstd: ".zst",
  };
