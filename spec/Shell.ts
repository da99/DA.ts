
import { describe, it, equals } from "../src/Spec.ts";

import {
  shell_string, shell_lines,
  fd, find,
} from "../src/Shell.ts";

import {
  count
} from "../src/Function.ts";

function five_x_five(x: "a" | 0 = 0) {
  if (x === "a")
    return count(5).map(_x => "a b c d e".split(' '));
  return [
    [0,1,2,3,4],
    [5,6,7,8,9],
    [10,11,12,13,14],
    [15,16,17,18,19],
    [20,21,22,23,24],
  ];
} // function

// =============================================================================
describe("shell_string");
// =============================================================================

it("returns string", async () => {
  const actual = (await shell_string('ls', '-1'))
  equals(typeof actual, 'string');
})

// =============================================================================
describe("shell_lines");
// =============================================================================

it("returns Lines", async () => {
  const actual = (await shell_lines('ls', '-1')).constructor
  equals(actual, Array);
})

// =============================================================================
describe("fd");
// =============================================================================

it("returns a string[]", async () => {
  const actual = (await fd(`.ts$ src --max-depth 1`))
  equals(actual.constructor, Array);
})

it("turns the output into values in the row", async () => {
  const actual = (await fd(`.ts$ src --max-depth 1`)).filter(x => x === "src/Shell.ts")
  equals(actual, ["src/Shell.ts"]);
})

// =============================================================================
describe("find");
// =============================================================================

it("returns a string[]", async () => {
  const actual = (await find(`src -maxdepth 1 -name *.ts`)).constructor
  equals(actual, Array);
})

