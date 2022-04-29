
import { describe, it, equals, ch_test_dir } from "../src/Spec.ts";
import { mk_file } from "../src/Shell.ts";
import { raw_www_files } from "../src/Build_WWW.ts";

// =============================================================================
ch_test_dir("build_www");
// =============================================================================

// =============================================================================
describe("raw_www_files");
// =============================================================================

it("lists files deeply nested", () => {
  mk_file("a/b/c/home.njk");
  mk_file("a/b/c/home.ts");
  mk_file("a/b/c/home.less");

  equals(
    raw_www_files().sort(),
    "njk ts less".split(' ').map(x => `a/b/c/home.${x}`).sort()
  );
});

