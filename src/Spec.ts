
import caller from 'https://raw.githubusercontent.com/apiel/caller/master/caller.ts';
import { Text_File } from "../src/Shell.ts";
import { assertMatch as matches, assertEquals as EQUALS } from "https://deno.land/std/testing/asserts.ts";
import { deepEqual } from "https://deno.land/x/cotton/src/utils/deepequal.ts";
import { bold as BOLD, blue as BLUE, green as GREEN, red as RED, bgBlue, yellow as YELLOW, white  } from "https://deno.land/std/fmt/colors.ts";
import { ensureDirSync } from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

// # =============================================================================
type Asyn_Function = () => Promise<void>;
type Void_Function = () => void;
interface Print_Stack_Record  {
  filename?: string;
  describe? : string;
  it? : string;
  async_f? : Asyn_Function;
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

export function describe(title: string) {
  const current_caller = filename(caller() || `[UNKNOWN FILE ${++unknown_caller}`);
  if (current_caller !== module_caller) {
    PRINT_STACK.push({filename: current_caller});
    module_caller = current_caller
  }
  PRINT_STACK.push({describe: title});
} // function

export function it(raw_title: string, raw_f: Void_Function | Asyn_Function) {
  const f: null | (() => Promise<void>) = (raw_f.constructor.name === "Async Function") ?
    (raw_f as Asyn_Function) :
    (function () { return Promise.resolve(raw_f()); });

  PRINT_STACK.push({
    "it": raw_title,
    "async_f": f
  });
} // function

export async function finish(match? : string) {
  ensureDirSync(path.dirname(LAST_FAIL_FILE));
  let last_filename       = null;
  let last_desc           = null;
  let at_least_one_it_ran = false;
  const LAST_FAIL_VERSION = get_content(LAST_FAIL_FILE);

  for (const x of PRINT_STACK) {
    if (x.describe) {
      last_desc = x.describe;
      prompt(`${BOLD(BLUE(x.describe as string))}\n`);
      continue;
    }

    if (x.filename) {
      last_filename = x.filename;
      prompt(`\n${BOLD(YELLOW("FILE:"))} ${bgBlue(x.filename)}\n`);
      continue;
    }

    if (x.it && x.async_f) {
      const is_match = !match || !!(`${last_filename} ${last_desc} ${x.it}`.match(match));
      if (!is_match)
        continue;
      const res = Deno.resources();
      const version = `${last_filename} ${last_desc} ${x.it}`;

      if (LAST_FAIL_VERSION && version !== LAST_FAIL_VERSION) {
        continue;
      }

      prompt(`  ${x.it as string} `);

      at_least_one_it_ran = true;
      try {
        await x.async_f();
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
    } // if/else
  } // for

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
