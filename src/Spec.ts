
import caller from 'https://raw.githubusercontent.com/apiel/caller/master/caller.ts';
import { Text_File } from "../src/Shell.ts";
import { assertMatch as matches, assertEquals as EQUALS } from "https://deno.land/std/testing/asserts.ts";
import { deepEqual } from "https://deno.land/x/cotton/src/utils/deepequal.ts";
import { bold as BOLD, blue as BLUE, green as GREEN, red as RED, bgBlue, yellow as YELLOW, white  } from "https://deno.land/std/fmt/colors.ts";
import { ensureDirSync } from "https://deno.land/std/fs/mod.ts";
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
const X_MARK = "✗";

// # =============================================================================
function is_async_function(x: any) {
  return typeof(x) === "object" && x.constructor.name === "AsyncFunction";
} // function

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
  return Deno.writeAllSync(
    Deno.stderr,
    new TextEncoder().encode(raw_text)
  );
} // function

let module_caller: undefined | string = import.meta.url;
let unknown_caller = 0;

class File {
  descs: Describe[];
  file: string;
  constructor(file: string) {
    this.descs = [];
    this.file  = file
  } // constructor

  desc(t: string) {
    const d = new Describe(t);
    this.descs.push(d);
    return d;
  } // method

  matches(s: string): boolean {
    return !!this.file.toLowerCase().match(s.toLowerCase()) || this.descs.some(d => d.matches(s));
  } // method
} // class

class Describe {
  title: string;
  its: It[];
  file: string;
  constructor(t: string) {
    this.title = t;
    this.its = [];
    this.file = filename(caller() || `[UNKNOWN FILE ${++unknown_caller}`);
  } // constructor

  it(t: string, f: Async_Function) {
    const i = new It(t, f);
    this.its.push(i);
    return i;
  } // method

  matches(s: string): boolean {
    return !!this.title.toLowerCase().match(s.toLowerCase()) || this.its.some(i => i.matches(s));
  } // matches
} // class

class It {
  title: string;
  func:  Async_Function;

  constructor(t: string, f: Async_Function) {
    this.title = t;
    this.func = f;
  } // constructor

  matches(s: string): boolean {
    return !!this.title.toLowerCase().match(s.toLowerCase());
  } // matches
} // class

export function describe(title: string) {
  const current_caller = filename(caller() || `[UNKNOWN FILE ${++unknown_caller}`);
  if (current_caller !== module_caller) {
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

  FILE_STACK.at(-1)!.descs.at(-1)!.it(title, f);
  PRINT_STACK.push({
    "it": title,
    "async_f": f
  });
} // function

export async function finish(match? : string) {
  ensureDirSync(path.dirname(LAST_FAIL_FILE));
  let last_filename       = null;
  let last_desc           = null;
  let at_least_one_it_ran = false;
  const LAST_FAIL_VERSION = get_content(LAST_FAIL_FILE);

  const files = (match) ? FILE_STACK.filter(f => f.matches(match)) : FILE_STACK;
  for (const f of files) {
    prompt(`\n${BOLD(YELLOW("FILE:"))} ${bgBlue(f.file)}\n`);

    const descs = (match) ? f.descs.filter(d => d.matches(match)) : f.descs;

    for (const d of descs) {
      prompt(`${BOLD(BLUE(d.title))}\n`);

      let its = (match) ? d.its.filter(i => i.matches(match)) : d.its;
      if (its.length === 0)
        its = d.its;
      for (const i of its) {
        const res = Deno.resources();
        const version = `${f.file} ${d.title} ${i.title}`;

        if (LAST_FAIL_VERSION && version !== LAST_FAIL_VERSION) {
          continue;
        }

        prompt(`  ${i.title} `);

        at_least_one_it_ran = true;
        try {
          await i.func();
          prompt(GREEN(`${CHECK_MARK}\n`));
          EQUALS(res, Deno.resources());
          if (LAST_FAIL_VERSION === version) {
            await Deno.remove(LAST_FAIL_FILE);
            break;
          }
        } catch(e) {
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
