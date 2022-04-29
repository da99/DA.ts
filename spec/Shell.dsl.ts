
import { describe, it, equals, matches } from "../src/Spec.ts";
import {
  local_tmp, a_local_tmp,
  tmp, a_tmp,
  shell_string,
  empty_dir,
  mkdir_p,
  copy_file, copy_dir,
  fetch_text, fetch_json,
  rename,
  ensure_file,
  files
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
describe("rename");
// =============================================================================

it("can rename a file", () => {
  const actual = local_tmp("spec.dsl/rename", () => {
    empty_dir();
    Deno.writeTextFileSync("a.txt", "hello rename");
    rename("a.txt", "b.txt");
    return Deno.readTextFileSync("b.txt");
  })
  equals(actual, "hello rename");
});

it("can rename a directory", () => {
  const actual = local_tmp("spec.dsl/rename", () => {
    empty_dir();
    mkdir_p("olddir")
    Deno.writeTextFileSync("olddir/a.txt", "hello old dir");
    rename("olddir", "newdir");
    return Deno.readTextFileSync("newdir/a.txt");
  })
  equals(actual, "hello old dir");
});

it("throws an error if destination already exists", () => {
  let msg = "no error thrown";
  const actual = local_tmp("spec.dsl/rename", () => {
    empty_dir();
    mkdir_p("olddir")
    mkdir_p("newdir")
    try {
      rename("olddir", "newdir");
    } catch (e) {
      msg = e.message;
    }
    return msg;
  });
  matches(actual, /.newdir.+already exists/);
});

// =============================================================================
describe("copy_file");
// =============================================================================

it("copies a file to the inside of an existing directory", () => {
  const actual = local_tmp("spec.dsl/cp", () => {
    empty_dir();
    mkdir_p("adir");
    Deno.writeTextFileSync("a.txt", "hello 01");
    copy_file("a.txt", "adir");
    return Deno.readTextFileSync("adir/a.txt");
  })
  equals(actual, "hello 01");
});

it("throws an error if the source is a directory.", () => {
  const actual = local_tmp("spec.dsl/cp", () => {
    empty_dir();
    mkdir_p("adir");
    Deno.writeTextFileSync("adir/a.txt", "hello 01");
    try {
      copy_file("adir", "bdir");
    } catch (e) {
      return e.message;
    }
    return "no error thrown.";
  })
  matches(actual, /.adir. is not a file/);
});

// =============================================================================
describe("copy_dir");
// =============================================================================

it("copies a directory to the inside of an existing directory", () => {
  const actual = local_tmp("spec.dsl/cp_r", () => {
    empty_dir();
    mkdir_p("a");
    mkdir_p("b");
    Deno.writeTextFileSync("a/a.txt", "hello cp_r");
    copy_dir("a", "b");
    return Deno.readTextFileSync("b/a/a.txt");
  })
  equals(actual, "hello cp_r");
});

it("copies a directory to the specified non-existing directory", () => {
  const actual = local_tmp("spec.dsl/cp_r", () => {
    empty_dir();
    mkdir_p("a");
    Deno.writeTextFileSync("a/a.txt", "hello new_A");
    copy_dir("a", "new_a");
    return Deno.readTextFileSync("new_a/a.txt");
  })
  equals(actual, "hello new_A");
});

it("throws an error if src is a file", () => {
  const actual = local_tmp("spec.dsl/cp_r", () => {
    empty_dir();
    mkdir_p("a");
    Deno.writeTextFileSync("a/a.txt", "hello new_A");
    try {
      copy_dir("a/a.txt", "new_a");
    } catch (e) {
      return e.message;
    }
    return "no error thrown.";
  })
  matches(actual, /.a\/a.txt. is not a directory/);
});

it("throws an error if dest is a file", () => {
  const actual = local_tmp("spec.dsl/cp_r", () => {
    empty_dir();
    mkdir_p("a");
    Deno.writeTextFileSync("a/a.txt", "hello new_A");
    Deno.writeTextFileSync("b.txt", "hello b.txt");
    try {
      copy_dir("a", "b.txt");
    } catch (e) {
      return e.message;
    }
    return "no error thrown.";
  })
  matches(actual, /Cannot overwrite non-directory/);
});


// =============================================================================
describe('ensure_file');
// =============================================================================

it("creates a file if it doesn't exist.", () => {
  const actual = local_tmp("spec.dsl/ensure_file", () => {
    empty_dir();
    ensure_file("hello1.txt");
    return files().map(x => x.path);
  })
  equals(actual, ["hello1.txt"]);
})
