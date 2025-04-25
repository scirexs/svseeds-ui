import { existsSync } from "jsr:@std/fs@^1.0.14";
import * as p from "jsr:@std/path@^1.0.8";

type EachDescription = {
  dependencies: string[];
};
type DependencyObject = {
  components: { [key: string]: EachDescription };
};

async function main() {
  const DIR = "./src/lib/_svseeds";
  const OUT = `${DIR}/dep.json`;

  try {
    const dep = buildDependency(DIR);
    Deno.writeTextFileSync(p.resolve(OUT), JSON.stringify(dep));
  } catch (e) {
    Err.show(e);
  }
}

function buildDependency(path: string): DependencyObject {
  const dir = p.resolve(path);
  if (!existsSync(dir, { isDirectory: true })) Err.error("not exists library dir");

  const parser = new SvelteParser();
  const dep: DependencyObject = { components: {} };
  findDependFiles(dir).forEach(file => {
    dep.components[file] = parser.parse(p.join(dir, file))
  });
  return dep;
}
function findDependFiles(path: string): string[] {
  return [...Deno.readDirSync(path).filter(x => x.isFile && x.name.endsWith(".svelte")).map(x => x.name)];
}

class SvelteParser {
  #REGEX = {
    import: /import.+from\s+['"]\.\/([^'"]+)\.svelte['"];/g,
    version: /\/\/ version: (\d+.\d+.\d+)/,
  };

  parse(path: string): EachDescription {
    const code = Deno.readTextFileSync(path);
    const dependencies = this.#extractDeps(code);
    return { dependencies };
  }
  #extractDeps(code: string): string[] {
    const ret: string[] = [];
    let match;
    while ((match = this.#REGEX.import.exec(code)) != null) {
      ret.push(`${match[1]}.svelte`);
    }
    return ret;
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

await main();
