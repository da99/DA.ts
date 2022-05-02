
import { describe, it, equals, change_directory } from "../src/Spec.ts";
import { create } from "../src/Shell.ts";
import { raw_www_files } from "../src/Build_WWW.ts";

// =============================================================================
change_directory("build_www");
// =============================================================================

// =============================================================================
describe("raw_www_files");
// =============================================================================

it("lists files deeply nested", () => {
  create.file("a/b/c/home.njk");
  create.file("a/b/c/home.ts");
  create.file("a/b/c/home.less");

  equals(
    raw_www_files().sort(),
    "njk ts less".split(' ').map(x => `a/b/c/home.${x}`).sort()
  );
});

