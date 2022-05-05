#!/usr/bin/env -S deno run --allow-run=deno

// import { sleep } from "https://deno.land/x/sleep/mod.ts";
import {
  sh, meta_url, about, match, values, not_found,
  yellow, bold, bgRed, white
} from "{DA_PATH}/src/Shell.ts";

import {path} from "{DA_PATH}/src/da.ts";

meta_url(import.meta.url);

if (match("hello")) {
  await sh(`deno run something`);
} // if


not_found();
