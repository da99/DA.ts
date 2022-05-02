
import { change_directory, describe, it, equals, matches } from "../src/Spec.ts";
import {
  is_exist,
  sh, shell_string, stat,
  copy_file, copy_dir, copy_list,
  fetch_text, fetch_json,
  rename_file, rename_dir,
  create_file, create_dir, cd, a_cd,
  list, list_files, list_dirs, delete_file, delete_dir,
  move_file, move_dir, read_file, write_file
} from "../src/Shell.ts";

// =============================================================================
change_directory(); // =============================================================
// =============================================================================

// =============================================================================
describe("sh");
// =============================================================================

it(`runs the command`, async () => {
  await sh(`touch a.txt`);
  equals(is_exist('a.txt'), true);
});

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
  create_dir("tmp/")
  cd("tmp/", () => {
    Deno.writeTextFileSync("a.txt", contents);
  });
  const actual = read_file("tmp/a.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  create_dir("a/b/")
  const actual = cd("a/b/", () => {
    return 'hello a/b';
  });
  equals(actual, "hello a/b");
});

it("executes commands in specified directory", () => {
  const contents = Date.now().toString();
  cd(create_dir("tmp/a/b/"), () => {
    Deno.writeTextFileSync("a.txt", contents);
  });
  const actual = read_file("tmp/a/b/a.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  const actual = cd(create_dir("a/b/"), () => {
    return 'hello a/b';
  });
  equals(actual, "hello a/b");
});

// =============================================================================
describe("a_cd");
// =============================================================================

it("executes commands in ./tmp", async () => {
  const contents = Date.now().toString();
  create_dir("a/b/");
  await a_cd("a/b/", async () => {
    return await Deno.writeTextFile("c.txt", contents);
  });
  const actual = read_file("a/b/c.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  const actual = await a_cd(create_dir("a/b/c/"), async () => {
    return shell_string(`echo`, 'hello')
  });
  equals(actual, "hello");
});


// =============================================================================
describe("a_mk");
// =============================================================================

it("executes commands in ./tmp", async () => {
  const contents = Date.now().toString();
  await a_cd(create_dir("a/b/"), async () => {
    return await Deno.writeTextFile("c.txt", contents);
  });
  const actual = read_file("a/b/c.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  const actual = await a_cd(create_dir("a/b/c/"), async () => {
    return shell_string(`echo`, 'hello')
  });
  equals(actual, "hello");
});

// =============================================================================
describe("create_file");
// =============================================================================

it("creates the directory structure if it does exists.", () => {
  create_file('a/b/c/d.txt');
  equals(list_dirs('.', Infinity), ["a", "a/b", "a/b/c"]);
})

// =============================================================================
describe("rename_file");
// =============================================================================

it("renames a file", () => {
  Deno.writeTextFileSync("a.txt", "hello rename");
  rename_file("a.txt", "b.txt");

  equals(Deno.readTextFileSync("b.txt"), "hello rename");
});

it("throws an error if destination already exists", () => {
  let msg = "no error thrown";
  create_file("a.txt")
  create_file("b.txt")
  try {
    rename_file("a.txt", "b.txt");
  } catch (e) { msg = e.message; }

  matches(msg, /.b.txt.+already exists/);
});

// =============================================================================
describe("rename_dir");
// =============================================================================

it("renames a directory", () => {
  write_file("olddir/a.txt", "hello old dir");
  rename_dir("olddir", "newdir");

  equals(Deno.readTextFileSync("newdir/a.txt"), "hello old dir");
});

it("throws an error if destination already exists", () => {
  let msg = "no error thrown";
  create_dir("olddir")
  create_dir("newdir")
  try {
    rename_dir("olddir", "newdir");
  } catch (e) { msg = e.message; }

  matches(msg, /.newdir.+already exists/);
});

// =============================================================================
describe("copy_file");
// =============================================================================

it("copies a file to the inside of an existing directory", () => {
  create_dir("adir/");
  write_file("a.txt", "hello 01");
  copy_file("a.txt", "adir");

  equals(read_file("adir/a.txt"), "hello 01");
});

// =============================================================================
describe("copy_dir");
// =============================================================================

it("copies a directory to the inside of an existing directory: copy_dir(a, b) -> b/a", () => {
  write_file("a/a.txt", "hello cp_r");
  create_dir("b/");
  copy_dir("a", "b");

  equals(read_file("b/a/a.txt"), "hello cp_r");
});

it("copies a directory to the specified existing directory: copy_dir(a,b) -> b/a", () => {
  write_file("a/a.txt", "hello new_A");
  create_dir("new_a/")
  copy_dir("a", "new_a");

  equals(read_file("new_a/a/a.txt"), "hello new_A");
});


it("throws an error if src is a directory and dest is a file", () => {
  let actual = "no error thrown.";
  write_file("a/a.txt", "hello new_A");
  write_file("b.txt", "hello b.txt");
  try {
    copy_dir("a", "b.txt");
  } catch (e) { actual = e.message; }

  matches(actual, /b.txt.* must be a directory/);
});

// =============================================================================
describe("copy_list");
// =============================================================================

it("throws an error if destination does not exist: copy_list(a,b) -> b/...", () => {
  write_file("a/a.txt", "hello new_A");
  write_file("a/b.txt", "hello new_B");
  let m = "no error thrown";
  try {
    copy_list("a", "b");
  } catch (e) {
    m = e.message;
  }

  matches(
    m,
    /b.+does not exist/
  );
});

it("copies files into an existing directory: copy_list(a,b) -> b/...", () => {
  write_file("a/a.txt", "hello new_A");
  write_file("a/b.txt", "hello new_B");
  create_dir("b");
  copy_list("a", "b");

  equals(
    list_files('b', Infinity),
    ["a.txt", "b.txt"]
  );
});

// =============================================================================
describe("move_file");
// =============================================================================

it("moves the file to the specified directory", () => {
  const expect = "hello new_A";
  write_file('a/a.txt', expect);
  create_dir('b/');
  move_file('a/a.txt', 'b/');

  equals(list_files('b', Infinity), ["a.txt"]);
});

it("throws an error if destination does not exists: move_file('a/a.txt', 'e/d/')", () => {
  const expect = "hello new_A";
  let m = "no error thrown";
  write_file('a/a.txt', expect);
  try {
    move_file('a/a.txt', 'e/d/');
  } catch (e) {
    m = e.message
  }

  matches(m, /e\/d.+does not exist/)
});


// =============================================================================
describe("move_dir");
// =============================================================================

it("moves the directory to the specified directory", () => {
  create_file('a/c.txt');
  create_dir('b');
  move_dir('a', 'b');

  equals(list('b', Infinity), ['a', 'a/c.txt']);
});

it("throws an Error if destination directory does not exist", () => {
  let m = "no error thrown";
  create_dir("a/b/c/")
  try {
    move_dir('a/b/c/', 'f/e/d/');
  } catch (e) {
    m = e.message;
  }

  matches(m, /f.e.d.+ does not exist/);
});

// =============================================================================
describe("delete_file");
// =============================================================================

it("removes the file", () => {
  write_file("a/a.txt", "hello new_A");
  write_file("a/b.txt", "hello new_B");
  delete_file("a/b.txt");

  equals(list_files('a', Infinity), ["a.txt"]);
});

it("throws if file does not exist.", () => {
  let m = "no error thrown";

  try {
    delete_file("a/b.txt");
  } catch (e) {
    m = e.message;
  }

  matches(m, /b.txt.+ does not exist/);
});

it("does not throw if file does not exist and set to 'ignore'", () => {
  let m = "no error thrown";
  delete_file("a/b.txt", 'ignore');
  equals(m, "no error thrown")
});

// =============================================================================
describe("delete_dir");
// =============================================================================

it("removes the directory", () => {
  create_dir('a/');
  create_dir('b/');
  delete_dir('b');

  equals(list_dirs(".", Infinity), ["a"]);
});

it("throws if directory does not exist.", () => {
  let m = "no error thrown";

  try {
    delete_dir("a/");
  } catch (e) {
    m = e.message;
  }

  matches(m, /a.+ does not exist/);
});

it("does not throw if directory does not exist and set to 'ignore'", () => {
  let m = "no error thrown";
  delete_dir("a/", 'ignore');
  equals(m, "no error thrown")
});


// =============================================================================
describe('create_file');
// =============================================================================

it("creates a file if it doesn't exist.", () => {
  create_file("hello1.txt");

  equals(list_files('.'), ["hello1.txt"]);
});

it("creates the directory structure if it doesn't exist.", () => {
  create_file("a/b/c/hello1.txt");

  equals(list_files('.', Infinity), ["a/b/c/hello1.txt"]);
});

// =============================================================================
describe('list');
// =============================================================================

it("lists files of the current directory with a level of 1: list()", () => {
  create_file('f/i/l/e/a.txt');
  equals(
    list("."),
    ['f']
  )
});

it("lists files of the specified directory: list('dir')", () => {
  create_file('f/i/l/e/a.txt');
  equals(
    list("f/i/l/e"),
    ['a.txt']
  )
});

it("lists files of the specified directory with specified level: list('dir', n)", () => {
  create_file('a/f.txt');
  create_file('a/b/f.txt');
  create_file('a/b/c/f.txt');
  equals(
    list("a", Infinity),
    ['f.txt', 'b', 'b/f.txt', 'b/c', 'b/c/f.txt']
  )
});

// =============================================================================
describe('list_files');
// =============================================================================

it("lists files with maxDepth 1 by default: list_files()", () => {
  create_file("hello1.txt");
  create_file("a/b/c/hello2.txt");
  equals(list_files(), ["hello1.txt"]);
});

it("lists files with the specified maxDepth: list_files('.', 3)", () => {
  create_file("a/b/hello1.txt");
  create_file("a/b/hello2.txt");
  create_file("a/b/c/d/e/fhello2.txt");

  equals(
    list_files('.', 3),
    ["a/b/hello1.txt", "a/b/hello2.txt"]
  );
});

it("does not list directories.", () => {
  create_file("hello1.txt");
  create_file("hello2.txt");
  create_dir("a/b/c/");

  equals(
    list_files('.', Infinity),
    ["hello1.txt", "hello2.txt"]
  );
});

// =============================================================================
describe('list_dirs');
// =============================================================================

it("lists dirs with maxDepth 1 by default: list_dirs()", () => {
  create_file("a/b/c/hello2.txt");
  create_file("b/b/hello2.txt");
  equals(list_dirs(), ["a", "b"]);
});

it("lists files with the specified maxDepth: list_dirs('dir', n)", () => {
  create_file("a/b/hello1.txt");
  create_file("a/b/hello2.txt");
  create_file("a/b/c/d/fhello2.txt");

  equals(
    list_dirs('.', Infinity),
    ['a', 'a/b', 'a/b/c', 'a/b/c/d']
  );
});

it("does not list files.", () => {
  create_file("a/hello1.txt");
  create_file("b/hello2.txt");

  equals(
    list_dirs('.', Infinity),
    ['a', 'b']
  );
});
