
import { describe, it, equals } from "../src/Spec.ts";

import {
  sh,
  fd, find,
} from "../src/Shell.ts";

import {
  count, split_lines,
} from "../src/da.ts";

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
describe("sh.stdout");
// =============================================================================

it("returns string", async () => {
  const actual = (await sh(['ls', '-1'])).stdout
  equals(typeof actual, 'string');
})

// =============================================================================
describe("fd");
// =============================================================================

it("returns the stdout", async () => {
  const actual = (await fd(`.ts$ src --max-depth 1`)).stdout.split('\n').filter(x => x === "src/Shell.ts")
  equals(actual, ["src/Shell.ts"]);
});

it("returns 'lines' as string[]", async () => {
  const actual = (await fd(`.ts$ src --max-depth 1`));
  equals(actual.lines.constructor, Array);
})

// =============================================================================
describe("find");
// =============================================================================

it("returns 'lines' as string[]", async () => {
  const actual = (await find(`src -maxdepth 1 -name *.ts`))
  equals(actual.lines.constructor, Array);
})

