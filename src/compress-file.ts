import assert from "node:assert";
import { createReadStream, createWriteStream } from "node:fs";
import type { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import { COMPRESSED_FILE_EXTENSIONS } from "./config.ts";
import type { CompressionAlgorithmWithOptions } from "./types.ts";

export async function compressFile({
  inputPath,
  algorithm,
}: {
  inputPath: string;
  algorithm: CompressionAlgorithmWithOptions;
}): Promise<{
  outputPath: string;
}> {
  assert(
    inputPath,
    `Cannot compress file cause input path is not defined: ${inputPath}`,
  );
  const ext = COMPRESSED_FILE_EXTENSIONS[algorithm.name];
  let transform: Transform;
  if (algorithm.name === "gzip") {
    transform = zlib.createGzip(algorithm.options);
  } else if (algorithm.name === "brotli") {
    transform = zlib.createBrotliCompress(algorithm.options);
  } else if (algorithm.name === "zstd") {
    if (typeof zlib.createZstdCompress === "function") {
      transform = zlib.createZstdCompress(algorithm.options);
    } else {
      let errMessage = "";
      if (typeof (globalThis as any).Deno !== "undefined") {
        errMessage = "Zstd is not yet supported in Deno's node:zlib polyfill.";
      } else if (typeof (globalThis as any).Bun !== "undefined") {
        errMessage = "Zstd is not yet supported in Bun.";
      } else {
        errMessage = `Zstd is not supported on nodejs < 23.8.0. Detected: ${process.version}`;
      }
      throw new UnsupportedCompressionError(errMessage);
    }
  } else {
    throw new Error("Unknown compression algorithm");
  }
  const outputPath = inputPath + ext;
  await pipeline(
    createReadStream(inputPath),
    transform,
    createWriteStream(outputPath),
  );
  return { outputPath };
}

export class UnsupportedCompressionError extends Error {}
