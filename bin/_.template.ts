
import {meta_url, about, match, values, not_found} from "../src/Shell.ts";
import {Text_File, find_parent_file} from "../src/Shell.ts";
import {split_whitespace, insert_after_line_contains} from "../src/String.ts";

import {exists, ensureDirSync} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

meta_url(import.meta.url);
const _this    = about();
const in_da_ts = path.parse(Deno.cwd()).base === 'da.ts';
const da_dir   = path.dirname(path.dirname((new URL(import.meta.url)).pathname));

export function relative_to_da(fpath: string) {
  return path.relative(
    path.join(da_dir, path.parse(fpath).dir),
    da_dir
  );
} // function

export async function create_from_template(tmpl_name: string, fpath: string) {
  const info = path.parse(fpath);
  const dir  = info.dir;
  const name = info.name;
  const ext  = info.ext;

  const full_path = path.resolve(path.join(Deno.cwd(), fpath));

  const vals: Record<string, string> = {
    Name: name,
    name,
    DA_PATH: in_da_ts ? relative_to_da(fpath) : "https://raw.githubusercontent.com/da99/da.ts/main"
  };
  const file = new Text_File(fpath);

  ensureDirSync(dir);

  if (file.not_empty) {
    console.error(`=== File already exists: ${file.filename}`);
  } else {
    file.write(compile_template(tmpl_name, vals));
    const update_file = new Text_File(fpath);
    if ((update_file.text || "").indexOf("#!") === 0) {
      await Deno.chmod(fpath, 0o700);
    }
    console.log(`=== Wrote: ${file.filename}`);
  } // if
} // function

export function compile_template(fname: string, vars: Record<string, string>) {
  let text = Deno.readTextFileSync(`${_this.project_dir}/templates/${fname}`);
  for (const [k,v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, v);
  } // for
  return text;
} // function

export function add_unique_text(a: string, b: string) : string {
  let i = 0;
  const a_arr = a.split("\n")
  const a_unique = a_arr.map((s: string) => split_whitespace(s).join(' ')).reduce((prev, curr) => {
    prev[curr] = true;
    return prev;
  }, {} as Record<string, boolean>);
  const b_unique = b.split("\n").map(x => split_whitespace(x).join(' '));
  b_unique.forEach(x => {
    if (x.length > 0 && !a_unique[x]) {
      a_arr.push(x);
    }
  });
  return a_arr.join("\n");
} // function
