
export type Human_Position =
  "top row" | "bottom row" | "middle rows" |
  "first column" | "last column" | "middle columns" |
  "first cell" | "last cell" | "top last cell" | "bottom first cell" |
  "top row middle" | "bottom row middle"  |
  "left column middle" | "right column middle" |
  "borderless";

export function human_position_to_indexes(pos: Human_Position, arr: any[][]): number[][] {
  if (arr.length === 0)
    return [];

  switch (pos) {

    case "top row": {
      return arr[0].map((_x: any, i: number) => [0, i]);
    } // case

    case "bottom row": {
      if (arr.length < 2)
        return [];
      const last_row_index = arr.length - 1;
      const row = arr[last_row_index];
      return row.map((_x: any, i: number) => [last_row_index, i]);
    } // case

    case "middle rows": {
      if (arr.length < 3)
        return [];
      const slice = arr.slice(1, arr.length - 1);
      return slice.map((row, row_i) => {
        return row.map((_x, col_i) => [row_i + 1, col_i])
      }).flat();
    } // case

    case "first column": {
      return arr.map((_row, i) => [i, 0]);
    } // case

    case "last column": {
      return arr.map((row, i) => [i, row.length - 1]);
    } // case

    case "middle columns": {
      if (arr[0].length < 3)
        return [];
      const end_x = arr[0].length - 1;
      return arr.map((row, y) => {
        return row.slice(1, end_x).map((_x, col_i)=>[y, col_i+1])
      }).flat();
    } // case

    case "first cell": {
      if (arr[0].length === 0)
        return [];
      return [[0,0]];
    } // case

    case "last cell": {
      const last_row = arr[arr.length - 1];
      if (last_row.length === 0)
        return [];
      const last_cell_index = last_row.length - 1;
      return [[arr.length - 1, last_cell_index]];
    } // case

    case "top last cell": {
      const top_row = arr[0];
      if (top_row.length === 0)
        return [];
      return [[0, top_row.length - 1]]
    } // case

    case "bottom first cell": {
      const bottom_row = arr[arr.length - 1];
      if (bottom_row.length === 0)
        return [];
      return [[arr.length - 1, 0]]
    } // case

    case "top row middle": {
      const row = arr[0];
      if (row.length < 3)
        return [];
      const new_row = row.slice(1,row.length - 1);
      return new_row.map((_x, i) => [0, i+1]);
    } // case

    case "bottom row middle": {
      const row_index = arr.length - 1;
      const row = arr[row_index];
      if (row.length < 3)
        return [];
      const new_row = row.slice(1,row.length - 1);
      return new_row.map((_x, i) => [row_index, i+1]);
    } // case

    case "left column middle": {
      const fin: number[][] = [];
      let i = -1;
      const last_index = arr.length - 1;
      for (const _row of arr) {
        ++i;
        if (i === 0 || i === last_index )
          continue;
        fin.push([i, 0]);
      } // for
      return fin;
    } // case

    case "right column middle": {
      const fin: number[][] = [];
      let i = -1;
      const last_index = arr.length - 1;
      for (const row of arr) {
        ++i;
        if (i === 0 || i === last_index )
          continue;
        fin.push([i, row.length - 1]);
      } // for
      return fin;
    } // case

    case "borderless": {
      let fin: number[][] = [];
      let i = -1;
      const last_row_index = arr.length - 1;
      for (const row of arr) {
        ++i;
        if (i === 0 || i >= last_row_index)
          continue;
        const slice = row.slice(1, row.length - 1);
        if (slice.length === 0)
          return [];
        slice.forEach((_x, col_i) => fin.push([i, col_i + 1]));
      } // for
      return fin;
    } // case

  } // switch
} // export function

export function column_indexes(pos: number | "first" | "last", arr: any[][]): number[][] {
  let n = 0;
  if (arr.length === 0)
    return [];

  if (typeof pos === "number")
    n = pos;

  if (pos === "last")
    n = arr[0].length - 1;

  if (n < 0)
    throw new Error(`Invalid column index: column_indexes(${n}, arr)`);

  const fin: number[][] = [];
  let row_i = -1;
  for (const row of arr) {
    ++row_i;
    if (n < row.length)
      fin.push([row_i, n])
  } // for
  if (fin.length === 0)
    throw new Error(`Column index out of range: column_indexes(${n}, column_counts === ${Deno.inspect(arr.map(x=>x.length))})`);
  return fin;
} // export function

export function row_indexes(n: number, arr: any[][]): number[][] {
  if (arr.length === 0)
    return [];
  if (n < 0)
    throw new Error(`Invalid row index: row_indexes(${n}, arr)`);
  const fin: number[][] = [];
  if (n >= arr.length)
    throw new Error(`Row index out of range: row_indexes(${n}, arr.length === ${arr.length})`);
  let col_i = -1;
  for (const _col of arr[n]) {
    ++col_i;
    fin.push([n, col_i])
  } // for
  return fin;
} // export function
