import { describe, it, equals, matches } from "../src/Spec.ts";
import {
  shell_string, shell_lines,
  lines, table,
  Lines, Table,
  fd, find,
  human_position_to_indexes, column_indexes, row_indexes
} from "../src/Shell.ts";

import {
  UP_CASE,
  pipe_function,
  count, tail_count
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
  equals(actual, Lines);
})

// =============================================================================
describe("fd");
// =============================================================================

it("returns a row", async () => {
  const actual = (await fd(`.ts$ src --max-depth 1`))
  equals(actual.constructor, Lines);
})

it("turns the output into values in the row", async () => {
  const actual = (await fd(`.ts$ src --max-depth 1`)).filter(x => x === "src/Shell.ts").raw
  equals(actual, ["src/Shell.ts"]);
})

// =============================================================================
describe("find");
// =============================================================================

it("returns Lines", async () => {
  const actual = (await find(`src -maxdepth 1 -name *.ts`)).constructor
  equals(actual, Lines);
})

// =============================================================================
describe("Lines#filter");
// =============================================================================

it("removes values if callback returns true", function () {
  const actual = lines("a b c".split(' ')).filter(s => s !== 'a');
  const expect = ["b", "c"];

  equals(actual.raw, expect);
});

// =============================================================================
describe("Lines#remove");
// =============================================================================

it("removes values if condition is true", function () {
  const actual = lines("a b c".split(' ')).remove(s => s === "b");
  equals(actual.raw, ["a", "c"]);
});

it("keeps values if condition is false", function () {
  const actual = lines("d e f".split(' ')).remove(s => s === "z");
  equals(actual.raw, ['d', 'e', 'f']);
});

// =============================================================================
describe("Lines#promise_all");
// =============================================================================

it("returns a Promise", async function () {
  const actual = lines("1\n2\n3")
  .promise_all(pipe_function(parseInt, (x: number) => Promise.resolve(x)))
  ;
  const expect = [1, 2, 3];

  equals((await actual), expect);
});


it("returns a Promise.all", async function () {
  const actual = lines("4\n5\n6").promise_all((x: string) => Promise.resolve(parseInt(x)));
  const expect = [4, 5, 6];

  equals((await actual), expect);
});

// =============================================================================
describe("Lines#split");
// =============================================================================

it("returns Columns", () => {
  const x = "a-1 b-2 c-3 d-4".split(' ');
  const actual = lines(x).split('-');
  equals(actual.constructor, Table)
});

it("splits each value into another array", function () {
  const x = "a-1 b-2 c-3 d-4".split(' ');
  const actual = lines(x).split('-');
  const expect = [["a", "1"], ["b", "2"], ["c", "3"], ["d", "4"]];

  equals(actual.raw, expect);
});


// =============================================================================
// Columns:
// =============================================================================

// =============================================================================
describe("columns(...)");
// =============================================================================

it(`allows an Array of non-Arrays: any[]`, function () {
  const cols = table([0,1,2]);
  equals(cols.raw.length, 3);
});


// =============================================================================
describe("Columns#filter_rows");
// =============================================================================

it("keeps rows when callback returns true", function () {
  const x = table( [ [1, 2, 3], ["a", "b", "c"], [4,5,6] ]);

  const actual = x.filter_rows(x=> typeof x[0] !== 'string');

  equals(actual.raw, [ [1,2,3], [4,5,6] ]);
});


// =============================================================================
describe("Columns#remove_rows");
// =============================================================================

it("removes rows if callback returns true", function () {
  const x = table([
    [1, 2, null],
    [3,4,5],
    [5,6,7]
  ]);

  const actual = x.remove_rows(row => row.includes(null));

  equals(actual.raw, [ [3,4,5], [5,6,7] ]);
});

// =============================================================================
describe("Columns#row");
// =============================================================================

it("operates on the values of the specified row", function () {
  const x = table([[1, 2, 3], [4,5,6], [7,8,9]]);
  const actual = x.row(2, x => x + 10);
  equals(actual.raw, [ [1, 2, 3], [4,5,6], [17,18,19] ]);
});

it("operates on the values of the 'last' row", function () {
  const x = table([[1, 2, 3], [4,5,6], [7,8,9]]);
  const actual = x.row('last', x => x * 10);
  equals(actual.raw, [ [1, 2, 3], [4,5,6], [70,80,90] ]);
});

it("throws an Error if value is less than 0", function () {
  const x = table([[1, 2, 3], [4,5,6], [7,8,9]]);
  let actual = {message: ""};
  try {
    x.row(-1, x => x + 10);
  } catch (e) {
    actual = e;
  }
  matches(actual.message, /Invalid value for row index/, actual.message);
});

it("throws an Error if value is greater than row count.", function () {
  const x = table([[1, 2, 3], [4,5,6], [7,8,9]]);
  let actual = {message: ""};
  try {
    x.row(10, x => x + 10);
  } catch (e) {
    actual = e;
  }
  matches(actual.message, /exceeds max row index/, actual.message);
});

// =============================================================================
describe("Columns#column");
// =============================================================================

it("operates on the values of the specified column", function () {
  const x = table([[1, 2, 3], [4,5,6], [7,8,9]]);
  const actual = x.column(2, x => x + 10);
  equals(actual.raw, [ [1, 2, 13], [4,5,16], [7,8,19] ]);
});

it("operates on the values of the 'last' column", function () {
  const x = table([[1, 2, 3], [4,5,6], [7,8,9]]);
  const actual = x.column('last', x => x * 10);
  equals(actual.raw, [ [1, 2, 30], [4,5,60], [7,8,90] ]);
});

it("throws an Error if value is less than 0", function () {
  const x = table([[1, 2, 3], [4,5,6], [7,8,9]]);
  let actual = {message: ""};
  try {
    x.column(-1, x => x + 10);
  } catch (e) {
    actual = e;
  }
  matches(actual.message, /Invalid value for column index/, actual.message);
});

// =============================================================================
describe("Columns#map");
// =============================================================================

it("alters the first value of the first row: map('first cell', ...)", function () {
  const c2 = table([["a", 2, 3], ["b",5,6], ["c",8,9]]).map("first cell", UP_CASE);
  equals(c2.raw[0][0], "A");
});

it("alters the last value of the last row: map('last cell', ...)", function () {
  const c2 = table([["a", 2, 3], ["b",5,6], ["c",8,"last"]]).map("last cell", UP_CASE);
  equals(c2.raw[2][2], "LAST");
});

it("alters the first value of the last row: map('bottom first cell', ...)", function () {
  const c2 = table([
    ["d", 2, "c"],
    ["e",5,6],
    ["f",8,9]
  ]).map("bottom first cell", UP_CASE);
  equals(c2.raw[2][0], "F");
});


// =============================================================================
describe("Columns#push_value");
// =============================================================================

it("can insert the same value as a top row.", function () {
  const c2 = table([[1, 2, 3], [4,5,6], [7,8,9]]).push_value("top", "a");
  equals(c2.raw, ["a a a".split(' '), [1, 2, 3], [4,5,6], [7,8,9]]);
});

it("can insert the same value as a bottom row.", function () {
  const c2 = table([[1, 2, 3], [4,5,6], [7,8,9]]).push_value("bottom", "a");
  equals(c2.raw, [[1, 2, 3], [4,5,6], [7,8,9], "a a a".split(' ') ]);
});

it("can insert the same value as a column to the right.", function () {
  const c2 = table([[1, 2, 3], [4,5,6], [7,8,9]]).push_value("right", "a");
  equals(c2.raw, [[1, 2, 3, "a"], [4,5,6, "a"], [7,8,9, "a"] ]);
});

it("can insert the same value as a column to the left.", function () {
  const c2 = table([[1, 2, 3], [4,5,6], [7,8,9]]).push_value("left", 0);
  equals(c2.raw, [[0, 1, 2, 3], [0, 4,5,6], [0, 7,8,9] ]);
});

// =============================================================================
describe("Columns#push_function");
// =============================================================================

it("can insert the returned value as a top row.", function () {
  const c2 = table([[1, 2, 3], [4,5,6], [7,8,9]])
  .push_function("top", (info) => `${info.count} ${info.first} ${info.last}`);
  equals(c2.raw, [["0 true false", "1 false false", "2 false true"], [1, 2, 3], [4,5,6], [7,8,9]]);
});

it("can insert the same returned value as a bottom row.", function () {
  let vals = "a b c".split(' ');
  const c2 = table([[1, 2, 3], [4,5,6], [7,8,9]]).push_function("bottom", () => vals.pop());
  equals(c2.raw, [[1, 2, 3], [4,5,6], [7,8,9], "c b a".split(' ') ]);
});

it("can insert the same returned value as a column to the right.", function () {
  const c2 = table([[1, 2, 3], [4,5,6], [7,8,9]]).push_function("right", () => 0);
  equals(c2.raw, [[1, 2, 3, 0], [4,5,6, 0], [7,8,9, 0] ]);
});

it("can insert the same returned value as a column to the left.", function () {
  const c2 = table([[1, 2, 3], [4,5,6], [7,8,9]]).push_function("left", () => "start");
  equals(c2.raw, [["start", 1, 2, 3], ["start", 4,5,6], ["start", 7,8,9] ]);
});

// =============================================================================
describe("Columns#push_column");
// =============================================================================

it("can insert columns: top.", function () {
  const c1 = table([[1, 2, 3], [4,5,6]]);
  const c2 = table([[7,8,9]]);
  const c3 = c2.push_columns("top", c1);
  equals(c3.raw, [
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ]);
});

it("can insert columns: bottom.", function () {
  const c1 = table([[1, 2, 3], [4,5,6]]);
  const c2 = table([[7,8,9]]);
  const c3 = c2.push_columns("bottom", c1);
  equals(c3.raw, [
    [7,8,9],
    [1,2,3],
    [4,5,6],
  ]);
});

it("can insert columns: right.", function () {
  const c1 = table([
    [1,2,3],
    [4,5,6]
  ]);
  const c2 = table([
    [7,8,9],
    [10,11,12]
  ]);
  const c3 = c2.push_columns("right", c1);
  equals(c3.raw, [
    [7,8,9, 1,2,3],
    [10,11,12, 4,5,6]
  ]);
});

it("can insert columns: left.", function () {
  const c1 = table([
    [1,2,3],
    [4,5,6]
  ]);
  const c2 = table([
    [7,8,9],
    [10,11,12]
  ]);
  const c3 = c2.push_columns("left", c1);
  equals(c3.raw, [
    [1,2,3, 7,8,9],
    [4,5,6, 10,11,12]
  ]);
});

it("throws an error if the row counts are unequal.", function () {
  const c1 = table([ [1,2,3], [4,5,6] ]);
  const c2 = table([ [7,8,9] ]);
  let msg = "no error thrown";
  try {
    c1.push_columns("left", c2);
  } catch (e) {
    msg = e.message;
  }
  matches(msg, /row count mis-match/i, msg);
});


// =============================================================================
describe("Columns#head")
// =============================================================================

it("returns the number of specified columns from the left side", function () {
  const c1 = table([
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ]);
  const c2 = c1.head(1, "column");
  equals(c2.raw, [[1],[4],[7]]);
});

it("returns the number of specified rows from the top side", function () {
  const c1 = table([
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ]);
  const c2 = c1.head(2, "row");
  equals(c2.raw, [
    [1,2,3],
    [4,5,6]
  ]);
});

// it("returns all but the last negative n columns: head(-1, 'column')", function () {
//   const c1 = columns([
//     [1,2,3],
//     [4,5,6],
//     [7,8,9]
//   ]);
//   const c2 = c1.head(-1, "column");
//   equals(c2.raw, [
//     [1,2],
//     [4,5],
//     [7,8]
//   ]);
// });

// it("returns all but the last negative n rows: head(-1, 'row')", function () {
//   const c1 = columns([
//     [1,2,3],
//     [4,5,6],
//     [7,8,9],
//     ["a", "b", "c"]
//   ]);
//   const c2 = c1.head(-2, "row");
//   equals(c2.raw, [
//     [1,2,3],
//     [4,5,6],
//   ]);
// });

// =============================================================================
describe("Columns#tail")
// =============================================================================

it("returns the number of specified columns from the right side", function () {
  const c1 = table([
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ]);
  const c2 = c1.tail(1, "column");
  equals(c2.raw, [[3],[6],[9]]);
});

it("returns the number of specified rows from the bottom side", function () {
  const c1 = table([
    [1,2,3],
    [4,5,6],
    [7,8,9]
  ]);
  const c2 = c1.tail(2, "row");
  equals(c2.raw, [
    [4,5,6],
    [7,8,9]
  ]);
});

// it("returns all but the last negative n columns: tail(-1, 'column')", function () {
//   const c1 = columns([
//     [1,2,3,4],
//     [4,5,6,7],
//     [7,8,9,10]
//   ]);
//   const c2 = c1.tail(-2, "column");
//   equals(c2.raw, [
//     [3,4],
//     [6,7],
//     [9,10]
//   ]);
// });

// it("returns all but the last negative n rows: tail(-1, 'row')", function () {
//   const c1 = columns([
//     [1,2,3],
//     [4,5,6],
//     [7,8,9],
//     ["a", "b", "c"]
//   ]);
//   const c2 = c1.tail(-2, "row");
//   equals(c2.raw, [
//     [7,8,9],
//     ["a", "b", "c"]
//   ]);
// });

// =============================================================================
describe("Columns#middle")
// =============================================================================

it('returns a row without the specified quantity from the top: middle(2,0, "row")', function () {
  const c1 = table([
    [1,2,3],
    [4,5,6],
    [7,8,9],
    ["a", "b", "c"]
  ]);
  const c2 = c1.middle(2,0, "row");
  equals(c2.raw, [
    [7,8,9],
    ["a", "b", "c"]
  ]);
});

it('returns a row without the specified quantity from the bottom: middle(2,2, "row")', function () {
  const c1 = table([
    [1,2,3],
    [4,5,6],
    [7,8,9],
    [10,11,12],
    [13,14,15],
  ]);
  const c2 = c1.middle(2,2, "row");
  equals(c2.raw, [
    [7,8,9],
  ]);
});

it('returns Columns without the specified quantity from the left: middle(2,0, "column")', function () {
  const c1 = table([
    [1,2,3],
    [4,5,6],
    [7,8,9],
    ["a", "b", "c"]
  ]);
  const c2 = c1.middle(2,0, "column");
  equals(c2.raw, [
    [3],
    [6],
    [9],
    ["c"]
  ]);
});

it('returns a row without the specified quantity from the right: middle(0,2, "column")', function () {
  const c1 = table([
    [1,2,3],
    [4,5,6],
    [7,8,9],
    [10,11,12],
    [13,14,15],
  ]);
  const c2 = c1.middle(0,2, "column");
  equals(c2.raw, [
    [1],
    [4],
    [7],
    [10],
    [13],
  ]);
});

// =============================================================================
describe("Columns#raw_column")
// =============================================================================

it('returns an Array with the values of the specified column', function () {
  const arr = table(five_x_five("a"));
  equals(
    arr.raw_column(1),
    count(5).map(x => 'b')
  )
});

it('returns an Array with the values of: raw_column("first")', function () {
  const arr = table(five_x_five("a"));
  equals(
    arr.raw_column('first'),
    count(5).map(x => 'a')
  )
});

it('returns an Array with the values of: raw_column("last")', function () {
  const arr = table(five_x_five("a"));
  equals(
    arr.raw_column('last'),
    count(5).map(x => 'e')
  )
})
// =============================================================================
describe(`human_position_to_indexes(any[][], string)`);
// =============================================================================

function new_arr(row: number, column: number) {
  return count(row).map((r: number, i: number) => tail_count(column, column * (1+i)));
}

it(`returns the indexes for: top row`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [0,0], [0,1], [0,2],[0,3], [0,4]
  ];
  equals(human_position_to_indexes("top row", arr), expect);
});

it(`returns the indexes for: bottom row`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [4,0], [4,1], [4,2],[4,3], [4,4]
  ];
  equals(human_position_to_indexes("bottom row", arr), expect);
});

it(`returns the indexes for: middle rows`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [1,0], [1,1], [1,2],[1,3], [1,4],
    [2,0], [2,1], [2,2],[2,3], [2,4],
    [3,0], [3,1], [3,2],[3,3], [3,4],
  ];
  equals(
    Deno.inspect(human_position_to_indexes("middle rows", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the indexes for: first column`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [0,0],
    [1,0],
    [2,0],
    [3,0],
    [4,0],
  ];
  equals(
    Deno.inspect(human_position_to_indexes("first column", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the indexes for: last column`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [0,4],
    [1,4],
    [2,4],
    [3,4],
    [4,4],
  ];
  equals(
    Deno.inspect(human_position_to_indexes("last column", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the indexes for: middle columns`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [0,1], [0,2],[0,3],
    [1,1], [1,2],[1,3],
    [2,1], [2,2],[2,3],
    [3,1], [3,2],[3,3],
    [4,1], [4,2],[4,3],
  ];
  equals(
    Deno.inspect(human_position_to_indexes("middle columns", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the index for: first cell`, function () {
  const arr = five_x_five();
  const expect: number[][] = [ [0,0] ];
  equals(
    Deno.inspect(human_position_to_indexes("first cell", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the index for: last cell`, function () {
  const arr = five_x_five();
  const expect: number[][] = [ [4,4] ];
  equals(
    Deno.inspect(human_position_to_indexes("last cell", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the index for: top last cell`, function () {
  const arr = five_x_five();
  const expect: number[][] = [ [0,4] ];
  equals(
    Deno.inspect(human_position_to_indexes("top last cell", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the index for: bottom first cell`, function () {
  const arr = five_x_five();
  const expect: number[][] = [ [4,0] ];
  equals(
    Deno.inspect(human_position_to_indexes("bottom first cell", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the indexes for: top row middle`, function () {
  const arr = five_x_five();
  const expect: number[][] = [ [0,1], [0,2], [0,3] ];
  equals(
    Deno.inspect(human_position_to_indexes("top row middle", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the indexes for: bottom row middle`, function () {
  const arr = five_x_five();
  const expect: number[][] = [ [4,1], [4,2], [4,3] ];
  equals(
    Deno.inspect(human_position_to_indexes("bottom row middle", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the indexes for: left column middle`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [1,0],
    [2,0],
    [3,0]
  ];
  equals(
    Deno.inspect(human_position_to_indexes("left column middle", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the indexes for: right column middle`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [1,4],
    [2,4],
    [3,4]
  ];
  equals(
    Deno.inspect(human_position_to_indexes("right column middle", arr)),
    Deno.inspect(expect)
  );
});

it(`returns the indexes for: borderless`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [1,1], [1,2], [1,3],
    [2,1], [2,2], [2,3],
    [3,1], [3,2], [3,3],
  ];
  equals(
    Deno.inspect(human_position_to_indexes("borderless", arr)),
    Deno.inspect(expect)
  );
});

// =============================================================================
describe(`column_indexes`);
// =============================================================================

it(`returns the indexes for: column_indexes(1, arr)`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [0,1],
    [1,1],
    [2,1],
    [3,1],
    [4,1]
  ];
  equals(
    Deno.inspect(column_indexes(1, arr)),
    Deno.inspect(expect)
  );
});

it(`returns the indexes for: column_indexes('first', arr)`, function () {
  const arr = five_x_five();
  equals(
    column_indexes("first", arr),
    column_indexes(0, arr),
  );
});

it(`returns the indexes for: column_indexes('last', arr)`, function () {
  const arr = five_x_five();
  equals(
    column_indexes("last", arr),
    column_indexes(4,arr)
  );
});

it(`throws an Error if column index is higher than last column index: column_indexes(col_count, arr)`, function () {
  const arr = five_x_five();
  let msg = "no error thrown";
  try { column_indexes(5, arr) } catch (e) { msg = e.message; }
  matches(msg, /Column index out of range/, msg);
});

// =============================================================================
describe(`row_indexes`);
// =============================================================================

it(`returns the indexes for: row_indexes(1, arr)`, function () {
  const arr = five_x_five();
  const expect: number[][] = [
    [1,0], [1,1], [1,2], [1,3], [1,4]
  ];
  equals(
    Deno.inspect(row_indexes(1, arr)),
    Deno.inspect(expect)
  );
});

it(`throws an Error if row index is higher than last row index: row_indexes(row_count, arr)`, function () {
  const arr = five_x_five();
  let msg = "no error thrown";
  try { row_indexes(5, arr) } catch (e) { msg = e.message; }
  matches(msg, /Row index out of range/, msg);
});
