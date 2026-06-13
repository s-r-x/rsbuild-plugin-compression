import { stat } from "node:fs/promises";
import prettyBytes from "pretty-bytes";
import { LOG_PREFIX } from "./config.ts";

export function formatMs(ms: number): string {
  return (ms / 1000).toFixed(2) + "s";
}

export function formatByteSize(byteSize: number): string {
  if (!byteSize) return "0";
  return prettyBytes(byteSize);
}

export async function getFileSize(filePath: string): Promise<{
  size: number;
}> {
  const { size } = await stat(filePath);
  return { size };
}

export function formatLog(message: string): string {
  return LOG_PREFIX + message;
}
