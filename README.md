# rsbuild-plugin-compression

A sophisticated compression plugin for rsbuild.

It compresses all assets in the output directory using compression algorithms like Gzip and Brotli.

[Docs](https://s-r-x.github.io/rsbuild-plugin-compression)

## Usage

```sh
npm install -D rsbuild-plugin-compression
```

```typescript
// rsbuild.config.ts
import {defineConfig} from "@rsbuild/core";
import {pluginCompression} from "rsbuild-plugin-compression";
export default defineConfig({
  plugins: [pluginCompression()]
});
```

## FAQ

### 1. I have them compressed, but the browser still doesn't load them. Why?

Well, this plugin does one thing only: it's up to you how you deploy and serve them. Docker, nginx, apache, etc. all have their own way to serve compressed files.

For example when you use **nginx**, let's add `brotli_static on` and verify with commands like `curl -H "Accept-Encoding: br" -I http://YOUR_URL` to see if the brotli compressed file is served.

### 2. Rsbuild already comes with a compress option, why do I need this plugin?

Yeah, it does, see API documentation at <https://rsbuild.rs/config/server/compress>.
It compresses the files on the fly, but this plugin compresses them in advance, so you can serve them with any server that supports static compressed files ;)
