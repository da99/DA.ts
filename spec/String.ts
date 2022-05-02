import { describe, it, equals } from "../src/Spec.ts";
import {
  split_whitespace,
  split_join,
} from "../src/Function.ts";
import {
  each_block,
  insert_after_line_contains
} from "../src/Template.ts";

// # =============================================================================
describe("split_whitespace");

it("removes whitespace from beginning, middle, and end", function () {
  const str = "  a  \r\n \t b    c ";
  const actual = split_whitespace(str);
  equals(actual, "a b c".split(" "));
}); // it

it("splits the value", () => {
  const actual = split_whitespace("e n d");
  equals(actual, ["e", "n", "d"]);
});

it("splits the value, ignoreding whitespace at the beginning/end.", () => {
  const actual = split_whitespace("  e n d  \t ");
  equals(actual, ["e", "n", "d"]);
});

it("returns a Rows instance", () => {
  const actual = split_whitespace("e n d");
  equals(actual.constructor, Array);
});

// # =============================================================================
describe("each_block");

it("gets the body of the inner block", () => {
  const actual = each_block(`
  > start
  a
  b
  c
  < end
  `, "> start", "< end");
  equals("a b c", split_join(actual.join(" ")))
}); // it

it("ignores whitespace of the surrounding substrings.", () => {
  const actual = each_block(`
  >   > start
  1 2 3  < < end
  `, "> > start", "<  <  end");
  equals("1 2 3", actual.join(" ").trim());
}); //it

it("calls the callback for each block", () => {
  const actual: Array<string> = [];
  each_block(`
  >   > start 1 2 3  < < end
  >   > start 4 5 6  < < end
  `, "> > start", "<  <  end", (block: string) => actual.push(block));
  equals("1 2 3 4 5 6", split_join(actual.join(" ")));
});

it("doesn't grab the surrounding whitespace of the inner block", () => {
  const actual: Array<string> = [];
  each_block(`>> start \n 1 2 3 \n << end`, ">> start", "<< end", (block: string) => actual.push(block));
  equals("1 2 3", actual.join(" "));
});


// # =============================================================================
describe("insert_after_line");

it("inserts content after last line found with substring", () => {
  const body = `
     import a;
     import b
     import c
     await finish();
  `;
  const expected = `
     import a;
     import b
     import c
hello();
     await finish();
  `;
  equals(insert_after_line_contains("hello();", "import", body), expected);
});

