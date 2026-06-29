export { buildDependency, dedupeExportNames, extractExportNames, extractSvelteDependencies, makeDep, makeIndex };

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import * as p from "node:path";

type EachDescription = {
  dependencies: string[];
};
type DependencyObject = {
  components: { [key: string]: EachDescription };
};

function makeIndex() {
  const DIR = "./src/lib/_svseeds";
  const OUT = "./src/lib/index.ts";

  try {
    const index = extractExports(DIR, OUT);
    writeFileSync(p.resolve(OUT), index);
  } catch (e) {
    Err.show(e);
  }
}

function makeDep() {
  const DIR = "./src/lib/_svseeds";
  const OUT = `${DIR}/dep.json`;

  try {
    const dep = buildDependency(DIR);
    writeFileSync(p.resolve(OUT), JSON.stringify(dep));
  } catch (e) {
    Err.show(e);
  }
}

function extractExports(path: string, out: string): string {
  const dir = p.resolve(path);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) Err.error("not exists library dir");

  const parser = new ExportParser(out);
  return findFiles(path)
    .map((file) => parser.parse(file))
    .join("");
}
function findFiles(path: string): string[] {
  const files = readdirSync(path, { withFileTypes: true })
    .filter((x) => x.isFile())
    .map((x) => x.name);
  return [...getExtPath(files, path, ExportParser.EXT.ts), ...getExtPath(files, path, ExportParser.EXT.svelte)];
}
function getExtPath(files: string[], path: string, ext: string): string[] {
  return files
    .filter((x) => p.extname(x) == ext)
    .map((x) => p.join(path, x))
    .toSorted((x, y) => x.localeCompare(y));
}

function buildDependency(path: string): DependencyObject {
  const dir = p.resolve(path);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) Err.error("not exists library dir");

  const dep: DependencyObject = { components: {} };
  findDependFiles(dir).forEach((file) => {
    const code = readFileSync(p.join(dir, file), "utf-8");
    dep.components[file] = { dependencies: extractSvelteDependencies(code, file) };
  });
  return dep;
}
function findDependFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true })
    .filter((x) => x.isFile() && x.name.endsWith(".svelte"))
    .map((x) => x.name);
}

function extractExportNames(code: string, ext: ".ts" | ".svelte"): string[] {
  const parser = new ExportParser("./src/lib/index.ts");
  return parser.extract(code, `./src/lib/_svseeds/Input${ext}`);
}

function extractSvelteDependencies(code: string, self = ""): string[] {
  const parser = new SvelteParser();
  return parser.extract(code).filter((x) => x !== self);
}
function dedupeExportNames(names: string[], seen = new Set<string>()): string[] {
  return names.filter((x) => {
    const name = exportName(x);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}
function exportName(value: string): string {
  const raw = value.replace(/^type\s+/, "").trim();
  const match = raw.match(/\bas\s+(\w+)$/);
  return match?.[1] ?? raw;
}

class ExportParser {
  static EXT = { svelte: ".svelte", ts: ".ts" };
  #REGEX = {
    type: /export\s+(?:type|interface)\s+(\w+)(?:\s*<[^>]*>)?(?:\s+extends\b|\s*[={])/g,
    each: /export\s+(?:function|class|const|let|var)\s+(\w+)\s*[\s|=|{|(]/g,
    bulk: /export\s*{([^}]*)}/g,
  };
  #out;
  #path = "";
  #match: RegExpExecArray | null = null;
  #code = "";
  #names = new Set<string>();

  constructor(out: string) {
    this.#out = p.dirname(out);
  }
  parse(path: string): string {
    if (!Object.values(ExportParser.EXT).includes(p.extname(path))) return "";
    this.#prep(path);
    return this.#getTemplate(this.extract(this.#code, this.#path));
  }
  extract(code: string, path: string): string[] {
    if (!Object.values(ExportParser.EXT).includes(p.extname(path))) return [];
    this.#prepCode(code, path);
    switch (p.extname(path)) {
      case ExportParser.EXT.svelte:
        return [this.#default(ExportParser.EXT.svelte), ...this.#extract("type"), ...this.#extract("each")];
      case ExportParser.EXT.ts:
        return [...this.#extract("bulk"), ...this.#extract("type"), ...this.#extract("each")];
    }
    return [];
  }
  #prep(path: string) {
    this.#prepCode(readFileSync(path, "utf-8"), path);
  }
  #prepCode(code: string, path: string) {
    this.#code = code;
    this.#path = path;
  }
  #default(ext: string): string {
    return `default as ${p.basename(this.#path).replaceAll(ext, "").replace("_", "")}`;
  }
  #extract(type: "type" | "each" | "bulk"): string[] {
    const ret = [];
    this.#REGEX[type].lastIndex = 0;
    while ((this.#match = this.#REGEX[type].exec(this.#code)) != null) {
      ret.push(this.#match[1]);
    }
    return this.#format(type, ret);
  }
  #format(type: "type" | "each" | "bulk", result: string[]): string[] {
    if (type == "each") return result;
    if (type == "type") return result.map((x) => `type ${x}`);
    return result
      .map((x) =>
        x
          .split(",")
          .map((x) => x.trim())
          .filter((x) => x),
      )
      .flat(Infinity) as string[];
  }
  #getTemplate(exports: string[]): string {
    const filtered = dedupeExportNames(exports, this.#names);
    if (!filtered.length) return "";
    return `export { ${filtered.join(", ")} } from "${this.#getFromPath()}";\n`;
  }
  #getFromPath(): string {
    const file = this.#path.endsWith(ExportParser.EXT.ts) ? this.#path.replace(ExportParser.EXT.ts, "") : this.#path;
    const path = p.relative(this.#out, file);
    if (["/", ".", ".."].some((x) => path.startsWith(x))) return path;
    return `./${path}`;
  }
}

class SvelteParser {
  #REGEX = {
    import: /import.+from\s+['"]\.\/([^'"]+)\.svelte['"];/g,
    version: /\/\/ version: (\d+.\d+.\d+)/,
  };

  extract(code: string): string[] {
    const ret: string[] = [];
    let match;
    this.#REGEX.import.lastIndex = 0;
    while ((match = this.#REGEX.import.exec(code)) != null) {
      ret.push(`${match[1]}.svelte`);
    }
    return [...new Set(ret)];
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
    if (this.#code) process.exit(this.#code);
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

if (import.meta.main) {
  makeIndex();
  makeDep();
}
