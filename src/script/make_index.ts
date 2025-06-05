export { makeIndex };

import { existsSync } from "jsr:@std/fs@^1.0.14";
import * as p from "jsr:@std/path@^1.0.8";

function makeIndex() {
  const DIR = "./src/lib/_svseeds";
  const OUT = "./src/lib/index.ts";

  try {
    const index = extractExports(DIR, OUT);
    Deno.writeTextFileSync(p.resolve(OUT), index);
  } catch (e) {
    Err.show(e);
  }
}

function extractExports(path: string, out: string): string {
  const dir = p.resolve(path);
  if (!existsSync(dir, { isDirectory: true })) Err.error("not exists library dir");

  const parser = new ExportParser(out);
  return findFiles(path).map((file) => parser.parse(file)).join("");
}
function findFiles(path: string): string[] {
  const files = [...Deno.readDirSync(path).filter((x) => x.isFile).map((x) => x.name)];
  return [
    ...getExtPath(files, path, ExportParser.EXT.ts),
    ...getExtPath(files, path, ExportParser.EXT.svelte),
  ];
}
function getExtPath(files: string[], path: string, ext: string): string[] {
  return files.filter((x) => p.extname(x) == ext)
    .map((x) => p.join(path, x))
    .toSorted((x, y) => x.localeCompare(y));
}

class ExportParser {
  static EXT = { svelte: ".svelte", ts: ".ts" };
  #REGEX = {
    type: /export\s+(?:type|interface)\s+(\w+)\s*=/g,
    each: /export\s+(?:function|class|const|let|var)\s+(\w+)\s*[\s|=|{|(]/g,
    bulk: /export\s*{([^}]*)}/g,
  };
  #out;
  #path = "";
  #match: RegExpExecArray | null = null;
  #code = "";

  constructor(out: string) {
    this.#out = p.dirname(out);
  }
  parse(path: string): string {
    if (!Object.values(ExportParser.EXT).includes(p.extname(path))) return "";
    this.#prep(path);
    switch (p.extname(path)) {
      case ExportParser.EXT.svelte:
        return this.#getTemplate([
          this.#default(ExportParser.EXT.svelte),
          ...this.#extract("type"),
          ...this.#extract("each"),
        ]);
      case ExportParser.EXT.ts:
        return this.#getTemplate([
          ...this.#extract("bulk"),
          ...this.#extract("type"),
          ...this.#extract("each"),
        ]);
    }
    return "";
  }
  #prep(path: string) {
    this.#code = Deno.readTextFileSync(path);
    this.#path = path;
  }
  #default(ext: string): string {
    return `default as ${p.basename(this.#path).replaceAll(ext, "").replace("_", "")}`;
  }
  #extract(type: "type" | "each" | "bulk"): string[] {
    const ret = [];
    while ((this.#match = this.#REGEX[type].exec(this.#code)) != null) {
      ret.push(this.#match[1]);
    }
    return this.#format(type, ret);
  }
  #format(type: "type" | "each" | "bulk", result: string[]): string[] {
    if (type == "each") return result;
    if (type == "type") return result.map((x) => `type ${x}`);
    return result.map((x) => x.split(",").map((x) => x.trim()).filter((x) => x)).flat(Infinity) as string[];
  }
  #getTemplate(exports: string[]): string {
    return `export { ${exports.join(", ")} } from "${this.#getFromPath()}";\n`;
  }
  #getFromPath(): string {
    const file = this.#path.endsWith(ExportParser.EXT.ts) ? this.#path.replace(ExportParser.EXT.ts, "") : this.#path;
    const path = p.relative(this.#out, file);
    if (["/", ".", ".."].some((x) => path.startsWith(x))) return path;
    return `./${path}`;
  }
}

class Err {
  static CANCEL_CODE = -1;
  #code = 0;

  show(e: unknown) {
    Err.show(e);
    if (e instanceof Error && e.cause !== Err.CANCEL_CODE) this.#code = 1;
  }
  exitError() {
    if (this.#code) Deno.exit(this.#code);
  }

  static error(msg: string) {
    throw new Error(`error: ${msg}`);
  }
  static cancel() {
    throw new Error("cancelled", { cause: Err.CANCEL_CODE });
  }
  static show(e: unknown) {
    if (e instanceof Error) {
      console.error(`${e.message}`);
    } else {
      throw e;
    }
  }
}
