import { describe, it, equals, matches } from "../src/Spec.ts";
import {
  zip,
  not, or, and,
  is,
  head_indexes, tail_indexes,
  count, tail_count, count_start_end
} from "../src/da.ts";

// =============================================================================
describe("count");
// =============================================================================

it("returns an array with sequential numbers", () => {
  const actual = count(5);
  equals(actual, [0,1,2,3,4]);
});

it("throws an Error if number is less than 1", () => {
  let msg = "no error thrown";
  try {
    count(0);
  } catch (e) {
    msg = e.message;
  }
  matches(msg, /invalid number/i, msg);
});

// =============================================================================
describe("count_start_end");
// =============================================================================

it("returns an Array from start and including end: count_start_end(5, 10)", function () {
  const actual = count_start_end(5, 10);
  equals(actual, [5,6,7,8,9,10]);
})

it("returns an Array counting down if end is higher than start: count_start_end(10, 1)", function () {
  const actual = count_start_end(10, 1);
  equals(actual, [1,2,3,4,5,6,7,8,9,10].reverse());
})

it("returns an Array counting down if start is positive, end is negative: count_start_end(1, -1)", function () {
  const actual = count_start_end(1,-1);
  equals(actual, [1,0,-1]);
})

// =============================================================================
describe("join");
// =============================================================================

it("combines arrays into columns", () => {
  const actual = zip(
    [1,2,3], ["a", "b", "c"], ["n","b","c"]
  );
  equals(actual, [[1, "a", "n"],[2, "b", "b"],[3, "c", "c"]]);
});

it("throws an error if arrays have unequal lengths", () => {
  let msg = ""
  try {
    zip( [1,2], "a b c".split(' '), [false]);
  } catch (e) {
    msg = e.message;
  }
  equals(msg.match(/Different lengths/i), ["Different lengths"], msg);
});

it("throws an error if arrays are empty", () => {
  let msg = "no error thrown"
  try {
    zip( [], [], []);
  } catch (e) {
    msg = e.message;
  }
  equals(msg.match(/empty/i), ["Empty"], msg);
});

// =============================================================================
describe("is.number");
// =============================================================================

it("returns true if value type is: number", () => {
  equals(is.number(5), true);
});

it("returns false if value type is: string", () => {
  equals(is.number("5"), false);
});

// =============================================================================
describe("is.string");
// =============================================================================

it("returns true if value type is: string", () => {
  equals(is.string("6"), true);
});

it("returns false if value type is: number", () => {
  equals(is.string(6), false);
});

// =============================================================================
describe("not");
// =============================================================================

it("returns true if origin function returns false", () => {
  const f = not(is.number)
  equals(f("5"), true)
});

it("returns false if one of the functions returns true", () => {
  const f = not(is.number, is.string, is.null)
  equals(f(null), false)
});

it("returns true if all of the functions returns false", () => {
  const f = not(is.number, is.string, is.null)
  equals(f(undefined), true)
});


// =============================================================================
describe("and");
// =============================================================================

it("returns true if origin function returns true", () => {
  const f = and(is.number)
  equals(f(5), true)
});

it("returns true if all of the functions returns true", () => {
  const f = and(is.true, is.boolean, not(is.null))
  equals(f(true), true)
});

it("returns false if one of the functions returns false", () => {
  const f = and(is.true, is.boolean, is.false)
  equals(f(true), false)
});

// =============================================================================
describe("or");
// =============================================================================

it("returns true if origin function returns true", () => {
  const f = or(is.number)
  equals(f(5), true)
});

it("returns true if one of the functions returns true", () => {
  const f = or(is.number, is.string, is.null)
  equals(f(null), true)
});

it("returns false if all of the functions returns false", () => {
  const f = or(is.number, is.string, is.null)
  equals(f(undefined), false)
});

// =============================================================================
describe("tail_indexes");
// =============================================================================

it("returns an array of the ending indexes", function () {
  const actual = tail_indexes("a b c d e f".split(' '), 3);
  equals(actual, [3,4,5]);
});

// =============================================================================
describe("head_indexes");
// =============================================================================

it("returns an array of the beginning indexes", function () {
  const actual = head_indexes("a b c d e f".split(' '), 3);
  equals(actual, [0,1,2]);
});

// =============================================================================
describe("is.all_equal");
// =============================================================================

it("returns true if all the values are equals", function () {
  const actual = is.all_equal("a a a a".split(' '));
  equals(actual, true);
});

it("returns true if only one value", function () {
  const actual = is.all_equal(["a"]);
  equals(actual, true);
});

it("returns false if one of the values is different", function () {
  const actual = is.all_equal("a a b a".split(' '));
  equals(actual, false);
});

it("throws an error if array is empty", function () {
  let msg = "no error thrown";
  try {
    is.all_equal([]);
  } catch (e) {
    msg = e.message;
  }
  equals(msg.match(/empty array/i), ["Empty array"], msg);
});


// =============================================================================
describe("tail_count");
// =============================================================================

it('returns the numbers leading up to :end_count', function () {
  const actual = tail_count(5, 10);
  equals(actual, [5,6,7,8,9]);
});
