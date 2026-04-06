import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Bundle open dependency so npx works standalone
  noExternal: ["open"],
});