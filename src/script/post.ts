export { post };

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import * as p from "node:path";

type Pkg = Record<string, unknown>;

const ROOT = ".";
const DIST = "./dist";

post();

function post() {
  try {
    const pkg = readPkg();
    assertDist();
    makePkg(pkg);
    makeJsr(pkg);
    makeMod();
    copyMeta();
    cleanGen();
  } catch (e) {
    Err.show(e);
    process.exit(1);
  }
}

function readPkg(): Pkg {
  return JSON.parse(readFileSync(p.resolve(ROOT, "package.json"), "utf-8")) as Pkg;
}
function assertDist() {
  const dist = p.resolve(DIST);
  if (!existsSync(dist) || !statSync(dist).isDirectory()) Err.error("not exists dist dir");
}
function makePkg(pkg: Pkg) {
  const clean = { ...pkg };
  delete clean.scripts;
  delete clean.devDependencies;
  delete clean.imports;
  writeJson("package.json", clean);
}
function makeJsr(pkg: Pkg) {
  if (typeof pkg.version !== "string") Err.error("package version is invalid");
  writeJson("jsr.json", {
    name: "@svseeds/ui",
    version: pkg.version,
    license: "MIT",
    exports: "./mod.ts",
    publish: {
      include: ["_svseeds/", "mod.ts", "README.md", "LICENSE"],
      exclude: ["_svseeds/_core.js", "_svseeds/*.d.ts"],
    },
  });
}
function makeMod() {
  writeFileSync(
    p.resolve(DIST, "mod.ts"),
    `/**
 * For more information, see the README.md or visit:
 * https://github.com/scirexs/svseeds-ui
 */

console.warn(String.raw\`
⚠️  This package is not able to import directly with jsr.
   Please use either of the followings.

   1. Add package with npm:
      deno add npm:svseeds
   OR
   2. Copy components of ".svelte" file by CLI tool:
      deno run jsr:@svseeds/cli
\`);

export { };
`,
  );
}
function copyMeta() {
  mkdirSync(p.resolve(DIST, "_svseeds"), { recursive: true });
  copyFileSync(p.resolve(ROOT, "src/lib/_svseeds/_core.ts"), p.resolve(DIST, "_svseeds/_core.ts"));
  copyFileSync(p.resolve(ROOT, "README.md"), p.resolve(DIST, "README.md"));
  copyFileSync(p.resolve(ROOT, "LICENSE"), p.resolve(DIST, "LICENSE"));
}
function cleanGen() {
  rmSync(p.resolve(ROOT, "src/lib/index.ts"), { force: true });
  rmSync(p.resolve(ROOT, "src/lib/_svseeds/dep.json"), { force: true });
}
function writeJson(file: string, value: unknown) {
  writeFileSync(p.resolve(DIST, file), `${JSON.stringify(value, null, 2)}\n`);
}

class Err {
  static error(msg: string) {
    throw new Error(`error: ${msg}`);
  }
  static show(e: unknown) {
    if (e instanceof Error) {
      console.error(`${e.message}`);
    } else {
      throw e;
    }
  }
}
