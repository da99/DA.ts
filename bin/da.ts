#!/usr/bin/env -S deno run --allow-run --allow-net --allow-read --allow-write=./

import {inspect,meta_url, match, values, not_found} from "../src/CLI.ts";
import {pgrep_f, pstree_p, keep_alive, run, exit} from "../src/Process.ts";

import {build_www, build_app} from "../src/Build_WWW.ts";
import { yellow, bold } from "https://deno.land/std/fmt/colors.ts";

// import {Text_File, find_parent_file} from "../src/FS.ts";
// import {exists, ensureDirSync} from "https://deno.land/std/fs/mod.ts";
import {create_from_template} from "./_.template.ts";
import {split_whitespace} from "../src/String.ts";
import {install_latest as nodejs_install_latest} from "../src/NodeJS.ts";
import {start} from "./_.file_server.ts";

import * as path from "https://deno.land/std/path/mod.ts";

meta_url(import.meta.url);

if (match(".gitignore")) {
  await create_from_template("gitignore", ".gitignore");
} // if

if (match("sh bin/update")) {
  await create_from_template("bin_update.sh", "bin/update");
} // if

if (match("ts bin/test")) {
  await create_from_template("spec_run.ts", "bin/test");
  await create_from_template("spec___.ts", "spec/__.ts");
} // if

if (match("spec <Name>")) {
  const [name] = values() as string[];
  create_from_template("spec.ts", `spec/${name}.ts`);
} // if

if (match("src <Name>")) {
  const [name] = values() as string[];
  create_from_template("src.ts", `src/${name}.ts`);
} // if

if (match("<zsh|sh|ts> <relative/path/to/file>")) {
  let [extension, fpath] = values() as string[];
  if (["bin", "src", "spec"].includes(path.basename(fpath))) {
    const PROJECT_NAME = path.basename(Deno.cwd());
    fpath = path.join(fpath, PROJECT_NAME)
  }

  create_from_template(`bin.${extension}`, fpath);
} // if

if (match("keep alive this: <...args>")) {
  const [cmd] = values() as string[][];
  await keep_alive(cmd);
} // if

if (match("keep alive these: <...args>")) {
  const [cmds] = values() as string[][];
  await keep_alive(...cmds);
} // if

// # =============================================================================
// # === File Server related:
// # =============================================================================
if (match(
  "file server start <json>",
  inspect({"port": 5555, "public_dir": "dist/Public", "html":{}})
)) {
  await start(JSON.parse((values()[0] as string).trim()));
} // if

if (match("file server stop")) {
  const {code} = await run(split_whitespace(`pkill -INT -f`).concat(['^deno run .+ file-server start .+']), "inherit", "verbose-exit");
  Deno.exit(code);
} // if

if (match("file server reload www-browser")) {
  await exit(run(['pkill', '-USR1', '-f', '^deno run .+bin/_.file_server.ts'], "inherit", "verbose"));
} // if

// =============================================================================
// === Downlaod related:
// =============================================================================
if (match("latest release <repo/name> <substring>")) {
  const [repo, substring] = values() as string[];
  let url = repo
  if (url.indexOf("http") === -1) {
    url = `https://api.github.com/repos/${repo}/releases/latest`
  }
  let resp = await fetch(url as string);
  let json = await resp.json();
  for (const x of json.assets) {
    let download = (x as any)['browser_download_url'] as string | null;
    if (download && download.indexOf(substring) > -1)
      console.log(download)
  }
}

// # =============================================================================
// # === Build related:
// # =============================================================================
if (match("build [css|js|html] <url_path> <json_config>")) {
  const [group, filepath, config] = values();
  await build_www(
    group as "css" | "js" | "html",
    filepath as string, JSON.parse(config as string)
  );
} // if

if (match("build [app|public|worker|update] <json_config>")) {
  const [group, config] = values();
  await build_app(
    group as "app" | "public" | "worker" | "update",
    JSON.parse(config as string)
  );
} // if


// # =============================================================================
// # === NodeJS related:
// # =============================================================================
if (match("nodejs install latest")) {
  nodejs_install_latest();
} // if

// # =============================================================================
// # === Process related:
// # =============================================================================
if (match("ls child pids <pattern>")) {
  const [pattern] = values();
  let pids = await pgrep_f(pattern as string);
  (
    await Promise.all(pids.map(x => pstree_p(x)))
  ).flat().forEach(x => console.log(x));
} // if


// =============================================================================
// Finish:
// =============================================================================
not_found();
// =============================================================================

