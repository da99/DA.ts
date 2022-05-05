

import {
  split_whitespace
} from "./da.ts";

export function each_block(body: string, raw_begin: string, raw_end: string, f?: (x: string) => void) {
  const begin = split_whitespace(raw_begin);
  const end = split_whitespace(raw_end);
  const join = "\\s+";
  const reg = new RegExp(`${begin.join(join)}\\s+(.+?)\\s+${end.join(join)}`, "gms");
  const results = body.matchAll(reg);
  const match_pairs = [...results];

  const matches: string[] = [];
  for (const [__block, inner] of match_pairs) {
    matches.push(inner);
    f && f(inner);
  }

  return matches;
} // function

export function insert_after_line_contains(new_s: string, needle: string, haystack: string) {
  const lines = haystack.split('\n').reverse();
  const new_lines: string[] = [];
  let found = false;
  for (const l of lines) {
    if (!found && l.includes(needle)) {
      new_lines.push(new_s);
      found = true;
    }
    new_lines.push(l);
  } // for
  return new_lines.reverse().join('\n');
} // export




