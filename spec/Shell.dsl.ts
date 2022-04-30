
import { ch_test_dir, describe, it, equals, matches } from "../src/Spec.ts";
import {
  shell_string,
  copy, copy_contents_of,
  fetch_text, fetch_json,
  rename,
  mk, a_mk, cd, a_cd,
  files_of, dirs_of, remove,
  move, read_text_file, write_text_file
} from "../src/Shell.ts";

// =============================================================================
ch_test_dir(); // =============================================================
// =============================================================================

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
describe("cd execute");
// =============================================================================

it("executes commands in specified directory", () => {
  const contents = Date.now().toString();
  mk("tmp/")
  cd("tmp/", () => {
    Deno.writeTextFileSync("a.txt", contents);
  });
  const actual = read_text_file("tmp/a.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  mk("a/b/")
  const actual = cd("a/b/", () => {
    return 'hello a/b';
  });
  equals(actual, "hello a/b");
});

// =============================================================================
describe("a_cd");
// =============================================================================

it("executes commands in ./tmp", async () => {
  const contents = Date.now().toString();
  mk("a/b/");
  await a_cd("a/b/", async () => {
    return await Deno.writeTextFile("c.txt", contents);
  });
  const actual = read_text_file("a/b/c.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  mk("a/b/c/");
  const actual = await a_cd("a/b/c/", async () => {
    return shell_string(`echo`, 'hello')
  });
  equals(actual, "hello");
});

// =============================================================================
describe("mk execute");
// =============================================================================

it("executes commands in specified directory", () => {
  const contents = Date.now().toString();
  mk("tmp/a/b/", () => {
    Deno.writeTextFileSync("a.txt", contents);
  });
  const actual = read_text_file("tmp/a/b/a.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  const actual = mk("a/b/", () => {
    return 'hello a/b';
  });
  equals(actual, "hello a/b");
});

// =============================================================================
describe("a_mk");
// =============================================================================

it("executes commands in ./tmp", async () => {
  const contents = Date.now().toString();
  await a_mk("a/b/", async () => {
    return await Deno.writeTextFile("c.txt", contents);
  });
  const actual = read_text_file("a/b/c.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  const actual = await a_mk("a/b/c/", async () => {
    return shell_string(`echo`, 'hello')
  });
  equals(actual, "hello");
});

// =============================================================================
describe("rename");
// =============================================================================

it("can rename a file", () => {
  Deno.writeTextFileSync("a.txt", "hello rename");
  rename("a.txt", "b.txt");

  equals(Deno.readTextFileSync("b.txt"), "hello rename");
});

it("can rename a directory", () => {
  write_text_file("olddir/a.txt", "hello old dir");
  rename("olddir", "newdir");

  equals(Deno.readTextFileSync("newdir/a.txt"), "hello old dir");
});

it("throws an error if destination already exists", () => {
  let msg = "no error thrown";
  mk("olddir/")
  mk("newdir/")
  try {
    rename("olddir", "newdir");
  } catch (e) { msg = e.message; }

  matches(msg, /.newdir.+already exists/);
});

// =============================================================================
describe("copy file");
// =============================================================================

it("copies a file to the inside of an existing directory", () => {
  mk("adir/");
  write_text_file("a.txt", "hello 01");
  copy("a.txt", "adir");

  equals(read_text_file("adir/a.txt"), "hello 01");
});

// =============================================================================
describe("copy directory");
// =============================================================================

it("copies a directory to the inside of an existing directory: copy_dir(a, b) -> b/a", () => {
  write_text_file("a/a.txt", "hello cp_r");
  mk("b/");
  copy("a", "b");

  equals(read_text_file("b/a/a.txt"), "hello cp_r");
});

it("copies a directory to the specified existing directory: copy_dir(a,b) -> b/a", () => {
  write_text_file("a/a.txt", "hello new_A");
  mk("new_a/")
  copy("a", "new_a");

  equals(read_text_file("new_a/a/a.txt"), "hello new_A");
});


it("throws an error if src is a directory and dest is a file", () => {
  let actual = "no error thrown.";
  write_text_file("a/a.txt", "hello new_A");
  write_text_file("b.txt", "hello b.txt");
  try {
    copy("a", "b.txt");
  } catch (e) { actual = e.message; }

  matches(actual, /destination exists, but is not a directory/);
});

// =============================================================================
describe("copy_contents_of");
// =============================================================================

it("copies files into a non-existing directory: copy_dir(a,b) -> b/...", () => {
  write_text_file("a/a.txt", "hello new_A");
  write_text_file("a/b.txt", "hello new_B");
  copy_contents_of("a", "b");

  equals(
    files_of('b', Infinity),
    ["a.txt", "b.txt"]
  );
});

it("copies files into an existing directory: copy_dir(a,b) -> b/...", () => {
  write_text_file("a/a.txt", "hello new_A");
  write_text_file("a/b.txt", "hello new_B");
  mk("b/");
  copy_contents_of("a", "b");

  equals(
    files_of('b', Infinity),
    ["a.txt", "b.txt"]
  );
});

// =============================================================================
describe("move files");
// =============================================================================

it("moves the file to the specified directory", () => {
  const expect = "hello new_A";
  write_text_file('a/a.txt', expect);
  mk('b/');
  move('a/a.txt', 'b');

  equals(files_of('b', Infinity), ["a.txt"]);
});

it("creates the directory structure in the specified file path: move('a/a.txt', 'b/c/d.txt')", () => {
  const expect = "hello new_A";
  write_text_file('a/a.txt', expect);
  move('a/a.txt', 'e/d/b.txt');

  equals(read_text_file('e/d/b.txt'), expect);
});

it("creates the directory structure and moves the file: move('file', 'dir/')", () => {
  const expect = "hello new_A";
  write_text_file('a/c.txt', expect);
  move('a/c.txt', 'e/d/');

  equals(read_text_file('e/d/c.txt'), expect);
});


// =============================================================================
describe("move directorys");
// =============================================================================

it("moves the directory to the specified directory", () => {
  mk('a/c.txt');
  mk('b/');
  move('a', 'b');

  equals(dirs_of('b', Infinity), ['a']);
});

it("creates the directory structure in the specified path", () => {
  mk('a/');
  move('a', 'e/d/a');

  equals(dirs_of('e', Infinity), ['d','d/a']);
});

// =============================================================================
describe("remove file");
// =============================================================================

it("removes the file", () => {
  write_text_file("a/a.txt", "hello new_A");
  write_text_file("a/b.txt", "hello new_B");
  remove("a/b.txt");

  equals(files_of('a', Infinity), ["a.txt"]);
});

it("throws if file does not exist.", () => {
  let m = "no error thrown";

  try {
    remove("a/b.txt");
  } catch (e) {
    m = e.message;
  }

  matches(m, /b.txt.+ does not exist/);
});

it("does not throw if file does not exist and set to 'ignore'", () => {
  let m = "no error thrown";
  remove("a/b.txt", 'ignore');
  equals(m, "no error thrown")
});

// =============================================================================
describe("remove_directory");
// =============================================================================

it("removes the directory", () => {
  mk('a/');
  mk('b/');
  remove('b');

  equals(dirs_of(".", Infinity), ["a"]);
});

it("throws if directory does not exist.", () => {
  let m = "no error thrown";

  try {
    remove("a/");
  } catch (e) {
    m = e.message;
  }

  matches(m, /a.+ does not exist/);
});

it("does not throw if directory does not exist and set to 'ignore'", () => {
  let m = "no error thrown";
  remove("a/", 'ignore');
  equals(m, "no error thrown")
});


// =============================================================================
describe('mk file');
// =============================================================================

it("creates a file if it doesn't exist.", () => {
  mk("hello1.txt");

  equals(files_of('.'), ["hello1.txt"]);
});

it("creates the directory structure if it doesn't exist.", () => {
  mk("a/b/c/hello1.txt");

  equals(files_of('.', Infinity), ["a/b/c/hello1.txt"]);
});


// =============================================================================
describe('files_of');
// =============================================================================

it("lists files with maxDepth 1 by default: files_of()", () => {
  mk("hello1.txt");
  mk("a/b/c/hello2.txt");
  equals(files_of(), ["hello1.txt"]);
});

it("lists files with the specified maxDepth: files_of('.', 3)", () => {
  mk("a/b/hello1.txt");
  mk("a/b/hello2.txt");
  mk("a/b/c/d/e/fhello2.txt");

  equals(
    files_of('.', 3),
    ["a/b/hello1.txt", "a/b/hello2.txt"]
  );
});

it("does not list directories.", () => {
  mk("hello1.txt");
  mk("hello2.txt");
  mk("a/b/c/");

  equals(
    files_of('.', Infinity),
    ["hello1.txt", "hello2.txt"]
  );
});


