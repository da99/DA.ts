
import { describe, it, equals, matches } from "../src/Spec.ts";
import {
  local_tmp, a_local_tmp,
  tmp, a_tmp,
  shell_string,
  empty_dir,
  mkdir_p,
  cp, cp_r
} from "../src/Shell.ts";

// =============================================================================
describe("local_tmp");
// =============================================================================

it("executes commands in ./tmp", () => {
  const contents = Date.now().toString();
  local_tmp("spec.dsl", () => {
    Deno.writeTextFileSync("a.txt", contents);
  });
  const actual = Deno.readTextFileSync("tmp/spec.dsl/a.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  const actual = local_tmp("spec.dsl", () => {
    return "hello sync"
  });
  equals(actual, "hello sync");
});

// =============================================================================
describe("a_local_tmp");
// =============================================================================

it("executes commands in ./tmp", async () => {
  const contents = Date.now().toString();
  const x = await a_local_tmp("spec.dsl", async () => {
    return await Deno.writeTextFile("b.txt", contents);
  });
  const actual = Deno.readTextFileSync("tmp/spec.dsl/b.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  const actual = await a_local_tmp("spec.dsl", async () => {
    return shell_string(`echo`, 'hello')
  });
  equals(actual, "hello");
});

// =============================================================================
describe("cp");
// =============================================================================

it("copies a file to the inside of an existing directory", () => {
  const actual = local_tmp("spec.dsl/cp", () => {
    empty_dir();
    mkdir_p("adir");
    Deno.writeTextFileSync("a.txt", "hello 01");
    cp("a.txt", "adir");
    return Deno.readTextFileSync("adir/a.txt");
  })
  equals(actual, "hello 01");
});

// =============================================================================
describe("cp_r");
// =============================================================================

it("copies a directory to the inside of an existing directory", () => {
  const actual = local_tmp("spec.dsl/cp_r", () => {
    empty_dir();
    mkdir_p("a");
    mkdir_p("b");
    Deno.writeTextFileSync("a/a.txt", "hello cp_r");
    cp_r("a", "b");
    return Deno.readTextFileSync("b/a/a.txt");
  })
  equals(actual, "hello cp_r");
});

it("copies a directory to the specified non-existing directory", () => {
  const actual = local_tmp("spec.dsl/cp_r", () => {
    empty_dir();
    mkdir_p("a");
    Deno.writeTextFileSync("a/a.txt", "hello new_A");
    cp_r("a", "new_a");
    return Deno.readTextFileSync("new_a/a.txt");
  })
  equals(actual, "hello new_A");
});

it("throws an error if a file is copied", () => {
  const actual = local_tmp("spec.dsl/cp_r", () => {
    empty_dir();
    mkdir_p("a");
    Deno.writeTextFileSync("a/a.txt", "hello new_A");
    try {
      cp_r("a/a.txt", "new_a");
    } catch (e) {
      return e.message;
    }
    return "no error thrown.";
  })
  matches(actual, /is not a directory/, actual);
});
