
import { ch_test_dir, describe, it, equals, matches } from "../src/Spec.ts";
import {
  local_tmp, a_local_tmp,
  tmp, a_tmp,
  shell_string,
  empty_dir,
  mk_dir,
  copy_file, copy_dir, copy_files_of,
  fetch_text, fetch_json,
  rename,
  mk_file,
  files, cd,
  files_of
} from "../src/Shell.ts";

// =============================================================================
describe("fetch_text");
// =============================================================================

it("returns the content as text", async () => {
  const actual = await fetch_text("https://deno.land/std/fs/mod.ts");
  matches(actual, /ensure_dir.ts/);
});

// =============================================================================
describe("fetch_json");
// =============================================================================

it("returns the content as json", async () => {
  const actual = await fetch_json("https://api.github.com/repos/denoland/deno/releases/latest");
  equals("assets" in actual, true, Object.keys(actual));
});

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
ch_test_dir(); // =============================================================
// =============================================================================

// =============================================================================
describe("rename");
// =============================================================================

it("can rename a file", () => {
  Deno.writeTextFileSync("a.txt", "hello rename");
  rename("a.txt", "b.txt");

  equals(Deno.readTextFileSync("b.txt"), "hello rename");
});

it("can rename a directory", () => {
  mk_dir("olddir")
  Deno.writeTextFileSync("olddir/a.txt", "hello old dir");
  rename("olddir", "newdir");

  equals(Deno.readTextFileSync("newdir/a.txt"), "hello old dir");
});

it("throws an error if destination already exists", () => {
  let msg = "no error thrown";
  mk_dir("olddir")
  mk_dir("newdir")
  try {
    rename("olddir", "newdir");
  } catch (e) { msg = e.message; }

  matches(msg, /.newdir.+already exists/);
});

// =============================================================================
describe("copy_file");
// =============================================================================

it("copies a file to the inside of an existing directory", () => {
  mk_dir("adir");
  Deno.writeTextFileSync("a.txt", "hello 01");
  copy_file("a.txt", "adir");

  equals(Deno.readTextFileSync("adir/a.txt"), "hello 01");
});

it("throws an error if the source is a directory.", () => {
  let actual = "no error thrown.";
  mk_dir("adir");
  Deno.writeTextFileSync("adir/a.txt", "hello 01");
  try {
    copy_file("adir", "bdir");
  } catch (e) { actual = e.message; }

  matches(actual, /.adir. is not a file/);
});

// =============================================================================
describe("copy_dir");
// =============================================================================

it("copies a directory to the inside of an existing directory: copy_dir(a, b) -> b/a", () => {
  mk_dir("a");
  mk_dir("b");
  Deno.writeTextFileSync("a/a.txt", "hello cp_r");
  copy_dir("a", "b");

  equals(Deno.readTextFileSync("b/a/a.txt"), "hello cp_r");
});

it("copies a directory to the specified non-existing directory: copy_dir(a,b) -> b", () => {
  mk_dir("a");
  Deno.writeTextFileSync("a/a.txt", "hello new_A");
  copy_dir("a", "new_a");

  equals(Deno.readTextFileSync("new_a/a.txt"), "hello new_A");
});


it("throws an error if src is a file", () => {
  mk_dir("a");
  Deno.writeTextFileSync("a/a.txt", "hello new_A");
  try {
    copy_dir("a/a.txt", "new_a");
  } catch (e) { return e.message; }

  matches("no error thrown.", /.a\/a.txt. is not a directory/);
});

it("throws an error if dest is a file", () => {
  let actual = "no error thrown.";
  mk_dir("a");
  Deno.writeTextFileSync("a/a.txt", "hello new_A");
  Deno.writeTextFileSync("b.txt", "hello b.txt");
  try {
    copy_dir("a", "b.txt");
  } catch (e) { actual = e.message; }

  matches(actual, /Cannot overwrite non-directory/);
});

// =============================================================================
describe("copy_files_of");
// =============================================================================

it("copies files into a non-existing directory: copy_dir(a,b) -> b/...", () => {
  mk_dir("a");
  Deno.writeTextFileSync("a/a.txt", "hello new_A");
  Deno.writeTextFileSync("a/b.txt", "hello new_B");
  copy_files_of("a", "b");

  const f = files_of('b', Infinity);
  equals(f, ["a.txt", "b.txt"]);
});

it("copies files into an existing directory: copy_dir(a,b) -> b/...", () => {
  mk_dir("a");
  Deno.writeTextFileSync("a/a.txt", "hello new_A");
  Deno.writeTextFileSync("a/b.txt", "hello new_B");
  mk_dir("b");
  copy_files_of("a", "b");

  const f = files_of('b', Infinity);
  equals(f, ["a.txt", "b.txt"]);
});

// =============================================================================
describe('mk_file');
// =============================================================================

it("creates a file if it doesn't exist.", () => {
  mk_file("hello1.txt");
  const actual = files();

  equals(actual, ["hello1.txt"]);
});

it("creates the directory structure if it doesn't exist.", () => {
  mk_file("a/b/c/hello1.txt");
  const actual = files(Infinity);

  equals(actual, ["a/b/c/hello1.txt"]);
});


// =============================================================================
describe('files');
// =============================================================================

it("lists files with maxDepth 1 by default: files()", () => {
  mk_file("hello1.txt");
  mk_file("a/b/c/hello2.txt");
  const actual = files();

  equals(actual, ["hello1.txt"]);
});

it("lists files with the specified maxDepth: files(3)", () => {
  mk_file("a/b/hello1.txt");
  mk_file("a/b/hello2.txt");
  mk_file("a/b/c/d/e/fhello2.txt");
  const actual = files(3);

  equals(actual, ["a/b/hello1.txt", "a/b/hello2.txt"]);
});

it("does not list directories.", () => {
  mk_file("hello1.txt");
  mk_file("hello2.txt");
  mk_dir("a/b/c");
  const actual = files();

  equals(actual, ["hello1.txt", "hello2.txt"]);
});
