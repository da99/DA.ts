
export interface Slice_Spec {
  begin: number,
  end:   number,
  type:  "head" | "tail" | "slice";
} // export interface

export type Arrange_Spec = Array<number | Slice_Spec>;

export function unique_text(arr: string[], keep_whitespace: boolean = true) : string[] {
  const o = {} as Record<string, boolean>;
  const new_lines = [] as string[];
  for(const l of arr) {
    const trim = l.trim();
    if (trim.length === 0) {
      if (keep_whitespace)
        new_lines.push(l);
      continue;
    }
    const unique = trim.replaceAll(/\s+/g, "");
    if (unique in o)
      continue;
    o[unique] = true;
    new_lines.push(l);
  }
  return new_lines;
} // export function

export function range(n: number, end: number): Slice_Spec {
  if (n < 0 || end <= end)
    throw new Error(`Invalid number for slice(${Deno.inspect(n)}, ${Deno.inspect(end)})`);
  return({
    begin: n,
    end: end - n,
    type: "slice"
  });
} // export function

export function slice(n: number, quantity: number): Slice_Spec {
  if (n < 0 || quantity < 0)
    throw new Error(`Invalid number for slice(${Deno.inspect(n)}, ${Deno.inspect(quantity)})`);
  return({
    begin: n,
    end: quantity,
    type: "slice"
  });
} // export function

export function head(n: number): Slice_Spec {
  if (n < 1)
    throw new Error(`Invalid value for head(${Deno.inspect(n)})`);
  return({ begin: 0, end: n, type: "head" });
} // export function

export function tail(n: number): Slice_Spec {
  if (n < 1)
    throw new Error(`Invalid value for tail(${Deno.inspect(n)})`);
  return({ begin: 0, end: n, type: "tail" });
} // export function


/*
   rearrange(
     [
       0, 1, 2, 3, 4, 5, 6
     ],
     2, 0, head(3), tail(3)
   )
*/
export function rearrange<T>(arr: T[], spec: Arrange_Spec): T[] {
  let new_arr: T[] = [];
  for (const i of spec) {
    if (typeof i === "number") {
      const v = arr[i];
      if (typeof v !== "undefined")
        new_arr.push(v);
      continue;
    }
    switch (i.type) {
      case "head": {
        new_arr = new_arr.concat(arr.slice(i.begin, i.end));
        break;
      }
      case "tail": {
        new_arr = new_arr.concat(arr.slice(arr.length - i.end))
        break;
      }
      case "slice": {
        new_arr = new_arr.concat(arr.slice(i.begin, i.end))
        break;
      }
      default: {
        throw new Error(`Not implemented: ${i.type} for arrange_columns`)
      }
    }
  } // for

  return new_arr;
} // export function
