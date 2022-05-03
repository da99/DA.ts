import {
  not,
  sum, map_length, count,
  is as fis,
  pipe_function, max,
  tail_count, split_whitespace
} from "../src/Function.ts";

export interface Loop_Info {
  count: number;
  first: boolean;
  last:  boolean;
};

// =============================================================================
// Table:
// =============================================================================

export function table(x: any[] | any[][]): Table {
  return new Table(x);
} // export function

export class Table {
  raw: any[][];

  constructor(arr: any[] | any[][]) {
    if ( fis.any(not(Array.isArray))(arr) )
      arr = arr.map(x => [x]);
    if (arr.length === 0 || fis.any(fis.length_0)(arr))
      throw new Error(`Table may not be empty: ${Deno.inspect(arr)}`);
    this.raw = arr;
  } // constructor

  get row_count() { return this.raw.length; }
  get column_count() { return max(map_length(this.raw)); }
  get cell_count() { return sum(this.raw.map(x => x.length)); }
  get area() { return this.row_count * this.column_count; }

  clone() {
    return this.raw.slice().map(x => x.slice());
  } // method

  // =============================================================================
  // Filter:
  // =============================================================================

  filter_rows(f: (x: any[]) => boolean): Table {
    return table(
      this.raw.filter(row => f(row))
    );
  } // method

  // =============================================================================
  // Remove:
  // =============================================================================

  remove_rows(f: (x: any[]) => boolean): Table {
    return this.filter_rows(x => !f(x));
  } // method

  // =============================================================================
  // Arrange:
  // =============================================================================

  arrange(...spec: Arrange_Spec): Table {
    return this.rows(row => rearrange(row, spec)) ;
  } // method

  // =============================================================================
  // Head/Middle/Tail:
  // =============================================================================

  head(i: number, t: "row" | "column") {
    if (i < 1)
      throw new Error(`Invalid quantity for head(${i}, ${t})`);

    switch (t) {
      case "row": {
        if (i < 0)
          i = this.raw.length + i;
        return table(this.raw.slice(0, i));
      } // case

      case "column": {
        const col_count = this.column_count;
        if (i < 0)
          i = col_count + i;
        return this.middle(0, this.column_count - i, "column");
      } // case
    } // switch
  } // method

  middle(start: number, end: number, t: "row" | "column") {
    if (start < 0)
      throw new Error(`Invalid start for middle(${start}, ${end}, ${t})`);
    if (end < 0)
      throw new Error(`Invalid end for middle(${start}, ${end}, ${t})`);

    switch (t) {
      case "row": {
        const row_count = this.row_count;
        return table(this.raw.slice(start, row_count - end));
      } // case

      case "column": {
        const col_count = this.column_count;
        return this.arrange(...(tail_count(col_count - start - end, col_count - end)));
      } // case
    } // switch
  } // method

  tail(i: number, t: "row" | "column"): Table {
    if (i < 1)
      throw new Error(`Invalid quantity for tail(${i}, ${t})`);

    switch (t) {
      case "row": {
        if (i < 0)
          i = this.raw.length + i;
        return table(this.raw.reverse().slice(0, i).reverse());
      } // case

      case "column": {
        const col_count = this.column_count;
        if (i < 0)
          i = col_count + i;
        if (i > col_count)
          throw new Error(`${i} columns requested, but only ${col_count} exist.`);
        return this.arrange(...(tail_count(i, col_count)));
      } // case
    } // switch
  } // method

  // =============================================================================
  // Map:
  // =============================================================================

  map(pos: Human_Position | "values", ...funcs: Array<(x: any) => any>): Table {
    if (pos === "values") {
      const f = pipe_function(...funcs);
      const fin: any[][] = [];
      for (const old_row of this.raw)
        fin.push(old_row.map(f));
      return table(fin);
    } // if

    const indexes = human_position_to_indexes(pos, this.raw);
    if (indexes.length === 0) {
      throw new Error(`No values found in Columns for: ${Deno.inspect(pos)}`);
    } // if

    const new_arr = this.clone();
    const f = pipe_function(...funcs);
    for (const [r,c] of indexes) {
      new_arr[r][c] = f(new_arr[r][c]);
    } // for

    return table(new_arr);
  } // method

  raw_column(pos: "first" | "last" | number) {
    return column_indexes(pos, this.raw)
    .map(rc => this.raw[rc[0]][rc[1]]);
  };

  column(n: number | "last", ...funcs: Array<(x: any) => any>) {
    let i = 0;
    if (n === "last")
      i = this.column_count - 1;
    else
      i = n;

    const f = pipe_function(...funcs);
    if (i < 0)
      throw new Error(`Invalid value for column index: ${Deno.inspect(i)}`);
    if (i > this.column_count - 1)
      throw new Error(`Index value exceeds max column index: ${Deno.inspect(i)} > ${this.column_count - 1}`);
    const new_raw = this.raw.map(r => {
      const new_row = r.slice();
      new_row[i] = f(r[i]);
      return new_row;
    });
    return table(new_raw);
  } // method

  rows(...funcs: Array<(x: string[]) => string[]>): Table {
    const f = pipe_function(...funcs);
    return table(
      this.raw.map(row => f(row))
    );
  } // method

  row(n: number | "last", ...funcs: Array<(x: any) => any>) {
    let i = 0;
    if (n === "last")
      i = this.row_count - 1;
    else
      i = n;

    const f = pipe_function(...funcs);
    if (i < 0)
      throw new Error(`Invalid value for row index: ${Deno.inspect(i)}`);
    if (i > this.row_count - 1)
      throw new Error(`Index value exceeds max row index: ${Deno.inspect(i)} > ${this.column_count - 1}`);
    const new_raw = this.raw.slice();
    new_raw[i] = new_raw[i].slice().map(x => f(x));
    return table(new_raw);
  } // method

  // =============================================================================
  // Push:
  // =============================================================================

  push_value(pos: "top" | "bottom" | "left" | "right", new_s: any) : Table {
    switch (pos) {
      case "top": {
        const new_raw = this.raw.slice();
        new_raw.unshift(
          count(this.column_count).map(_x => new_s)
        );
        return table(new_raw);
      } // case

      case "bottom": {
        const new_raw = this.raw.slice();
        new_raw.push(
          count(this.column_count).map(_x => new_s)
        );
        return table(new_raw);
      } // case

      case "left": {
        const new_raw = this.raw.map(row => {
          const new_row = row.slice()
          new_row.unshift(new_s);
          return new_row;
        });
        return table(new_raw);
      } // case

      case "right": {
        const new_raw = this.raw.map(row => {
          const new_row = row.slice();
          new_row.push(new_s);
          return new_row;
        });
        return table(new_raw);
      } // case
    } // switch

  } // method

  push_function(pos: "top" | "bottom" | "left" | "right", f: (count: Loop_Info) => any) {
    switch (pos) {
      case "top": {
        const new_raw = this.raw.slice();
        const col_count = this.column_count;
        new_raw.unshift( count(this.column_count).map(count => {
          return f({count, first: count === 0, last: count === (col_count - 1) });
        }) );
        return table(new_raw);
      } // case

      case "bottom": {
        const new_raw = this.raw.slice();
        const col_count = this.column_count;
        new_raw.push(
          count(col_count).map(count => {
            return f({count, first: count === 0, last: count === (col_count - 1) });
          })
        );
        return table(new_raw);
      } // case

      case "left": {
        const row_count = this.row_count;
        return table(
          this.raw.map((row, count) => {
            const new_row = row.slice();
            new_row.unshift(f({count, first: count === 0, last: count === (row_count - 1)}));
            return new_row;
          })
        );
      } // case

      case "right": {
        const row_count = this.row_count;
        return table(
          this.raw.map((row, count) => {
            const new_row = row.slice();
            new_row.push(f({count, first: count === 0, last: count === (row_count - 1)}));
            return new_row;
          })
        );
      } // case
    }
  } // method

  push_columns(pos: "top" | "bottom" | "left" | "right", cols: Table) : Table {
    switch (pos) {
      case "top": {
        if (cols.column_count != this.column_count)
          throw new Error(`Column count mis-match: ${this.column_count} != push_columns(${pos}, ${cols.column_count})`);
        return table(cols.raw.concat(this.raw));
      } // case

      case "bottom": {
        if (cols.column_count != this.column_count)
          throw new Error(`Column count mis-match: ${this.column_count} != push_columns(${pos}, ${cols.column_count})`);
        return table(this.raw.concat(cols.raw));
      } // case

      case "left": {
        if (cols.row_count != this.row_count)
          throw new Error(`Row count mis-match: ${this.row_count} != push_columns(${pos}, ${cols.row_count})`);
        let index = -1;
        const fin: string[][] = [];
        for (const row of cols.raw) {
          ++index;
          fin.push(
            row.concat(this.raw[index])
          );
        } // for
        return table(fin);
      } // case

      case "right": {
        if (cols.row_count != this.row_count)
          throw new Error(`Row count mis-match: ${this.row_count} != push_columns(${pos}, ${cols.row_count})`);
        let index = -1;
        const fin: string[][] = [];
        for (const row of this.raw) {
          ++index;
          fin.push(
            row.concat(cols.raw[index])
          );
        } // for
        return table(fin);
      } // case
    } // switch
  } // method
} // export class
