
// import * as path from "https://deno.land/std/path/mod.ts";
import {
  sh, inspect, IS_VERBOSE, base, cwd,
  yellow, bold,
  fd
} from "../src/Shell.ts";

import {
  content_type, human_bytes, MB, sort_by_key, count
} from "../src/Function.ts";

import { readableStreamFromReader } from "https://deno.land/std/streams/conversion.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {
  begin_dot_slash,
  path_to_filename,
  env_or_throw
} from "../src/Function.ts";

export type CONFIG_OPTIONS    = "PROJECT_NAME" | "BUNNY_DIR" | "BUNNY_URL" | "BUNNY_KEY" | "VERBOSE";
export const FILE_TS          = ".FILES.ts";

export interface Bunny_Response {
  HttpCode: 200 | 201 | 400 | 404;
  Message: "Object Not Found";
}

export interface Local_File {
  local_path: string;
  remote_path: string;
  url: string;
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
// Configuration-related functions:
// =============================================================================

export function config(k: "UPLOAD_PATH" | CONFIG_OPTIONS): string {
  switch (k) {
    case "PROJECT_NAME": {
      const raw = (Deno.env.get("PROJECT_NAME") || base(cwd())).trim()
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
// File Functions:
// =============================================================================

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
  .lines
  .map(s => {
    const arr = s.split('  ');
    arr[0] = arr[0].toUpperCase();
    arr[1] = arr[1].replace(begin_dot_slash, '');
    return [
      arr[1],
      arr[0],
      path_to_filename('.')(arr[1])
    ];
  });

  const stat = await Promise.all(
    local_sha_filename.map(arr => arr[0])
    .map(r => Deno.stat(r))
  );

  return local_sha_filename.map((row, i) => ({
    local_path:   row[0],
    url:          path.join(config('UPLOAD_PATH'), `${row[1]}.${row[2]}`),
    remote_path:  `${row[1]}.${row[2]}`,
    sha256:       row[1],
    bytes:        stat[i].size,
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

export async function old_files(): Promise<Bunny_File[]> {
  const remotes     = await remote_files();
  const locals      = await local_files();
  const local_shas  = locals.map(x => x.sha256);
  return remotes.filter(x => {
    return !local_shas.includes(x.ObjectName.split('.')[0]);
  });
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
    return fetch(lf.url, {
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

export async function export_files(): Promise<Record<string, Exported_File>> {
  const locals = await local_files();
  const record: Record<string, Exported_File> = {};
  for (const lf of locals) {
    record[lf.local_path] = {
      path:         lf.local_path,
      url:          lf.url,
      sha256:       lf.sha256,
      content_type: lf.content_type,
      bytes:        lf.bytes
    };
  } // for
  return record;
} // export async function

// =============================================================================
// Logging functions:
// =============================================================================

export function log_local_file(f: Local_File) {
  if (f.bytes > MB)
    console.log(`${human_bytes(f.bytes)} ${f.local_path} ${f.remote_path} ${f.content_type}`)
  else
    console.log(`${f.local_path} ${f.remote_path} ${f.content_type}`)
} // export function

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

export function verbose_log_remote_file(bf: Bunny_File) {
    console.log(`${yellow(bf.ObjectName)}`)
    for (const [k,v] of Object.entries(bf)) {
      console.log(`  ${bold(k)}: ${v}`);
      switch (k) {
        case "Length": {
          console.log(`  ${bold("human bytes")}: ${human_bytes(v)}`);
        } // case
      } // switch
    } // for
} // export function

export async function git_project_name() {
  return (await sh(["git", "remote get-url origin"], 'piped', 'piped', false))
  .stdout
  .trim()
  .replace(/\.git$/, '')
  .split('/')
  .pop();
} // export async function

export async function project_name() {
  const name = (await sh(["git", "remote get-url origin"]))
  .stdout
  .trim()
  .replace(/\.git$/, '')
  .split('/')
  .pop();
  if (typeof name === "string" && name.length > 0)
    return name;
  throw new Error(`No project name could be found.`);
} // export async function
