
import {run, throw_on_fail, split_cmd} from "./Process.ts";
import {rearrange} from "./Array.ts";
import {
  not,
  sum, map_length, count,
  pipe_function, max,
  is_length_0, is_any,
  tail_count
} from "./Function.ts";

import * as path from "https://deno.land/std/path/mod.ts";
import { bold, green, yellow, blue } from "https://deno.land/std/fmt/colors.ts";
import { readerFromStreamReader, copy as copyIO } from "https://deno.land/std/streams/conversion.ts"
import {
  emptyDirSync,
  ensureDirSync,
  copySync,
  walkSync
} from "https://deno.land/std/fs/mod.ts";

import {join, common} from "https://deno.land/std/path/mod.ts";
export {join, common};

import type {Arrange_Spec} from "./Array.ts";
import type {VERBOSE_LEVEL, Result} from "./Process.ts";

// =============================================================================
// Top level constants and variables:
// =============================================================================

export const IS_VERBOSE = Deno.args.filter(x => x === "-v" || x === "--verbose").length > 0;

// =============================================================================
// Types:
// =============================================================================

export interface SHELL_OPTIONS {
  throw?: boolean;
  verbose?: VERBOSE_LEVEL;
  io?: "inherit" | "piped";
};

export type Human_Position =
  "top row" | "bottom row" | "middle rows" |
  "first column" | "last column" | "middle columns" |
  "first cell" | "last cell" | "top last cell" | "bottom first cell" |
  "top row middle" | "bottom row middle"  |
  "left column middle" | "right column middle" |
  "borderless";

export interface Loop_Info {
  count: number;
  first: boolean;
  last:  boolean;
};

// =============================================================================
// Shell functions:
// =============================================================================

function print_stderr(r: Result): void {
  if (r.stderr !== "")
    console.error(`--- ${bold(r.cmd[0])} ${Deno.inspect(r.cmd.slice(1))}: ${yellow(r.stderr)}`);
} // function

export async function shell(
  cmd:  string,
  args: string | string[],
  throwable = true
): Promise<void> {
  args = split_cmd(args);
  const proc = run([cmd].concat(args), "inherit", verbosity());
  await ((throwable) ? throw_on_fail(proc): proc);
} // export async

export async function shell_string(
  cmd:  string,
  args: string | string[],
  throwable = true
): Promise<string> {
  args = split_cmd(args);
  const proc = run([cmd].concat(args), "piped", verbosity());
  const result = (await ((throwable) ? throw_on_fail(proc): proc));
  print_stderr(result)
  return result.stdout.trim();
} // export async

export async function shell_lines(
  cmd:  string,
  args: string | string[],
  throwable = true
): Promise<Lines> {
  const str = await shell_string(cmd, args, throwable);
  return lines(str);
} // export async

export async function fd(args: string | string[]): Promise<Lines> {
  return await shell_lines("fd", args);
} // export async

export async function find(args: string | string[]): Promise<Lines> {
  return await shell_lines("find", args);
} // export async

export function lines(x: string | string[]) {
  return new Lines(x);
} // export function

export function table(x: any[] | any[][]): Table {
  return new Table(x);
} // export function

// =============================================================================
// Lines:
// =============================================================================

export class Lines {
  readonly raw: string[];

  constructor(x: string | string[]) {
    if (typeof x === "string")
      this.raw = x.trim().split('\n');
    else
      this.raw = x;
  }

  get length() { return this.raw.length; }
  get trimmed_lines () {
    return this.raw.map(x => x.trim()).filter(x => x.length > 0);
  } // get

  /*
    Use this when you expect one line that is not empty.
    Throws otherwise.
    Automatically trims the string.
  */
  get raw_string(): string {
    const lines = this.raw.map(x => x.trim()).filter(x => x.length > 0);
    if (lines.length === 1)
      return lines.join('');
    if (lines.length === 0)
      throw new Error(`No output for: Lines#raw_string ${Deno.inspect(this.raw)}`);
    throw new Error(`More than one line for: Lines#raw_string ${Deno.inspect(this.raw)}`);
  } // get

  default_non_empty_string(d: any, f: (x: string) => any) {
    const trimmed = this.trimmed_lines;
    if (trimmed.length === 0)
      return d;
    return f(trimmed.join('\n'));
  } // method

  split(pattern: string | RegExp): Table {
    return table(
      this.raw.map(s => s.trim().split(pattern))
    );
  } // method

  filter(f: (s: string) => boolean): Lines {
    return lines(this.raw.filter(s => f(s)));
  } // method

  remove(f: (s: string) => boolean): Lines {
    return lines(this.raw.filter(s => !f(s)));
  } // method

  promise_all(f: (x: any) => Promise<any>): Promise<any> {
    return Promise.all(this.raw.map(f));
  } // method
} // class

// =============================================================================
// Table:
// =============================================================================

export class Table {
  raw: any[][];

  constructor(arr: any[] | any[][]) {
    if ( is_any(not(Array.isArray))(arr) )
      arr = arr.map(x => [x]);
    if (arr.length === 0 || is_any(is_length_0)(arr))
      throw new Error(`Table may not be empty: ${Deno.inspect(arr)}`);
    this.raw = arr;
  } // constructor

  get row_count() { return this.raw.length; }
  get column_count() { return max(map_length(this.raw)); }
  get cell_count() { return sum(this.raw.map(x => x.length)); }
  get area() { return this.row_count * this.column_count; }

  clone() {
    return this.raw.slice().map(x => x.slice());
  } // method

  // =============================================================================
  // Filter:
  // =============================================================================

  filter_rows(f: (x: any[]) => boolean): Table {
    return table(
      this.raw.filter(row => f(row))
    );
  } // method

  // =============================================================================
  // Remove:
  // =============================================================================

  remove_rows(f: (x: any[]) => boolean): Table {
    return this.filter_rows(x => !f(x));
  } // method

  // =============================================================================
  // Arrange:
  // =============================================================================

  arrange(...spec: Arrange_Spec): Table {
    return this.rows(row => rearrange(row, spec)) ;
  } // method

  // =============================================================================
  // Head/Middle/Tail:
  // =============================================================================

  head(i: number, t: "row" | "column") {
    if (i < 1)
      throw new Error(`Invalid quantity for head(${i}, ${t})`);

    switch (t) {
      case "row": {
        if (i < 0)
          i = this.raw.length + i;
        return table(this.raw.slice(0, i));
      } // case

      case "column": {
        const col_count = this.column_count;
        if (i < 0)
          i = col_count + i;
        return this.middle(0, this.column_count - i, "column");
      } // case
    } // switch
  } // method

  middle(start: number, end: number, t: "row" | "column") {
    if (start < 0)
      throw new Error(`Invalid start for middle(${start}, ${end}, ${t})`);
    if (end < 0)
      throw new Error(`Invalid end for middle(${start}, ${end}, ${t})`);

    switch (t) {
      case "row": {
        const row_count = this.row_count;
        return table(this.raw.slice(start, row_count - end));
      } // case

      case "column": {
        const col_count = this.column_count;
        return this.arrange(...(tail_count(col_count - start - end, col_count - end)));
      } // case
    } // switch
  } // method

  tail(i: number, t: "row" | "column"): Table {
    if (i < 1)
      throw new Error(`Invalid quantity for tail(${i}, ${t})`);
    // switch (`${i} ${t}`) {
    //   // case "1 cell": { return cell(this.raw[this.raw.length - 1].reverse()[0]); }
    //   case "1 row": { return columns([this.raw[this.raw.length - 1]]); }
    //   case "1 column": { return this.arrange(this.column_count - 1); }
    // } // switch

    switch (t) {
      // case "cell": {
      //   throw new Error(`Only 1 allowed for tail(${i}, cell)`);
      // } // case

      case "row": {
        if (i < 0)
          i = this.raw.length + i;
        return table(this.raw.reverse().slice(0, i).reverse());
      } // case

      case "column": {
        const col_count = this.column_count;
        if (i < 0)
          i = col_count + i;
        if (i > col_count)
          throw new Error(`${i} columns requested, but only ${col_count} exist.`);
        return this.arrange(...(tail_count(i, col_count)));
      } // case
    } // switch
  } // method

  // =============================================================================
  // Map:
  // =============================================================================

  map(pos: Human_Position | "values", ...funcs: Array<(x: any) => any>): Table {
    if (pos === "values") {
      const f = pipe_function(...funcs);
      const fin: any[][] = [];
      for (const old_row of this.raw)
        fin.push(old_row.map(f));
      return table(fin);
    } // if

    const indexes = human_position_to_indexes(pos, this.raw);
    if (indexes.length === 0) {
      throw new Error(`No values found in Columns for: ${Deno.inspect(pos)}`);
    } // if

    const new_arr = this.clone();
    const f = pipe_function(...funcs);
    for (const [r,c] of indexes) {
      new_arr[r][c] = f(new_arr[r][c]);
    } // for

    return table(new_arr);
  } // method

  raw_column(pos: "first" | "last" | number) {
    return column_indexes(pos, this.raw)
    .map(rc => this.raw[rc[0]][rc[1]]);
  };

  column(n: number | "last", ...funcs: Array<(x: any) => any>) {
    let i = 0;
    if (n === "last")
      i = this.column_count - 1;
    else
      i = n;

    const f = pipe_function(...funcs);
    if (i < 0)
      throw new Error(`Invalid value for column index: ${Deno.inspect(i)}`);
    if (i > this.column_count - 1)
      throw new Error(`Index value exceeds max column index: ${Deno.inspect(i)} > ${this.column_count - 1}`);
    const new_raw = this.raw.map(r => {
      const new_row = r.slice();
      new_row[i] = f(r[i]);
      return new_row;
    });
    return table(new_raw);
  } // method

  rows(...funcs: Array<(x: string[]) => string[]>): Table {
    const f = pipe_function(...funcs);
    return table(
      this.raw.map(row => f(row))
    );
  } // method

  row(n: number | "last", ...funcs: Array<(x: any) => any>) {
    let i = 0;
    if (n === "last")
      i = this.row_count - 1;
    else
      i = n;

    const f = pipe_function(...funcs);
    if (i < 0)
      throw new Error(`Invalid value for row index: ${Deno.inspect(i)}`);
    if (i > this.row_count - 1)
      throw new Error(`Index value exceeds max row index: ${Deno.inspect(i)} > ${this.column_count - 1}`);
    const new_raw = this.raw.slice();
    new_raw[i] = new_raw[i].slice().map(x => f(x));
    return table(new_raw);
  } // method

  // =============================================================================
  // Push:
  // =============================================================================

  push_value(pos: "top" | "bottom" | "left" | "right", new_s: any) : Table {
    switch (pos) {
      case "top": {
        const new_raw = this.raw.slice();
        new_raw.unshift(
          count(this.column_count).map(_x => new_s)
        );
        return table(new_raw);
      } // case

      case "bottom": {
        const new_raw = this.raw.slice();
        new_raw.push(
          count(this.column_count).map(_x => new_s)
        );
        return table(new_raw);
      } // case

      case "left": {
        const new_raw = this.raw.map(row => {
          const new_row = row.slice()
          new_row.unshift(new_s);
          return new_row;
        });
        return table(new_raw);
      } // case

      case "right": {
        const new_raw = this.raw.map(row => {
          const new_row = row.slice();
          new_row.push(new_s);
          return new_row;
        });
        return table(new_raw);
      } // case
    } // switch

  } // method

  push_function(pos: "top" | "bottom" | "left" | "right", f: (count: Loop_Info) => any) {
    switch (pos) {
      case "top": {
        const new_raw = this.raw.slice();
        const col_count = this.column_count;
        new_raw.unshift( count(this.column_count).map(count => {
          return f({count, first: count === 0, last: count === (col_count - 1) });
        }) );
        return table(new_raw);
      } // case

      case "bottom": {
        const new_raw = this.raw.slice();
        const col_count = this.column_count;
        new_raw.push(
          count(col_count).map(count => {
            return f({count, first: count === 0, last: count === (col_count - 1) });
          })
        );
        return table(new_raw);
      } // case

      case "left": {
        const row_count = this.row_count;
        return table(
          this.raw.map((row, count) => {
            const new_row = row.slice();
            new_row.unshift(f({count, first: count === 0, last: count === (row_count - 1)}));
            return new_row;
          })
        );
      } // case

      case "right": {
        const row_count = this.row_count;
        return table(
          this.raw.map((row, count) => {
            const new_row = row.slice();
            new_row.push(f({count, first: count === 0, last: count === (row_count - 1)}));
            return new_row;
          })
        );
      } // case
    }
  } // method

  push_columns(pos: "top" | "bottom" | "left" | "right", cols: Table) : Table {
    switch (pos) {
      case "top": {
        if (cols.column_count != this.column_count)
          throw new Error(`Column count mis-match: ${this.column_count} != push_columns(${pos}, ${cols.column_count})`);
        return table(cols.raw.concat(this.raw));
      } // case

      case "bottom": {
        if (cols.column_count != this.column_count)
          throw new Error(`Column count mis-match: ${this.column_count} != push_columns(${pos}, ${cols.column_count})`);
        return table(this.raw.concat(cols.raw));
      } // case

      case "left": {
        if (cols.row_count != this.row_count)
          throw new Error(`Row count mis-match: ${this.row_count} != push_columns(${pos}, ${cols.row_count})`);
        let index = -1;
        const fin: string[][] = [];
        for (const row of cols.raw) {
          ++index;
          fin.push(
            row.concat(this.raw[index])
          );
        } // for
        return table(fin);
      } // case

      case "right": {
        if (cols.row_count != this.row_count)
          throw new Error(`Row count mis-match: ${this.row_count} != push_columns(${pos}, ${cols.row_count})`);
        let index = -1;
        const fin: string[][] = [];
        for (const row of this.raw) {
          ++index;
          fin.push(
            row.concat(cols.raw[index])
          );
        } // for
        return table(fin);
      } // case
    } // switch
  } // method
} // export class

export function human_position_to_indexes(pos: Human_Position, arr: any[][]): number[][] {
  if (arr.length === 0)
    return [];

  switch (pos) {

    case "top row": {
      return arr[0].map((_x: any, i: number) => [0, i]);
    } // case

    case "bottom row": {
      if (arr.length < 2)
        return [];
      const last_row_index = arr.length - 1;
      const row = arr[last_row_index];
      return row.map((_x: any, i: number) => [last_row_index, i]);
    } // case

    case "middle rows": {
      if (arr.length < 3)
        return [];
      const slice = arr.slice(1, arr.length - 1);
      return slice.map((row, row_i) => {
        return row.map((_x, col_i) => [row_i + 1, col_i])
      }).flat();
    } // case

    case "first column": {
      return arr.map((_row, i) => [i, 0]);
    } // case

    case "last column": {
      return arr.map((row, i) => [i, row.length - 1]);
    } // case

    case "middle columns": {
      if (arr[0].length < 3)
        return [];
      const end_x = arr[0].length - 1;
      return arr.map((row, y) => {
        return row.slice(1, end_x).map((_x, col_i)=>[y, col_i+1])
      }).flat();
    } // case

    case "first cell": {
      if (arr[0].length === 0)
        return [];
      return [[0,0]];
    } // case

    case "last cell": {
      const last_row = arr[arr.length - 1];
      if (last_row.length === 0)
        return [];
      const last_cell_index = last_row.length - 1;
      return [[arr.length - 1, last_cell_index]];
    } // case

    case "top last cell": {
      const top_row = arr[0];
      if (top_row.length === 0)
        return [];
      return [[0, top_row.length - 1]]
    } // case

    case "bottom first cell": {
      const bottom_row = arr[arr.length - 1];
      if (bottom_row.length === 0)
        return [];
      return [[arr.length - 1, 0]]
    } // case

    case "top row middle": {
      const row = arr[0];
      if (row.length < 3)
        return [];
      const new_row = row.slice(1,row.length - 1);
      return new_row.map((_x, i) => [0, i+1]);
    } // case

    case "bottom row middle": {
      const row_index = arr.length - 1;
      const row = arr[row_index];
      if (row.length < 3)
        return [];
      const new_row = row.slice(1,row.length - 1);
      return new_row.map((_x, i) => [row_index, i+1]);
    } // case

    case "left column middle": {
      const fin: number[][] = [];
      let i = -1;
      const last_index = arr.length - 1;
      for (const _row of arr) {
        ++i;
        if (i === 0 || i === last_index )
          continue;
        fin.push([i, 0]);
      } // for
      return fin;
    } // case

    case "right column middle": {
      const fin: number[][] = [];
      let i = -1;
      const last_index = arr.length - 1;
      for (const row of arr) {
        ++i;
        if (i === 0 || i === last_index )
          continue;
        fin.push([i, row.length - 1]);
      } // for
      return fin;
    } // case

    case "borderless": {
      let fin: number[][] = [];
      let i = -1;
      const last_row_index = arr.length - 1;
      for (const row of arr) {
        ++i;
        if (i === 0 || i >= last_row_index)
          continue;
        const slice = row.slice(1, row.length - 1);
        if (slice.length === 0)
          return [];
        slice.forEach((_x, col_i) => fin.push([i, col_i + 1]));
      } // for
      return fin;
    } // case

  } // switch
} // export function

export function column_indexes(pos: number | "first" | "last", arr: any[][]): number[][] {
  let n = 0;
  if (arr.length === 0)
    return [];

  if (typeof pos === "number")
    n = pos;

  if (pos === "last")
    n = arr[0].length - 1;

  if (n < 0)
    throw new Error(`Invalid column index: column_indexes(${n}, arr)`);

  const fin: number[][] = [];
  let row_i = -1;
  for (const row of arr) {
    ++row_i;
    if (n < row.length)
      fin.push([row_i, n])
  } // for
  if (fin.length === 0)
    throw new Error(`Column index out of range: column_indexes(${n}, column_counts === ${Deno.inspect(arr.map(x=>x.length))})`);
  return fin;
} // export function

export function row_indexes(n: number, arr: any[][]): number[][] {
  if (arr.length === 0)
    return [];
  if (n < 0)
    throw new Error(`Invalid row index: row_indexes(${n}, arr)`);
  const fin: number[][] = [];
  if (n >= arr.length)
    throw new Error(`Row index out of range: row_indexes(${n}, arr.length === ${arr.length})`);
  let col_i = -1;
  for (const _col of arr[n]) {
    ++col_i;
    fin.push([n, col_i])
  } // for
  return fin;
} // export function

// =============================================================================
// CLI:
// =============================================================================

export function verbosity() {
  return IS_VERBOSE ? "verbose" : "quiet";
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
    tmpl_contents = await fetch_text(tmpl);
  } else {
    tmpl_contents = read_file(tmpl);
  }

  const info = path.parse(new_file);
  const {dir}  = info;

  try {
    lstat(new_file);
    const contents = read_file(new_file);
    if (contents.trim().length > 0) {
      console.error(`=== File already exists: ${new_file}`);
      return contents;
    }
  } catch (e) {
    // continue
  }

  create_dir(dir);

  write_file(new_file, compile_template(tmpl_contents, values));
  const new_contents = read_file(new_file);
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
  if (!is_exist(a))
    throw new Error(`move_file(${inspect(a)}, ${inspect(b)}): ${inspect(a)} does not exist.`);

  if (!is_exist(b))
    throw new Error(`move_file(${inspect(a)}, ${inspect(b)}): ${inspect(b)} does not exist.`);

  if (!is_file(a))
    throw new Error(`move_file(${inspect(a)}, ${inspect(b)}): ${inspect(a)} must be a file.`);

  if (!is_dir(b))
    throw new Error(`move_file(${inspect(a)}, ${inspect(b)}): ${inspect(b)} must be a directory.`);

  return Deno.renameSync(a, join(b, base(a)));
} // export function

/*
  * Moves a directory into another one:
  * move_dir("/my_dir", "some/other/dir") => some/other/dir/my_dir
*/
export function move_dir(a: string, b: string) {
  if (!is_exist(a))
    throw new Error(`move(${inspect(a)}, ${inspect(b)}): ${inspect(a)} does not exist.`);
  if (!is_exist(b))
    throw new Error(`move(${inspect(a)}, ${inspect(b)}): ${inspect(b)} does not exist.`);
  if (!is_dir(a))
    throw new Error(`move(${inspect(a)}, ${inspect(b)}): ${inspect(a)} is not a directory.`);
  if (!is_dir(b))
    throw new Error(`move(${inspect(a)}, ${inspect(b)}): ${inspect(b)} is not a directory.`);

  const new_path = join(b, base(a));
  Deno.renameSync(a, new_path);
  return new_path;
} // export function

/*
  * Rename a file:
  *   rename('dir/my_file.txt', 'new.txt') => 'dir/new.txt'
*/
export function rename_file(a: string, b: string) {
  if (!is_exist(a))
    throw new Error(`rename_file(${inspect(a)}, ${inspect(b)}): ${inspect(a)} does not exist.`);
  if (!is_file(a))
    throw new Error(`rename_file(${inspect(a)}, ${inspect(b)}): ${inspect(a)} must be a file.`);
  if (is_path(b))
    throw new Error(`rename_file(${inspect(a)}, ${inspect(b)}): ${inspect(b)} may not be a path.`);

  return _rename(a, b);
} // export function

/*
  * Rename a directory:
  *   rename('a/b/dir', 'c')               => 'a/b/c'
*/
export function rename_dir(a: string, b: string) {
  if (!is_exist(a))
    throw new Error(`rename_dir(${inspect(a)}, ${inspect(b)}): ${inspect(a)} does not exist.`);
  if (!is_dir(a))
    throw new Error(`rename_dir(${inspect(a)}, ${inspect(b)}): ${inspect(a)} must be a directory.`);
  if (is_path(b))
    throw new Error(`rename_dir(${inspect(a)}, ${inspect(b)}): ${inspect(b)} may not be a path.`);

  return _rename(a, b);
} // export function

function _rename(a: string, b: string): string {
  return cd(dir(a), () => {
    const new_path = join(cwd(), b);
    if (is_exist(new_path))
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

export function read_file(f: string) {
  return Deno.readTextFileSync(f);
} // export function

export function write_file(f: string, content: string) {
  create_dir(dir(f));
  return Deno.writeTextFileSync(f, content);
} // export function

export async function fetch_text(u: string | Request) {
  return fetch(u).then(x => x.text());
} // export async function

export async function fetch_json(u: string | Request) {
  return fetch(u).then(x => x.json());
} // export async function

export function copy_file(f: string, dest: string): string {
  if (!is_exist(f))
    throw new Error(`copy_file(${inspect(f)}, ${inspect(dest)}): ${inspect(f)} does not exist.`);
  if (!is_exist(dest))
    throw new Error(`copy_file(${inspect(f)}, ${inspect(dest)}): ${inspect(dest)} does not exist.`);
  if (!is_file(f))
    throw new Error(`copy_file(${inspect(f)}, ${inspect(dest)}): ${inspect(f)} must be a file.`);
  if (!is_dir(dest))
    throw new Error(`copy_file(${inspect(f)}, ${inspect(dest)}): ${inspect(dest)} must be a directory.`);

  const full_dest = path.join(dest, path.basename(f))

  copySync(f, full_dest);
  return full_dest;
} // export function

export function copy_dir(d: string, dest: string): string {
  if (!is_exist(d))
    throw new Error(`copy_dir(${inspect(d)}, ${inspect(dest)}): ${inspect(d)} does not exist.`);
  if (!is_exist(dest))
    throw new Error(`copy_dir(${inspect(d)}, ${inspect(dest)}): ${inspect(dest)} does not exist.`);
  if (!is_dir(d))
    throw new Error(`copy_dir(${inspect(d)}, ${inspect(dest)}): ${inspect(d)} must be a directory.`);
  if (!is_dir(dest))
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
  if (!is_exist(d))
    throw new Error(`copy_list(${inspect(d)}, ${inspect(dest)}): ${inspect(d)} does not exist.`);
  if (!is_exist(dest))
    throw new Error(`copy_list(${inspect(d)}, ${inspect(dest)}): ${inspect(dest)} does not exist.`);
  if (!is_dir(d))
    throw new Error(`copy_list(${inspect(d)}, ${inspect(dest)}): ${inspect(d)} must be a directory.`);
  if (!is_dir(dest))
    throw new Error(`copy_list(${inspect(d)}, ${inspect(dest)}): ${inspect(dest)} must be a directory.`);


  const files = list_files(real_path(d), Infinity);

  for (const f of files) {
    const f_dir = dir(f);
    if (f_dir === ".") {
      copy_file(join(d, f), dest);
    } else {
      const new_f_dir = join(dest, f_dir);
      create_dir(new_f_dir)
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
  if (!is_dir(d))
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

export function create_dir(d: string): string {
  if (is_current_dir(d))
    return d;

  if (is_exist(d)) {
    if (!is_dir(d))
      throw new Error(`create_dir(${d}): Not a directory: ${d}`)
    return d;
  }

  ensureDirSync(d);
  return d;
} // export function

export function create_file(f: string): string {
  if (is_exist(f))
    return f;

  const d = dir(f);
  if (!is_current_dir(d))
    create_dir(d);

  Deno.writeTextFileSync(f, '');
  return f;
} // export function

export function delete_symbolic_link(x: string, throwable: 'throw' | 'ignore' = 'throw'): boolean {
  return delete_file(x, throwable);
} // export function

export function delete_file(x: string, throwable: 'throw' | 'ignore' = 'throw'): boolean {
  if (!is_exist(x)) {
    if (throwable === 'throw')
      throw new Error(`${inspect(x)} does not exist.`)
    return false;
  }
  Deno.removeSync(x, {recursive: false});
  return true;
} // export function

export function delete_dir(x: string, throwable: 'throw' | 'ignore' = 'throw'): boolean {
  if (!is_exist(x)) {
    if (throwable === 'throw')
      throw new Error(`${inspect(x)} does not exist.`)
    return false;
  }

  Deno.removeSync(x, {recursive: true});
  return true;
} // export function

export function empty_file(s: string): string {
  create_file(s);
  Deno.writeTextFileSync(s, "");
  return s;
} // export function

export function empty_dir(s?: string): string {
  if (!s)
    s = '.';
  if (!is_current_dir(s))
    create_dir(s)
  if (is_current_dir(s))
    emptyDirSync(cwd());
  else
    emptyDirSync(s);
  return s;
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

export function is_path(s: string): boolean {
  const first = s.indexOf('/');
  return first > -1 && first !== (s.length - 1);
} // export function

export function is_exist(raw: string): boolean {
  try {
    return !!stat(raw);
  } catch (e) {
    return false;
  }
} // export function

export function is_empty(x: string): boolean {
  if (!is_exist(x))
    return true;

  if (is_dir(x))
    return list(x, 1).length === 0;

  return lstat(x).size === 0;
} // export function

export function is_dir(raw: string) {
  try {
    return stat(raw).isDirectory;
  } catch (err) {
    return false;
  }
} // export function

export function is_current_dir(raw: string) {
  return raw === '.' || raw === './';
} // export function

export function is_file(raw: string) {
  try {
    return stat(raw).isFile;
  } catch (err) {
    return false;
  }
} // export function

export function is_symbolic_link(raw: string) {
  try {
    return stat(raw).isSymlink;
  } catch (err) {
    return false;
  }
} // export function

export function default_read_text(default_x: any, file_path: string) {
  try {
    return Deno.readTextFileSync(file_path);
  } catch (e) {
    return default_x;
  }
} // export function

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




// function human_fs_arg(x: string): string {
//   const a = (x.at(-1) === '/') ? "dir" : "file";
//   const b = (is_exist(x)) ? '' : '?';
//   const si = x.indexOf('/');
//   const s = (si > -1 && si < x.length - 1) ? '/' : '';
//   return `${s}${a}${b}`;
// } // function
//
// function human_fs_args(a: string, b: string): string {
//   return [a,b].map(human_fs_arg).join(' -> ');
// } // function
