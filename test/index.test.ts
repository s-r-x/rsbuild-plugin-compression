import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRsbuild } from "@rsbuild/core";
import { COMPRESSED_FILE_EXTENSIONS } from "../src/config.ts";
import { pluginCompression, SUPPORTED_ALGORITHMS } from "../src/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseOutputDir = path.join(__dirname, "dist");
function genOutputDir(): string {
  const outputDir = path.join(
    baseOutputDir,
    `app-${crypto.randomBytes(8).toString("base64url")}`,
  );
  return outputDir;
}
test("should compress app 1", async function () {
  const outputDir = genOutputDir();
  const appDir = path.resolve(__dirname, "app-1");
  const entrypoint = path.join(appDir, "index.ts");
  const rsbuild = await createRsbuild({
    cwd: __dirname,
    rsbuildConfig: {
      logLevel: "error",
      plugins: [
        pluginCompression({
          algorithms: ["gzip", { name: "brotli" }, "zstd"],
          threshold: 1000,
          include: [/\.(js|css|json)$/i, ".svg"],
          exclude(asset) {
            return asset.name.endsWith("radash.js");
          },
        }),
      ],
      source: {
        entry: {
          index: entrypoint,
        },
      },
      output: {
        distPath: outputDir,
        filenameHash: false,
        dataUriLimit: 0,
      },
      tools: {
        htmlPlugin: true,
      },
    },
  });
  const { stats } = await rsbuild.build();
  assert(stats, "rsbulid stats is not defined");
  const assets = stats.toJson({ assets: true })?.assets ?? [];
  const compressedAssets = new Set([
    "preact.js",
    "bootstrap.css",
    "index.js",
    "data.json",
    "nvim.svg",
  ]);
  await Promise.all(
    assets.map(async function (asset) {
      const assetName = path.basename(asset.name);
      const assetPath = path.join(outputDir, asset.name);
      return Promise.all(
        SUPPORTED_ALGORITHMS.map(async function (algorithm) {
          const ext = COMPRESSED_FILE_EXTENSIONS[algorithm];
          const compressedPath = assetPath + ext;
          const stat = await fs.stat(compressedPath).catch(() => null);
          if (compressedAssets.has(assetName)) {
            assert(stat, `${assetName} should be compressed`);
            assert(
              stat.size < asset.size,
              `The size of ${assetName + ext} should be less than the original file`,
            );
          } else {
            assert(stat === null, `${assetName} shouldn't be compressed`);
          }
        }),
      );
    }),
  );
});
test.after(async function cleanup() {
  await fs.rm(baseOutputDir, { recursive: true, force: true });
});
