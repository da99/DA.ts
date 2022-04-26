

import * as path from "https://deno.land/std/path/mod.ts";
import { bold, green, yellow, blue } from "https://deno.land/std/fmt/colors.ts";
import { flatten_cmd, split_whitespace } from "./String.ts";
import {ensureDir} from "https://deno.land/std/fs/mod.ts";

export const IS_VERBOSE = Deno.args.filter(x => x === "-v" || x === "--verbose").length > 0;
// const WHITESPACE = /(\s+)/;

// function standard_keys(raw : string) {
//   return raw.split(WHITESPACE).filter((e) => e !== "" );
// }

export function verbose(f: (...args: any[]) => any, ...args: any[]) {
  console.error(`${yellow(f.name)}(${args.map(x => blue(inspect(x))).join(", ")})`);
  return f.apply(null, args);
} // export function

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

type Action = (...args: string[]) => void;
type Pattern_Element = string | 0 | string[];
type Pattern = Array<Pattern_Element>;

interface Command {
  raw_cmd: string;
  pattern: Array<Pattern_Element>;
  action: Action;
} // interface

function is_pattern(x: string) {
  const first_char = x.charAt(0);
  return first_char === '[' || first_char === '<';
} // function

function inner_pattern(s: string) {
  return s.substring(1, s.length - 1);
} // function

function is_menu(s: string) {
  return s.indexOf('|') > 0;
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
  let used_inputs: string[]          = [];
  let i_done = false;


  for (const pattern of patterns) {
    const i_next = inputs.next();
    const i      = i_next.value;
    i_done       = i_next.done || false;

    if (!is_pattern(pattern)) {
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

    if (!is_menu(inner)) {
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

let _user_input: string[] = [];
let _vars: Array<string | string[]> = [];
let is_found = false;
let is_help = false;
let filename = path.basename(import.meta.url);
let _import_meta_url = "file:///unknown_project/bin/unknown";

args(Deno.args);

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
