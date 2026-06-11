import path from "node:path";
import pLimit from "p-limit";
import { compressFile, UnsupportedCompressionError } from "./compress-file.ts";
import type {
  Asset,
  CompressionAlgorithm,
  CompressionAlgorithmWithOptions,
} from "./types.ts";
import { getFileSize } from "./utils.ts";

export interface CompressionResultMetadata {
  path: string;
  size: number;
}
export type CompressedAssetsMap = Map<
  string,
  {
    asset: Asset;
    result: Map<CompressionAlgorithm, CompressionResultMetadata>;
  }
>;
export async function compressAssets({
  assets,
  outputPath,
  concurrency,
  algorithms,
  onError,
}: {
  assets: Asset[];
  outputPath: string;
  concurrency: number;
  algorithms: CompressionAlgorithmWithOptions[];
  onError?: (e: any) => any;
}) {
  const compressedAssetsMap: CompressedAssetsMap = new Map();
  const limit = pLimit({ concurrency });
  const compressionStartedAt = performance.now();
  let wasUnsupportedCompressionErrorPrinted = false;
  const promises = assets.reduce(function (acc, asset) {
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
                onError?.(e);
              }
            } else {
              onError?.(e);
            }
          }
        }),
      );
    }
    return acc;
  }, [] as Promise<void>[]);
  await Promise.all(promises);
  const compressionTime = performance.now() - compressionStartedAt;
  return {
    compressedAssetsMap,
    compressionTime,
  };
}
