// Bundle the content script.
//
// MV3 forbids loading remote scripts, so @mozilla/readability has to be
// compiled into the content script rather than pulled from a CDN. Everything
// else in the extension is plain ES modules Chrome loads directly.

import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["content/content.js"],
  bundle: true,
  format: "iife",          // content scripts are not modules
  target: "chrome116",
  outfile: "content/content.bundle.js",
  legalComments: "none",
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("watching content script…");
} else {
  await esbuild.build(options);
  console.log("built content/content.bundle.js");
}
