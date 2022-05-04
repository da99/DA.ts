
// import { sleep } from "https://deno.land/x/sleep/mod.ts";
import {rearrange} from "./Array.ts";
import {
  not,
  sum, map_length, count,
  is as fis,
  pipe_function, max,
  tail_count, split_whitespace, split_lines
} from "./Function.ts";

import * as path from "https://deno.land/std/path/mod.ts";
import { bold, green, yellow, blue, white, red, bgRed } from "https://deno.land/std/fmt/colors.ts";
export { bold, green, yellow, blue, white, red, bgRed };
import { readerFromStreamReader, copy as copyIO } from "https://deno.land/std/streams/conversion.ts"
import {
  emptyDirSync,
  ensureDirSync,
  copySync,
  walkSync,
  expandGlobSync
} from "https://deno.land/std/fs/mod.ts";

import {join, common} from "https://deno.land/std/path/mod.ts";
export {join, common};

import type {Arrange_Spec} from "./Array.ts";

export type Process_IO =  number | "inherit" | "piped" | "null";

export interface Process_Options {
  stderr?: Process_IO;
  stdout?: Process_IO;
};

// =============================================================================
// Top level constants and variables:
// =============================================================================

let _user_input: string[]           = [];
let _vars: Array<string | string[]> = [];
let is_found                        = false;
let is_help                         = false;
let _import_meta_url                = "file:///unknown_project/bin/unknown";

args(Deno.args);

// =============================================================================
// Types:
// =============================================================================

export type VERBOSE_LEVEL = "verbose" | "verbose-exit" | "verbose-fail" | "quiet";
export let IS_VERBOSE: VERBOSE_LEVEL | null = (Deno.args.filter(x => x === "-v" || x === "--verbose").length > 0) ? "verbose" : null;

export interface Process_Result {
  cmd:     string[];
  status:  Deno.ProcessStatus;
  process: Deno.Process<Deno.RunOptions>;
  stdout:  string;
  stderr:  string;
  success: boolean;
  code:    number;
  readonly lines: string[];
}
export interface SHELL_OPTIONS {
  throw?: boolean;
  verbose?: VERBOSE_LEVEL;
  io?: "inherit" | "piped";
};


// =============================================================================
// Shell functions:
// =============================================================================

export function flatten_cmd(args: Array<string | string[]>) {
  return args.reduce((prev: string[], curr: string | string[]) => {
    if (typeof curr === "string") {
      return prev.concat(split_whitespace(curr));
    } else {
      return prev.concat(curr);
    }
  }, [] as string[]);
} // export function

// =============================================================================
// create:
// =============================================================================

export const create = {
  sh: function create_sh_cmd(cmd: string, out: Process_IO = "piped", err: Process_IO = "piped", throw_on_fail = true) {
    return function (args: string | string[]) {
      return sh(
        [cmd].concat(split_cmd(args)),
        out,
        err,
        throw_on_fail
      );
    }
  },

  file: function create_file(f: string): string {
    if (is.exist(f))
      return f;

    const d = dir(f);
    if (!is.current_dir(d))
      create.dir(d);

    Deno.writeTextFileSync(f, '');
    return f;
  },

  dir: function create_dir(d: string): string {
    if (is.current_dir(d))
      return d;

    if (is.exist(d)) {
      if (!is.dir(d))
        throw new Error(`create.dir(${d}): Not a directory: ${d}`)
      return d;
    }

    ensureDirSync(d);
    return d;
  },

}; /// export const create

// =============================================================================
// read:
// =============================================================================
export const read = {
  file: function read_file(f: string) {
    return Deno.readTextFileSync(f);
  },

  default_file: function default_read_file(default_x: any, file_path: string) {
    try {
      return Deno.readTextFileSync(file_path);
    } catch (e) {
      return default_x;
    }
  } // export function

}; // export const read

// =============================================================================
// write:
// =============================================================================
export const write = {
  file: function write_file(f: string, content: string) {
    create.dir(dir(f));
    return Deno.writeTextFileSync(f, content);
  } // export function
}; // export const write

// =============================================================================
// empty:
// =============================================================================
export const empty = {

  file: function empty_file(s: string): string {
    create.file(s);
    Deno.writeTextFileSync(s, "");
    return s;
  },

  dir: function empty_dir(s?: string): string {
    if (!s)
      s = '.';
    if (!is.current_dir(s))
      create.dir(s)
    if (is.current_dir(s))
      emptyDirSync(cwd());
    else
      emptyDirSync(s);
    return s;
  },

}; // export const empty

// =============================================================================
// is:
// =============================================================================
export const is = {

  pattern: function is_pattern(x: string) {
    const first_char = x.charAt(0);
    return first_char === '[' || first_char === '<';
  },

  menu: function is_menu(s: string) {
    return s.indexOf('|') > 0;
  },

  path: function is_path(s: string): boolean {
    const first = s.indexOf('/');
    return first > -1 && first !== (s.length - 1);
  },

  exist: function is_exist(raw: string): boolean {
    try {
      return !!stat(raw);
    } catch (e) {
      return false;
    }
  },

  empty: function is_empty(x: string): boolean {
    if (!is.exist(x))
      return true;

    if (is.dir(x))
      return list(x, 1).length === 0;

    return lstat(x).size === 0;
  },

  dir: function is_dir(raw: string) {
    try {
      return stat(raw).isDirectory;
    } catch (err) {
      return false;
    }
  },

  current_dir: function is_current_dir(raw: string) {
    return raw === '.' || raw === './';
  },

  file: function is_file(raw: string) {
    try {
      return stat(raw).isFile;
    } catch (err) {
      return false;
    }
  },

  symbolic_link: function is_symbolic_link(raw: string) {
    try {
      return stat(raw).isSymlink;
    } catch (err) {
      return false;
    }
  },

}; // export const empty

// =============================================================================
// rename:
// =============================================================================
export const rename = {
  /*
    * Rename a file:
    *   rename('dir/my_file.txt', 'new.txt') => 'dir/new.txt'
  */
  file: function rename_file(a: string, b: string) {
    if (!is.exist(a))
      throw new Error(`rename.file(${inspect(a)}, ${inspect(b)}): ${inspect(a)} does not exist.`);
    if (!is.file(a))
      throw new Error(`rename.file(${inspect(a)}, ${inspect(b)}): ${inspect(a)} must be a file.`);
    if (is.path(b))
      throw new Error(`rename.file(${inspect(a)}, ${inspect(b)}): ${inspect(b)} may not be a path.`);

    return _rename(a, b);
  }, // export function

  /*
    * Rename a directory:
    *   rename('a/b/dir', 'c')               => 'a/b/c'
  */
  dir: function rename_dir(a: string, b: string) {
    if (!is.exist(a))
      throw new Error(`rename.dir(${inspect(a)}, ${inspect(b)}): ${inspect(a)} does not exist.`);
    if (!is.dir(a))
      throw new Error(`rename.dir(${inspect(a)}, ${inspect(b)}): ${inspect(a)} must be a directory.`);
    if (is.path(b))
      throw new Error(`rename.dir(${inspect(a)}, ${inspect(b)}): ${inspect(b)} may not be a path.`);

    return _rename(a, b);
  }, // export function

}; // export const rename


// =============================================================================
// del:
// =============================================================================
export const del = {
  symbolic_link: function delete_symbolic_link(x: string, throwable: 'throw' | 'ignore' = 'throw'): boolean {
    return del.file(x, throwable);
  },

  file: function delete_file(x: string, throwable: 'throw' | 'ignore' = 'throw'): boolean {
    if (!is.exist(x)) {
      if (throwable === 'throw')
        throw new Error(`${inspect(x)} does not exist.`)
      return false;
    }
    Deno.removeSync(x, {recursive: false});
    return true;
  },

  dir: function delete_dir(x: string, throwable: 'throw' | 'ignore' = 'throw'): boolean {
    if (!is.exist(x)) {
      if (throwable === 'throw')
        throw new Error(`${inspect(x)} does not exist.`)
      return false;
    }

    Deno.removeSync(x, {recursive: true});
    return true;
  } // export function

}; // export const del


// =============================================================================
// CLI:
// =============================================================================

export function inspect(x: any) {
  return Deno.inspect(
    x,
    {compact: true, showHidden: false, depth: Infinity, colors: true}
  );
} // export

export function raw_inspect(x: any) {
  return Deno.inspect(
    x,
    {
      compact: true,
      showHidden: false,
      depth: Infinity,
      colors: false
    }
  );
} // export

export function split_cmd(x: string | string[]): string[] {
  if (typeof x === "string")
    return split_whitespace(x);
  if (x.length === 1)
    return split_whitespace(x[0]);
  if (x.length === 0)
    throw new Error(`Invalid command: ${inspect(x)}`);
  return x;
} // export function


function inner_pattern(s: string) {
  return s.substring(1, s.length - 1);
} // function


function* gen(arr: string[]) {
  for (const x of arr) {
    yield x;
  }
} // function*

export function get_vars(raw_cmd: string, user_input: string[]) : false | Array<string | string[]> {
  const patterns = split_cli_command(raw_cmd);
  const inputs   = gen(user_input);

  let vars: Array<string | string[]> = [];
  let i_done = false;


  for (const pattern of patterns) {
    const i_next = inputs.next();
    const i      = i_next.value;
    i_done       = i_next.done || false;

    if (!is.pattern(pattern)) {
      if (i !== pattern)
        return false;
      continue;
    }

    const inner = inner_pattern(pattern);

    if (inner === "...args") {
      const _args = (!i_done) ? [i, ...inputs] : [...inputs];
      if (pattern.indexOf('<') === 0 && _args.length === 0)
        return false;
      vars.push(_args as string[]);
      return vars;
    }

    if (!is.menu(inner)) {
      if (pattern.indexOf('<') === 0) {
        if (i_done)
          return false;
      } // if
      if (pattern.indexOf('[') === 0) {
        if (i_done)
          continue
      } // if

      vars.push(i as string);
      continue;
    } // if

    /* It's a menu: cmd <a|b|c>, cmd [a|b|c], cmd [*a|b|c] */
    const menu = inner.split('|');
    if (pattern.indexOf('<') === 0) {
      if (i_done)
        return false;
    } // if
    if (pattern.indexOf('[') === 0) {
      if (i_done && menu[0].indexOf('*') === 0) {
        vars.push(menu[0].replace('*', ""));
        continue;
      }
    } // if

    if (!menu.includes(i as string))
      return false;
    vars.push(i as string);
  } // for

  const i_next = inputs.next();
  if (!i_next.done)
    return false;

  return vars;
} // function

export function meta_url(url: string) {
  _import_meta_url = url;
  return about();
} // export function

export function about() {
  const file = (new URL(_import_meta_url)).pathname;
  const dir  = path.dirname(file);
  const bin  = file.split('/').slice(-2).join('/');
  const project_dir = file.replace(`/${bin}`, "");
  return { file, dir, bin, project_dir };
} // export function

export function values() {
  return _vars;
} // export

export function args(i: string[]) {
  _user_input = i;
  switch(_user_input[0]) {
    case "-h":
      case "help":
      case "--help": {
      is_help = true;
      break;
    }
    default:
      is_help = false;
  } // switch
} // export

export function print_help(raw_cmd: string, desc: string) {
  const search = _user_input[1];
  if (search && raw_cmd.indexOf(search) === -1) {
    return false;
  }

  const pieces = split_cli_command(raw_cmd).map((x, i) => {
    if (i === 0)
      return bold(blue(x));
    if (x.indexOf('|') > 0)
      return yellow(x);
    if (x.indexOf('<') > -1)
      return green(x);
    return x;
  });
  console.log(` ${pieces.join(" ")}`);
  if (desc.trim().length > 0) {
    console.log(`  ${desc.trim()}`);
  }
  return true;
} // export

export function match(pattern: string, desc: string = "") {
  if (is_help) {
    print_help(pattern, desc);
  } // if is_help

  if (is_found)
    return false;

  const new_vars = get_vars(pattern, _user_input);

  if (new_vars) {
    _vars = new_vars;
    is_found = true;
  }
  return !!new_vars;
} // function

export function not_found() {
  match("help|--help|-h [search]");
  if (is_found || is_help)
    return false;
  console.error(`Command not recognized: ${_user_input.map(x => Deno.inspect(x)).join(" ")}`);
  Deno.exit(1);
}

export function split_cli_command(raw_s: string) : Array<string> {
  const s = raw_s.trim().replace(/\s+/g, " ");
  const words: Array<string> = [];
  let current_bracket: null | string = null;
  let current_word: string[] = [];
  let next_char: undefined | string = "";
  let last_was_open_bracket = false;
  let next_is_closing_bracket = false;
  let last_was_pipe = false;
  let next_is_pipe = false;
  let last_c = "";

  let i = -1;
  let fin = s.length - 1;
  for (const c of s) {
    ++i;
    next_char = s.charAt(i+1);
    next_is_closing_bracket = next_char === ']' || next_char === '>';
    next_is_pipe = next_char === '|'
    switch (c) {
      case "[":
      case "<": {
        current_bracket = c;
        current_word = [c];
        break;
      }

      case ">":
      case "]": {
        current_word.push(c);
        current_bracket = null
        const new_word = current_word.join("");
        if (i !== fin && (new_word === "<...args>" || new_word === "[...args]")) {
          throw new Error(`${new_word} has to be the last element in the pattern: ${s}.`);
        }
        words.push(new_word);
        current_word = [];
        break;
      }

      case " ": {
        if (current_bracket) {
          if (!last_was_pipe && !next_is_pipe && !last_was_open_bracket && !next_is_closing_bracket && last_c !== c) {
            current_word.push(c);
          }
        } else {
          if (current_word.length !== 0) {
            words.push(current_word.join(""));
            current_word = [];
          }
        }
        break;
      }

      default:
        current_word.push(c);
        if (i === fin) {
          words.push(current_word.join(""));
          current_word = [];
        }
    } // switch
    last_c = c;
    last_was_open_bracket = last_c === '[' || last_c === '<';
    last_was_pipe = last_c === '|'
  } // for
  return words; // .map(x => x.replace(/\s*\|\s*/g, "|"));
} // function

export async function template(
  tmpl:     string,
  new_file: string,
  values:   Record<string, string | number> = {}
) {
  let tmpl_contents = "";
  if (tmpl.trim().toLowerCase().indexOf("http") === 0) {
    tmpl_contents = await fetch_text(tmpl);
  } else {
    tmpl_contents = read.file(tmpl);
  }

  const info = path.parse(new_file);
  const {dir}  = info;

  try {
    lstat(new_file);
    const contents = read.file(new_file);
    if (contents.trim().length > 0) {
      console.error(`=== File already exists: ${new_file}`);
      return contents;
    }
  } catch (e) {
    // continue
  }

  create.dir(dir);

  write.file(new_file, compile_template(tmpl_contents, values));
  const new_contents = read.file(new_file);
  if ((new_contents || "").indexOf("#!") === 0) {
    chmod(new_file, 0o700);
  }
  console.log(`=== Wrote: ${new_file}`);
} // function

export function compile_template(tmpl_contents: string, vars: Record<string, string | number>) {
  for (const [k,v] of Object.entries(vars)) {
    tmpl_contents = tmpl_contents.replaceAll(`{${k}}`, v.toString());
  } // for
  return tmpl_contents;
} // function

// =============================================================================
// Script Helpers:
// Based on the deno CLI APIs: https://doc.deno.land/deno/stable/
// =============================================================================

export function echo(...parts: any[]): string {
  const str = parts.map(x => {
    const t = typeof x;
    switch (t) {
      case "string":
      case "number": {
        return x
      }
      default: {
        return Deno.inspect(x);
      }
    }
  }).join(' ');
  console.log(str);
  return str;
} // export

export function glob(p: string) {
  const this_dir = cwd();
  return [...expandGlobSync(p)].map(
    f => f.path.replace(`${this_dir}/`, '')
  );
} // export function

export function chmod(f: string, n: number) {
  return Deno.chmodSync(f, n)
} // export function

export function cwd() {
  return Deno.cwd();
} // export function

export function dir(s: string, opt: '.' | '/' | 'cwd' | 'cwd/' = '.') {
  const o = path.dirname(s);
  switch (opt) {
    case '.': { return o; }
    case '/': { return path.join(o, '/'); }
    case 'cwd': {
      return (o === '.') ? cwd() : o;
    }
    case 'cwd/': {
      return (o === '.') ? path.join(cwd(), '/') : o;
    }
  }
} // export function

/*
  * Moves a file into another directory:
  * move_dir("/file.txt", "some/other/dir") => some/other/dir/file.txt
*/
export function move_file(a: string, b: string) {
  if (!is.exist(a))
    throw new Error(`move_file(${inspect(a)}, ${inspect(b)}): ${inspect(a)} does not exist.`);

  if (!is.exist(b))
    throw new Error(`move_file(${inspect(a)}, ${inspect(b)}): ${inspect(b)} does not exist.`);

  if (!is.file(a))
    throw new Error(`move_file(${inspect(a)}, ${inspect(b)}): ${inspect(a)} must be a file.`);

  if (!is.dir(b))
    throw new Error(`move_file(${inspect(a)}, ${inspect(b)}): ${inspect(b)} must be a directory.`);

  return Deno.renameSync(a, join(b, base(a)));
} // export function

/*
  * Moves a directory into another one:
  * move_dir("/my_dir", "some/other/dir") => some/other/dir/my_dir
*/
export function move_dir(a: string, b: string) {
  if (!is.exist(a))
    throw new Error(`move(${inspect(a)}, ${inspect(b)}): ${inspect(a)} does not exist.`);
  if (!is.exist(b))
    throw new Error(`move(${inspect(a)}, ${inspect(b)}): ${inspect(b)} does not exist.`);
  if (!is.dir(a))
    throw new Error(`move(${inspect(a)}, ${inspect(b)}): ${inspect(a)} is not a directory.`);
  if (!is.dir(b))
    throw new Error(`move(${inspect(a)}, ${inspect(b)}): ${inspect(b)} is not a directory.`);

  const new_path = join(b, base(a));
  Deno.renameSync(a, new_path);
  return new_path;
} // export function


function _rename(a: string, b: string): string {
  return cd(dir(a), () => {
    const new_path = join(cwd(), b);
    if (is.exist(new_path))
      throw new Error(`${Deno.inspect(new_path)} already exists.`);
    Deno.renameSync(base(a), b);
    return new_path;
  });
} // function

export function stat(f: string) {
  return Deno.statSync(f);
} // export function

export function lstat(f: string) {
  return Deno.lstatSync(f);
} // export function

export function real_path(p: string) {
  return Deno.realPathSync(p);
} // export function

export function create_symbolic_link(src: string, dest: string) {
  return Deno.symlinkSync(src, dest);
} // export function


export async function fetch_text(u: string | Request) {
  return fetch(u).then(x => x.text());
} // export async function

export async function fetch_json(u: string | Request) {
  return fetch(u).then(x => x.json());
} // export async function

export function copy_file(f: string, dest: string): string {
  if (!is.exist(f))
    throw new Error(`copy_file(${inspect(f)}, ${inspect(dest)}): ${inspect(f)} does not exist.`);
  if (!is.exist(dest))
    throw new Error(`copy_file(${inspect(f)}, ${inspect(dest)}): ${inspect(dest)} does not exist.`);
  if (!is.file(f))
    throw new Error(`copy_file(${inspect(f)}, ${inspect(dest)}): ${inspect(f)} must be a file.`);
  if (!is.dir(dest))
    throw new Error(`copy_file(${inspect(f)}, ${inspect(dest)}): ${inspect(dest)} must be a directory.`);

  const full_dest = path.join(dest, path.basename(f))

  copySync(f, full_dest);
  return full_dest;
} // export function

export function copy_dir(d: string, dest: string): string {
  if (!is.exist(d))
    throw new Error(`copy_dir(${inspect(d)}, ${inspect(dest)}): ${inspect(d)} does not exist.`);
  if (!is.exist(dest))
    throw new Error(`copy_dir(${inspect(d)}, ${inspect(dest)}): ${inspect(dest)} does not exist.`);
  if (!is.dir(d))
    throw new Error(`copy_dir(${inspect(d)}, ${inspect(dest)}): ${inspect(d)} must be a directory.`);
  if (!is.dir(dest))
    throw new Error(`copy_dir(${inspect(d)}, ${inspect(dest)}): ${inspect(dest)} must be a directory.`);

  const full_dest = path.join(dest, path.basename(d))

  copySync(d, full_dest);
  return full_dest;
} // export function


/*
  * Copy files in a directory into another.
  * copy_list('a/b', '/dir') => /dir has files of a/b
*/
export function copy_list(d: string, dest: string) {
  if (!is.exist(d))
    throw new Error(`copy_list(${inspect(d)}, ${inspect(dest)}): ${inspect(d)} does not exist.`);
  if (!is.exist(dest))
    throw new Error(`copy_list(${inspect(d)}, ${inspect(dest)}): ${inspect(dest)} does not exist.`);
  if (!is.dir(d))
    throw new Error(`copy_list(${inspect(d)}, ${inspect(dest)}): ${inspect(d)} must be a directory.`);
  if (!is.dir(dest))
    throw new Error(`copy_list(${inspect(d)}, ${inspect(dest)}): ${inspect(dest)} must be a directory.`);


  const files = list_files(real_path(d), Infinity);

  for (const f of files) {
    const f_dir = dir(f);
    if (f_dir === ".") {
      copy_file(join(d, f), dest);
    } else {
      const new_f_dir = join(dest, f_dir);
      create.dir(new_f_dir)
      copy_file(join(d, f), new_f_dir);
    }
  } // for

  return files;
} // export function

export function ext(f: string = '.'): string {
  return path.extname(f);
} // export function

export function base(f: string): string {
  return path.basename(f);
} // export function

export function list_dirs(d: string = '.', maxDepth: number = 1): string[] {
  if (!is.dir(d))
    throw new Error(`dirs_of(${inspect(d)}): ${inspect(d)} is not a directory`);

  return cd(d, () => {
    const i = walkSync(
      '.',
      {maxDepth, includeFiles: false, includeDirs: true, followSymlinks: false}
    );
    // return [...i].slice(1).map(x => x.path);
    return [...i].map(x => x.path).filter(x => x !== '.');
  });
} // export function

export function list(d: string = '.', maxDepth: number = 1): string[] {
  return cd(d, () => {
    const i = walkSync(
      '.',
      {maxDepth, includeFiles: true, includeDirs: true, followSymlinks: false}
    );
    return [...i].map(x => x.path).filter(x => x !== '.');
  })
} // export function

export function list_files(d: string = '.', maxDepth: number = 1): string[] {
  return cd(d, () => {
    const i = walkSync(
      '.',
      {maxDepth, includeFiles: true, includeDirs: false, followSymlinks: false}
    );
    return [...i].map(x => x.path);
  })
} // export function



export function cd(dir: string, f?: Function) {
  if (!f) {
    Deno.chdir(dir);
    return dir;
  }

  const original = Deno.cwd();
  Deno.chdir(dir);
  const result = f();
  Deno.chdir(original);
  return result;
} // export function

export async function a_cd<T>(dir: string, f: () => Promise<T>): Promise<T> {
  const original = Deno.cwd();
  Deno.chdir(dir);
  const result = await f();
  Deno.chdir(original);
  return result;
} // export async function


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


export async function download(url: string, file?: string) {
  if (!file)
    file = path.basename(url);

  const resp = await fetch(url);
  const rdr = resp.body?.getReader();

  if (!rdr) {
    throw new Error(`Unable to get a response from ${url}`);
  } // if

  try {
    await Deno.stat(file);
    throw new Error(`Already exists: ${file}`);
  } catch (e) {
      const r = readerFromStreamReader(rdr);
      let f = null;
      try {
        f = await Deno.open(file, {create: true, write: true});
        await copyIO(r, f);
      } catch (e) {
        if (f)
          f.close();
        throw e;
      }
      if (f)
        f.close();
  } // try/catch

  return true;
} // export async function

export const fd     = create.sh('fd', 'piped', 'inherit', true);
export const find   = create.sh('find', 'piped', 'inherit', true);

// =============================================================================
// Keep_Alive_Process
// =============================================================================
class Keep_Alive_Process {
  cmd:               string[];
  cmd_string:        string;
  is_finished:       boolean;
  should_keep_alive: boolean;
  process:           Deno.Process<Deno.RunOptions>;

  constructor(raw_cmd: string | string[]) {
    this.should_keep_alive = true;
    this.is_finished       = false;
    this.cmd               = split_cmd(raw_cmd);
    this.cmd_string        = this.cmd.join(' ');
    this.process           = Deno.run({cmd: this.cmd});
    print_start(this.cmd, this.process.pid);
  } // constructor

  get pid() {
    return this.process.pid;
  } // get

  get rid() {
    return this.process.rid;
  } // get

  async family_pids() {
    return await pstree_p(this.pid);
  } // async method

  async status() {
    const stat = await this.process.status();
    if (Deno.resources()[this.process.rid])
      this.process.close();
    this.is_finished = true;
    return stat;
  } // async method

  async keep_alive(): Promise<void> {
    const kap = this;
    while (kap.should_keep_alive) {
      const status = await kap.status();
      print_status(kap.cmd, kap.pid, status);
      kap.restart();
    }
  } // async method

  async kill(signal: "-TERM" | "-INT" = "-TERM"): Promise<void> {
    const kap = this;
    await Deno.run({
      cmd: split_whitespace(`kill ${signal} ${kap.pid}`),
      stderr: "inherit",
      stdout: "inherit"
    });

    if (Deno.resources()[kap.rid])
      kap.process.close();
  } // async method

  restart() {
    if (!this.is_finished) {
      throw new Error(`Use "await status()" before calling restart();`);
    }
    this.process     = Deno.run({cmd: this.cmd});
    this.is_finished = false;
    print_start(this.cmd, this.process.pid);
    return this;
  } // method
} // class

// =============================================================================
// Process:
// =============================================================================

export function print_start(cmd: string[], pid: number) {
  console.error(`=== ${bold('Start')}: (${pid}) ${bold('' + cmd[0])} ${yellow(inspect(cmd.slice(1)))} ${(new Date()).toLocaleString()}`);
} // export function

export function print_status(cmd: string[], pid: number, r: Deno.ProcessStatus) {
  const human_cmd = cmd.join(' ');
  if (r.success) {
    console.error(`--- (${pid}) ${green(human_cmd)} --- ${(new Date()).toLocaleString()}`);
  } else {
    console.error(`--- (${pid}) ${bgRed(white(" " + r.code.toString() + " "))}: ${bold(red(human_cmd))} --- ${(new Date()).toLocaleString()}`);
  }
} // export function

export async function keep_alive(...args: Array<string | string[]>) {
  const promises: Array<Promise<void>> = args.map((cmd) => {
    const ka = new Keep_Alive_Process(cmd);
    return ka.keep_alive();
  });

  await Promise.all(promises);
} // export async

export async function pgrep_f(pattern: string): Promise<number[]> {
  const io = await sh(["pgrep", "-f", pattern], "piped");
  return split_whitespace(io.stdout).map(x => parseInt(x)).filter(x => x !== Deno.pid);
} // export async function

/*
 * Returns: A number[] of child processes (recursively). In other words,
 * the family tree of pids, including the PID originally passed to the
 * function.
 */
export async function pstree_p(pid: string | number): Promise<number[]> {
  const result = await sh(`pstree --hide-threads --ascii -p ${pid}`);
  let pids: number[] = [];
  if (!result.success)
    return pids;

  // Output is something like: name(123)--name(456)--name(789)
  // The pattern here grabs just the whole numbers with lookbehind/lookahead.
  const match = result.stdout.match(/(?<=\()\d+(?=\))/g);
  if (match) {
    pids = match.map(
      (x: string) => parseInt(x)
    );
  }
  return pids;
} // export async function

export async function exit_on_fail(pr: Promise<Process_Result>) {
  const result = await pr;
  if (!result.success) {
    Deno.exit(result.code);
  }
  return result;
} // export async function

export async function sh(
  cmd:     string | string[],
  out: Process_IO | "exit" = "piped",
  err: Process_IO = "inherit",
  throw_on_fail: boolean = true
): Promise<Process_Result> {
  const cmd_args    = split_cmd(cmd);
  let stdout   = "";
  let stderr   = "";
  let do_exit  = false;

  if (IS_VERBOSE) {
    console.error(`=== ${yellow(cmd_args.join(" "))} ===`);
  } // if

  // try {
  // } catch (e) {
  //   console.error(`=== ${yellow(inspect(cmd))}`);
  //   throw e;
  // }
  if (out === "exit") {
    do_exit = true;
    out = "inherit";
  }

  const process = Deno.run(Object.assign({cmd: cmd_args}, {stdout: out, stderr: err}));
  const status  = await process.status();

  // NOTE: For some reason, the process is never closed automatically.
  // At this point, we can close it manually since we have all the output
  // we need.
  process.close();

  if (out === "piped") {
    stdout = new TextDecoder().decode(await process.output());
  } // if

  if (err === "piped") {
    stderr = new TextDecoder().decode(await process.stderrOutput());
  } // if

  if (IS_VERBOSE === "verbose" || IS_VERBOSE === "verbose-exit" || (!status.success && IS_VERBOSE === "verbose-fail" )) {
    print_status(cmd_args, process.pid, status);
  } // if

  if (!status.success && throw_on_fail) {
    throw new Error(`!!! Failed ${bgRed(status.code.toString())}: ${inspect(cmd_args)}`);
  }

  if (do_exit)
    Deno.exit(status.code);

  return {
    cmd: cmd_args,
    status,
    process,
    stdout,
    stderr,
    success: status.success,
    code:    status.code,
    get lines() {
      if ("stdout" in this)
        return split_lines(this.stdout);
      return [];
    }
  };
} // export

