#!/usr/bin/env -S deno run --allow-run=fd,find,git --allow-net=storage.bunnycdn.com --allow-env --allow-read=./ --allow-write=./

// import * as path from "https://deno.land/std/path/mod.ts";
import {meta_url, match, not_found, inspect} from "../src/CLI.ts";
import { green, red, yellow, bold } from "https://deno.land/std/fmt/colors.ts";
import {content_type, human_bytes, MB, sort_by_key, count} from "../src/Function.ts";
import {fd, columns, shell, shell_ignore_errors} from "../src/Shell.ts";
import { readableStreamFromReader } from "https://deno.land/std/streams/conversion.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {
  UP_CASE,
  remove_pattern,
  begin_dot_slash,
  path_to_filename,
  env_or_throw
} from "../src/Function.ts";

meta_url(import.meta.url);

export type CONFIG_OPTIONS    = "PROJECT_NAME" | "BUNNY_DIR" | "BUNNY_URL" | "BUNNY_KEY" | "VERBOSE";
export const FILE_TS          = ".FILES.ts";
export const IS_VERBOSE       = (Deno.env.get('VERBOSE') || "").trim().toUpperCase().length > 0;
export const GIT_PROJECT_NAME = (await shell_ignore_errors("git", "remote get-url origin"))
  .default_non_empty_string(null, (x: string) => x.replace(/\.git$/, '').split('/').pop());

export interface Bunny_Response {
  HttpCode: 200 | 201 | 400 | 404;
  Message: "Object Not Found";
}

export interface Local_File {
  local_path: string;
  remote_path: string;
  sha256: string;
  bytes: number;
  content_type: string;
};

export interface Upload_Result {
  local_file: Local_File;
  ok: boolean;
  response: Response;
  bunny: Bunny_Response;
};

export interface Bunny_File {
  "Guid":            string;
  "StorageZoneName": string;
  "Path":            string;
  "ObjectName":      string;
  "Length":          number;
  "LastChanged":     string;
  "IsDirectory":     boolean;
  "ServerId":        number;
  "UserId":          string;
  "DateCreated":     string;
  "StorageZoneId":   number;
  "Checksum":        string;
};

export interface Delete_Status extends Bunny_File {
  ok: boolean;
  json: Bunny_Response;
};

export interface Exported_File {
  path:         string;
  url:          string;
  sha256:       string;
  content_type: string;
  bytes:        number;
};

// =============================================================================
// IF MATCH:
// =============================================================================

if (match(`project name`)) {
  const name = await project_name();
  console.log(name);
} // if

if (match("files . -v")) {
  const files = await local_files();
  for (const f of files) {
    verbose_log_file(f.local_path, f);
  } // for
} // if

if (match("files .", "Be sure to 'cd' into the Public directory you want to upload.")) {
  const files = await local_files();
  for (const f of files) {
    if (f.bytes > MB)
      console.log(`${human_bytes(f.bytes)} ${f.local_path} ${f.remote_path} ${f.content_type}`)
    else
      console.log(`${f.local_path} ${f.remote_path} ${f.content_type}`)
  } // for
} // if

if (match(`files remote -v`)) {
  const files   = await remote_files();

  if (files.length === 0)
    console.error(`${yellow('===')} No files found for: ${bold(config("BUNNY_DIR"))}`);

  for (const f of files) {
    verbose_log_file(f.ObjectName, f);
  } // for
} // if

if (match(`files remote`)) {
  const dirname = await project_name();
  const files   = await remote_files();

  if (files.length === 0)
    console.error(`${yellow('===')} No files found for: ${bold(dirname)}`);

  for (const f of files) {
    if (f.Length > MB)
      console.log(`${f.ObjectName} ${bold(human_bytes(f.Length))}`);
    else
      console.log(`${f.ObjectName}`);
  } // for
} // if

if (match(`files to upload -v`)) {
  for (const lf of (await uploadable_local_files())) {
    verbose_log_local_file(lf);
  } // for
} // if

if (match(`files to upload`)) {
  for (const lf of (await uploadable_local_files())) {
    console.log(`${bold(lf.local_path)} ${lf.remote_path}`);
  } // for
} // if

if (match(`upload files`)) {
  const url   = config("UPLOAD_PATH");
  console.error(`=== URL: ${yellow(url)}`);
  const results = await upload_files();
  for (const success of results) {
    if (!success.ok)
      continue;
    console.log(`${green("✓")} ${success.local_file.local_path} ${bold(success.bunny.HttpCode.toString())} ${success.bunny.Message}`)
  } // for

  for (const fail of results) {
    if (fail.ok)
      continue;
    console.log(`${red("✗")} ${fail.local_file.local_path} ${red(fail.bunny.HttpCode.toString())} ${bold(fail.bunny.Message)}`)
  } // for
} // if

if (match('old remote files -v')) {
  const dirname = await project_name();
  const old_bunnys = await old_files();
  for (const bf of old_bunnys) {
    console.log(`${yellow(bf.ObjectName)}`)
    for (const [k,v] of Object.entries(bf)) {
      console.log(`  ${bold(k)}: ${v}`);
      switch (k) {
        case "Length": {
          console.log(`  ${bold("human bytes")}: ${human_bytes(v)}`);
        } // case
      } // switch
    } // for
  } // for
  if (old_bunnys.length === 0)
    console.error(`=== ${yellow(`No old remote files`)} in ${bold(dirname)}.`);
} // if

if (match('old remote files')) {
  const dirname = await project_name();
  const old_bunnys = await old_files();
  for (const bf of old_bunnys) {
    if (bf.Length > MB)
      console.log(`${bf.ObjectName} ${bold(human_bytes(bf.Length))}`);
    else
      console.log(`${bf.ObjectName}`);
  } // for
  if (old_bunnys.length === 0)
    console.error(`=== ${yellow(`No old remote files`)} in ${bold(dirname)}.`);
} // if

if (match('delete old remote files')) {
  const old = await delete_old_files();
  if (old.length === 0)
    console.error(`=== ${yellow("Nothing to delete.")}`);
  for (const dstat of old) {
    if (dstat.ok)
      console.log(`${green("✓")} ${bold(dstat.ObjectName)} ${inspect(dstat.json)}`)
    else
      console.log(`${red("✗")} ${yellow(dstat.ObjectName)} ${inspect(dstat.json)}`)
  } // for
} // if

// =============================================================================
not_found();
// =============================================================================

// =============================================================================
// config():
// =============================================================================

export function config(k: "UPLOAD_PATH" | CONFIG_OPTIONS): string {
  switch (k) {
    case "PROJECT_NAME": {
      const raw = (Deno.env.get("PROJECT_NAME") || GIT_PROJECT_NAME || "").trim()
      if (raw.length === 0)
        throw new Error(`PROJECT_NAME could not be found.`)
      return raw;
    } // case

    case "UPLOAD_PATH": {
      return path.join(config("BUNNY_URL"), config("BUNNY_DIR"))
    } // case

    case "BUNNY_DIR": {
      let raw = "unknown";
      try {
        raw = Deno.env.get(k) || config("PROJECT_NAME");
      } catch (e) {
        throw new Error(`BUNNY_DIR could not be found.`);
      }
      return raw;
    } // case

    // Use IS_VERBOSE (boolean) instead.
    // This is just here for type checking.
    case "VERBOSE": {
      return (IS_VERBOSE) ? "YES" : "";
    } // case

    default: {
      const raw = (Deno.env.get(k) || "").trim();
      if (raw.length === 0) {
        throw new Error(`Configuration value not found for: ${k} ${inspect(Deno.env.get(k))}`);
      }
    } // default

  } // switch
  return "";
} // export async functon

// =============================================================================
// Functions:
// =============================================================================

export async function project_name() {
  const name = (await shell("git", "remote get-url origin"))
  .raw_string.replace(/\.git$/, '').split('/').pop();
  if (typeof name === "string" && name.length > 0)
    return name;
  throw new Error(`No project name could be found.`);
} // export async function

function ensure_valid_dir() {
  try {
    Deno.readFileSync(FILE_TS)
  } catch (e) {
    console.error(`File not found: ${Deno.cwd()}/${FILE_TS}`);
    Deno.exit(1);
  }
  return true;
} // function

export async function uploadable_local_files(): Promise<Local_File[]> {
  const remote    = await remote_files();
  const local     = await local_files();
  const remote_paths = remote.map(bf => bf.ObjectName);
  return local.filter(lf => !remote_paths.includes(lf.remote_path));
} // export async

export async function local_files(): Promise<Local_File[]> {
  ensure_valid_dir();

  const local_sha_filename = (await fd(`--max-depth 4 --type f --size -15m --exclude *.ts --exec sha256sum {} ;`))
  .split('  ')
  .column(0, UP_CASE)
  .column(1, remove_pattern(begin_dot_slash))
  .arrange(1,0,1)
  .column('last', path_to_filename('.'));

  const stat = await Promise.all(
    local_sha_filename.raw_column("first")
    .map(r => Deno.stat(r))
  );

  const file_table = local_sha_filename.push_columns("right", columns(stat));

  return file_table.raw.map(row => ({
    local_path:  row[0],
    remote_path: `${row[1]}.${row[2]}`,
    sha256:      row[1],
    bytes:       row[3].size,
    content_type: content_type(row[0]),
  })).sort(sort_by_key("local_path"));
} // export async function

export async function remote_files(): Promise<Bunny_File[]> {
  ensure_valid_dir();

  const url = config("UPLOAD_PATH");

  const resp = await fetch(
    url, {
    method: "GET",
    headers: {
      "Accept": '*/*',
      "AccessKey": env_or_throw("BUNNY_KEY")
    }
  });

  const json: Bunny_Response | Bunny_File[] = await resp.json();

  if ("length" in json) {
    const remotes: Bunny_File[] = json;
    remotes.sort(sort_by_key("Checksum"));
    return remotes;
  }

  throw new Error(`${url} ${inspect(json)}`);
} // export async function

export async function upload_files(): Promise<Upload_Result[]> {
  const url       = config("UPLOAD_PATH");
  const BUNNY_KEY = config("BUNNY_KEY");
  const files     = (await uploadable_local_files());

  const deno_files = await Promise.all(
    files.map(lf => Deno.open(lf.local_path))
  );

  const streams = deno_files.map(f => readableStreamFromReader(f));

  const fetches = files.map((lf, i) => {
    return fetch(path.join(url, lf.remote_path), {
      method: "PUT",
      headers: {
        "Accept":         '*/*',
        "Checksum":       lf.sha256,
        "AccessKey":      BUNNY_KEY,
        "Content-Type":   lf.content_type,
        "ContentType":   lf.content_type,
        "Content-Length": lf.bytes.toString(),
      },
      body: streams[i]
    });
  });

  const responses                = await Promise.all(fetches);
  const bunnys: Bunny_Response[] = await Promise.all(responses.map(r => r.json()));

  return files.map((lf, i) => ({
    local_file: lf,
    ok: responses[i].ok,
    response: responses[i],
    bunny: bunnys[i]
  }));
} // export async function

export async function old_files(): Promise<Bunny_File[]> {
  const remotes     = await remote_files();
  const locals      = await local_files();
  const local_shas  = locals.map(x => x.sha256);
  return remotes.filter(x => {
    return !local_shas.includes(x.ObjectName.split('.')[0]);
  });
} // export async function

export function verbose_log_local_file(f: Local_File) {
    console.log(`${yellow(f.local_path)}`)
    for (const [k,v] of Object.entries(f)) {
      console.log(`  ${bold(k)}: ${inspect(v)}`)
      switch (k) {
        case "bytes": {
          console.log(`  ${bold("human_bytes")}: ${human_bytes(v as number)}`)
        }
      } // switch
    } // for k,v
    console.log("================================================================================");
} // export function

export function verbose_log_file(title: string, f: Bunny_File | Local_File) {
    console.log(`${yellow(title)}`)
    for (const [k,v] of Object.entries(f)) {
      console.log(`  ${bold(k)}: ${inspect(v)}`)
      switch (k) {
        case "Length":
        case "bytes": {
          console.log(`  ${bold("human_bytes")}: ${human_bytes(v as number)}`)
        }
      } // switch
    } // for k,v
    console.log("================================================================================");
} // export function

export async function delete_old_files(): Promise<Delete_Status[]> {
  const old                    = await old_files();
  const stats: Delete_Status[] = [];
  const PROJECT_URL            = config("UPLOAD_PATH");
  const BUNNY_KEY              = config("BUNNY_KEY");

  if (old.length === 0)
    return stats;

  const fetches = old.map(bf => {
    return fetch(
      new Request(
        path.join(PROJECT_URL, bf.ObjectName),
        {
          method: 'DELETE',
          headers: new Headers({
            AccessKey: BUNNY_KEY,
          })
        }
      )
    ); // fetch
  });

  const resps = await Promise.all(fetches);
  const json = await Promise.all(resps.map(x => x.json()));

  for (const i of count(old.length)) {
    stats.push(
      Object.assign({}, old[i], {ok: resps[i].ok, json: json[i]})
    );
  } // for

  return stats;
} // export async function
