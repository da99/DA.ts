
import {existsSync} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std/io/mod.ts";

export async function is_directory(raw: string) {
  try {
    const result = await Deno.stat(raw);
    return result.isDirectory;
  } catch (err) {
    return false;
  }
} // func

export async function is_file(raw: string) {
  try {
    const result = await Deno.stat(raw);
    return result.isFile;
  } catch (err) {
    return false;
  }
} // func

export async function default_read_text_file(default_x: any, file_path: string) {
  try {
    return await Deno.readTextFile(file_path);
  } catch (e) {
    return default_x;
  }
} // export async function

/*
 * Text_File: The file does not have to exist.
 */
export class Text_File {
  __filename: string;
  __contents: string | null;

  constructor(x: string) {
    this.__filename = x;
    this.__contents = null;
  } // constructor

  get not_empty() {
    return (this.text || "").trim().length > 0;
  } // get

  get filename() {
    return this.__filename;
  } // get

  get lines() : string[] {
    const body = this.text;
    if (body) {
      return body.split(/\n/);
    }
    return [];
  } // get

  get text() {
    if (!this.__contents) {
      try {
        this.__contents = Deno.readTextFileSync(this.filename);
      } catch(e) {
        switch (e.name) {
          case "NotFound":
            // ignored
            break;
          default: { throw e; }
        } // switch
      } // try/catch
    } // if

    if ((this.__contents || "").trim().length === 0) {
      return null;
    }
    return this.__contents;
  } // get

  get exists() : boolean{
    try {
      if (Deno.lstatSync(this.filename)) {
        return true;
      }
    } catch (e) {
      if (e.name !== "NotFound") throw e;
    }
    return false;
  } // get

  write(s: string) {
    Deno.writeTextFileSync(this.filename, s);
    this.__contents = null;
    return this;
  } // method

  delete() {
    try {
      Deno.removeSync(this.filename);
    } catch (e) {
      // ignored for now.
    }

    return this;
  } // method

} // class

export function find_parent_file(file_name: string, dir: string) {
  let current_dir = dir;
  let fin_path = null;
  while (current_dir && current_dir !== "." && current_dir !== "/" && current_dir !== "") {
    try {
      Deno.statSync(path.join(current_dir, file_name));
      fin_path = path.join(current_dir, file_name);
      break;
    } catch (e) {
      current_dir = path.dirname(current_dir);
    }
  } // while
  return fin_path;
} // export


export async function download(url: string, file: string) {
  const resp = await fetch(url);
  const rdr = resp.body?.getReader();
  if (!rdr) {
    throw new Error(`Unable to get a response from ${url}`);
  } // if
  try {
    const stat = await Deno.stat(file);
    throw new Error(`Already exists: ${file}`);
  } catch (e) {
      const r = readerFromStreamReader(rdr);
      let f = null;
      try {
        f = await Deno.open(file, {create: true, write: true});
        await Deno.copy(r, f);
      } catch (e) {
        if (f)
          f.close();
        throw e;
      }
      if (f)
        f.close();
  }
  return true;
} // export async function
