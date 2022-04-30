
/*
 * Permissions:
 *   Nunjucks: requires permission to read ./ (CWD)
 */

// import {ensureDir} from "https://deno.land/std/fs/mod.ts";
import nunjucks from "https://deno.land/x/nunjucks/mod.js";
import {throw_on_fail, run} from "./Process.ts";
import {split_whitespace} from "./String.ts";
import {mk, write_text_file, download, files_of} from "./Shell.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { bold, yellow } from "https://deno.land/std/fmt/colors.ts";

const DEFAULT_OPTIONS = {
  "worker.ts":   "./src/worker.ts",
  "worker.js":   "./dist/worker.mjs",
  "html":        {}
};

function _run(cmd: string) {
  return throw_on_fail(run(cmd, "inherit", "verbose"));
} // async function

export async function css(file_path: string) {
  const { success, stdout, stderr } = await _run(`npx lessc ${file_path.replace(/\.css$/, ".less")}`);
  if (!success)
    throw new Error(stderr);
  return stdout;
} // export async function

export async function js(file_path: string) {
  const { stdout } = await _run(`deno bundle ${file_path.replace(/\.js$/, ".ts")}`);
  return stdout;
} // export async function

export function html(file_path: string, kv: Record<string, any>) {
  return(
    nunjucks.render(file_path.replace(/\.html/, ".njk"), kv)
  );
} // export function

function print_wrote(x: string) {
  console.error(`=== ${bold('Wrote')}: ${yellow(x)}`);
} // function

export async function build_worker(WORKER_TS: string, WORKER_JS: string) {
  const filename = WORKER_TS;
  const new_file = WORKER_JS;
  const { stdout } = await _run(`deno bundle ${filename}`);
  write_text_file(new_file, stdout);
  print_wrote(new_file);
} // export async function

export function raw_www_files(): string[] {
  const exts = split_whitespace(".ts .less .njk");
  return files_of('.', 8).filter(f => exts.includes(path.extname(f)) && path.basename(f).charAt(0) !== "_");
} // export function

function assert_files_in(dir: string, files: string[]) {
  if (files.length === 0) {
    throw new Error(`--- No files found in: ${dir}`);
  }
} // function

export async function build_www(group: "css"|"js"|"html", public_path: string, RAW_CONFIG: Record<string, any>) {
  const CONFIG      = Object.assign({}, DEFAULT_OPTIONS, RAW_CONFIG);
  const PUBLIC      = CONFIG.public;
  const HTML_CONFIG = CONFIG.html || {};
  const filepath = path.join(PUBLIC, public_path);

  switch (group) {
    case "css": {
      console.log(
        await css(filepath)
      );
      break;
    }

    case "js": {
      console.log(
        await js(filepath)
      );
      break;
    }

    case "html": {
      console.log(
        html(filepath, HTML_CONFIG)
      )
      break;
    }
  } // switch

} // export async function

export async function download_normalize_css(vendor: string) {
  return await download(
    "https://necolas.github.io/normalize.css/latest/normalize.css",
    path.join(vendor, "normalize.css")
  );
} // export async function

export async function download_alpine_js(vendor: string) {
  return await download(
    "https://unpkg.com/alpinejs@latest/dist/cdn.min.js",
    path.join(vendor, "alpine.js")
  );
} // export async function

export async function build_update(src_dir: string) {
  const vendor = path.join(src_dir, "vendor");
  mk(vendor + '/');
  return await Promise.all([
    download_normalize_css(vendor),
    download_alpine_js(vendor)
  ]);
} // export async function

export async function build_app(group: "app"|"public"|"worker"|"update", RAW_CONFIG: Record<string, any>) {
  const CONFIG      = Object.assign({}, DEFAULT_OPTIONS, RAW_CONFIG);
  const PUBLIC      = CONFIG.public;
  const HTML_CONFIG = CONFIG.html || {};
  const WORKER_TS   = CONFIG["worker.ts"];
  const WORKER_JS   = CONFIG["worker.js"];

  switch (group) {
    case "app": {
      await Promise.all([
        build_public(HTML_CONFIG),
        build_worker(WORKER_TS, WORKER_JS)
      ]);
      break;
    }

    case "public": {
      await build_public(HTML_CONFIG);
      break;
    }

    case "worker": {
      await build_worker(WORKER_TS, WORKER_JS);
      break;
    }

    case "update": {
      await build_update(PUBLIC);
      break;
    }

    default: {
      throw new Error(`!!! Unknown build_app command: ${group}`);
    }
  } // switch

} // export async function

export async function build_public(site: Record<string, any>) {
  const files = raw_www_files();
  assert_files_in("./", files);

  const promises = files.map(f => build_and_write_www_file(f, site));
  return await Promise.all(promises);
} // export async function

export async function build_and_write_www_file(f: string, o: Record<string, any>) {
  const ext = path.extname(f);
  switch (ext) {
    case ".njk": {
      const new_file = f.replace( /\.njk$/, ".html",);
      await Deno.writeTextFile(new_file, html(f, o));
      print_wrote(new_file);
      return new_file;
    } // case

    case ".less": {
      const new_file = f.replace( /.less$/, ".css",);
      await Deno.writeTextFile(new_file, await css(f));
      print_wrote(new_file);
      return new_file
    } // case

    case ".ts": {
      const new_file = f.replace(/.ts$/, ".mjs");
      await Deno.writeTextFile(new_file, await js(f));
      print_wrote(new_file);
      return new_file;
    } // case

    default: {
      throw new Error(`Unknown file type: (${ext}) ${f}`);
    } // default
  } // switch
} // export async function

