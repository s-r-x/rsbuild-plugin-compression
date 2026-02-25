# rsbuild-plugin-compression

A compression plugin for rsbuild

[Docs](https://s-r-x.github.io/rsbuild-plugin-compression)

## Usage

```sh
npm install -D rsbuild-plugin-compression
```
* * *
```typescript
// rsbuild.config.ts
import {defineConfig} from "@rsbuild/core";
import {pluginCompression} from "rsbuild-plugin-compression";
export default defineConfig({
  plugins: [pluginCompression()]
});
```
