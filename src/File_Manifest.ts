import {run, throw_on_fail} from "../src/Shell.ts";
import {contentType} from "https://deno.land/x/media_types/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

export interface File_Info {
  sha256:       string,
  raw_filename: string,
  cdn_filename: string,
  line:         string,
  content_type: string,
  size:         number
}

export function subtract(a: Record<keyof File_Info, File_Info>, b: Record<keyof File_Info, File_Info>) {
  const x = {} as Record<keyof File_Info, File_Info>;
  for (const [k,v] of Object.entries(a)) {
    if (b[k as keyof File_Info]) { continue; }
    x[k as keyof File_Info] = v;
  } // for
  return x;
} // export

export function cdn_filename(sha256: string, x: string) {
  return `${sha256}.${x.replace(/[\ \/]/g,"_")}`;
} // export function

export async function current_files(dir: string): Promise<File_Info[]> {
  const raw_lines = (await __current_files(dir));
  const files: File_Info[] = [];
  for (const l of raw_lines) {
    const pieces = l.match(/([a-z0-9]+)\s+(.+)/);
    if (pieces) {
      const [__all_matched, sha256, raw_filename] = pieces;
      const _cdn_filename = cdn_filename(sha256, raw_filename);
      const file_stat     = await Deno.stat(path.join(dir, raw_filename));
      const content_type  = contentType(path.basename(raw_filename)) || "";
      if (content_type === "")
        throw new Error(`Unknown file type for: ${dir}/${raw_filename}`);
      files.push({
        content_type,
        sha256,
        raw_filename,
        cdn_filename: _cdn_filename,
        line: l,
        size: file_stat.size
      });
    }
  } // for
  return files;
} // export async function

export async function current_files_object(key: keyof File_Info, dir: string): Promise<Record<string, File_Info>> {
  return (await current_files(dir)).reduce(
    (prev: Record<string, File_Info>, curr: File_Info) => {
      prev[curr[key]] = curr;
      return prev;
    },
    {} as Record<string, File_Info>
  )
} // export async function

export async function __current_files(dir: string): Promise<string[]> {
  const result = await throw_on_fail(
    run(
      ["find", dir, "-maxdepth", "4", "-type", "f", "-size", "-15M", "-not", "-path", "*/.*", "-exec", "sha256sum", "{}", ";"],
      "piped",
      "verbose-fail"
    )
  );
  const lines = result.stdout.trim().split('\n');
  return lines.map(x => x.replace(`${dir}/`, ''));
} // export async function
