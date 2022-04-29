
import caller from 'https://raw.githubusercontent.com/apiel/caller/master/caller.ts';
import { Text_File } from "../src/Shell.ts";
import { assertMatch as matches, assertEquals as EQUALS } from "https://deno.land/std/testing/asserts.ts";
import { deepEqual } from "https://deno.land/x/cotton/src/utils/deepequal.ts";
import { bold as BOLD, blue as BLUE, green as GREEN, red as RED, bgBlue, yellow as YELLOW, white  } from "https://deno.land/std/fmt/colors.ts";
import { emptyDirSync, ensureDirSync } from "https://deno.land/std/fs/mod.ts";
import { writeAllSync } from "https://deno.land/std/streams/conversion.ts";
import * as path from "https://deno.land/std/path/mod.ts";

// # =============================================================================
type Async_Function = () => Promise<void>;
type Void_Function = () => void;
interface Print_Stack_Record  {
  filename?: string;
  describe?: string;
  it?:       string;
  async_f?:  Async_Function;
}

export { matches };

// # =============================================================================
const CHECK_MARK = "✓";
const X_MARK     = "✗";
const THIS_CWD   = Deno.cwd();
let TEST_DIR     = THIS_CWD;

// # =============================================================================

// # =============================================================================
const LAST_FAIL_FILE = "tmp/spec/last.fail";
const PRINT_STACK: Array<Print_Stack_Record> = [];
const FILE_STACK: File[] = [];

export function equals(x: any, y: any, z: any = "iGnOrEd") {
  if (deepEqual(x, y))
    return true;
  if (z !== "iGnOrEd") {
    console.error("");
    console.error(z);
  }
  return EQUALS(x,y);
} // export function

function get_content(s: string) {
  try{
    return Deno.readTextFileSync(s);
  } catch(e) {
    return null;
  }
} // function

export function filename(f: string) {
  if (f.indexOf(":") > 0) {
    return (new URL(f)).pathname;
  }

  return f;
} // function

function prompt(raw_text: string) {
  return writeAllSync(
    Deno.stderr,
    new TextEncoder().encode(raw_text)
  );
} // function

let module_caller: undefined | string = import.meta.url;
let unknown_caller = 0;

class File {
  describes: Describe[];
  file:      string;
  constructor(file: string) {
    this.describes = [];
    this.file  = file
  } // constructor

  desc(t: string) {
    const d = new Describe(t);
    this.describes.push(d);
    return d;
  } // method

  is_title_match(s: string): boolean {
    return !!this.file.toLowerCase().match(s.toLowerCase());
  } // method

  describe_matches(s: string): Describe[] {
    if (this.is_title_match(s))
      return this.describes;
    return this.describes.filter(d => d.some_match(s));
  } // method

  matches(s: string): boolean {
    return this.is_title_match(s) || this.describes.some(d => d.some_match(s));
  } // method
} // class

class Describe {
  title: string;
  its:   It[];
  file:  string;

  constructor(t: string) {
    this.title = t;
    this.its = [];
    this.file = filename(caller() || `[UNKNOWN FILE ${++unknown_caller}`);
  } // constructor

  it(t: string, f: Async_Function, test_dir: string) {
    const i = new It(t, f, test_dir);
    this.its.push(i);
    return i;
  } // method

  some_match(s: string): boolean {
    return this.is_title_match(s) || this.its.some(i => i.is_title_match(s));
  } // method

  is_title_match(s: string): boolean {
    return !!this.title.toLowerCase().match(s.toLowerCase());
  } // method

  it_matches(s: string): It[] {
    if (this.is_title_match(s))
      return this.its;
    const its = this.its.filter(i => i.is_title_match(s));
    if (its.length === 0)
      return this.its;
    return its;
  } // method
} // class

class It {
  title:    string;
  func:     Async_Function;
  test_dir: string;

  constructor(t: string, f: Async_Function, test_dir: string) {
    this.title    = t;
    this.func     = f;
    this.test_dir = test_dir;
  } // constructor

  is_title_match(s: string): boolean {
    return !!this.title.toLowerCase().match(s.toLowerCase());
  } // matches
} // class

/*
  * Prepends "tmp/" to the destination.
*/
export function ch_test_dir(destination: string = "test_run") {
  TEST_DIR = path.join("tmp", destination);
  return TEST_DIR;
} // export function

export function describe(title: string) {
  const current_caller = filename(caller() || `[UNKNOWN FILE ${++unknown_caller}`);
  if (current_caller !== module_caller) {
    TEST_DIR = THIS_CWD;
    PRINT_STACK.push({filename: current_caller});
    FILE_STACK.push(new File(current_caller));
    module_caller = current_caller
  }
  FILE_STACK.at(-1)!.desc(title);
  PRINT_STACK.push({describe: title});
} // function

export function it(title: string, raw_f: Void_Function | Async_Function) {
  const f: (() => Promise<void>) = (raw_f.constructor.name === "Async Function") ?
    (raw_f as Async_Function) :
    (function () { return Promise.resolve(raw_f()); });

  FILE_STACK.at(-1)!.describes.at(-1)!.it(title, f, TEST_DIR);
  PRINT_STACK.push({
    "it": title,
    "async_f": f
  });
} // function

export async function finish(match? : string) {
  ensureDirSync(path.dirname(LAST_FAIL_FILE));
  let at_least_one_it_ran = false;
  const LAST_FAIL_VERSION = get_content(LAST_FAIL_FILE);

  const files = (match) ? FILE_STACK.filter(f => f.matches(match)) : FILE_STACK;
  for (const f of files) {
    prompt(`\n${BOLD(YELLOW("FILE:"))} ${bgBlue(f.file)}\n`);

    let descs = (match) ? f.describe_matches(match) : f.describes;

    for (const d of descs) {
      prompt(`${BOLD(BLUE(d.title))}\n`);

      let its = (match) ? d.it_matches(match) : d.its;

      for (const i of its) {
        const res = Deno.resources();
        const version = `${f.file} ${d.title} ${i.title}`;

        if (LAST_FAIL_VERSION && version !== LAST_FAIL_VERSION)
          continue;

        prompt(`  ${i.title} `);

        at_least_one_it_ran = true;
        try {
          if (THIS_CWD !== i.test_dir) {
            emptyDirSync(i.test_dir);
            Deno.chdir(i.test_dir)
          }
          await i.func();
          Deno.chdir(THIS_CWD);
          prompt(GREEN(`${CHECK_MARK}\n`));
          EQUALS(res, Deno.resources());
          if (LAST_FAIL_VERSION === version) {
            await Deno.remove(LAST_FAIL_FILE);
            break;
          }
        } catch(e) {
          Deno.chdir(THIS_CWD);
          prompt(BOLD(RED(`${X_MARK}\n`)));
          if (LAST_FAIL_VERSION !== version) {
            Deno.writeTextFileSync(LAST_FAIL_FILE, version);
          }
          throw e;
        }
      } // for its
    } // for descs
  } // for FILE_STACK

  if (!at_least_one_it_ran) {
    // We assume the test name change. Delete last.fail
    try {
      await Deno.remove(LAST_FAIL_FILE)
    } catch (e) {
      // ignore
      // console.error(e.message);
    }
    console.error(YELLOW("=========== No tests ran. ============="));
  }
} // function
