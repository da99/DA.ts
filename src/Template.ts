
// import {split_whitespace} from "../src/String.ts";
import {ensureDir} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";


export async function template(
  tmpl:     string,
  new_file: string,
  values:   Record<string, string | number> = {}
) {
  let tmpl_contents = "";
  if (tmpl.trim().toLowerCase().indexOf("http") === 0) {
    tmpl_contents = await fetch(tmpl).then(x => x.text());
  } else {
    tmpl_contents = await Deno.readTextFile(tmpl);
  }

  const info = path.parse(new_file);
  const {dir}  = info;

  try {
    await Deno.stat(new_file);
    const contents = await Deno.readTextFile(new_file);
    if (contents.trim().length > 0) {
      console.error(`=== File already exists: ${new_file}`);
      return contents;
    }
  } catch (e) {
    // continue
  }

  await ensureDir(dir);

  await Deno.writeTextFile(new_file, compile_template(tmpl_contents, values));
  const new_contents = await Deno.readTextFile(new_file);
  if ((new_contents || "").indexOf("#!") === 0) {
    await Deno.chmod(new_file, 0o700);
  }
  console.log(`=== Wrote: ${new_file}`);
} // function

export function compile_template(tmpl_contents: string, vars: Record<string, string | number>) {
  for (const [k,v] of Object.entries(vars)) {
    tmpl_contents = tmpl_contents.replaceAll(`{${k}}`, v.toString());
  } // for
  return tmpl_contents;
} // function
