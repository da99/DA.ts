#!/usr/bin/env -S deno run --allow-run=deno

// import { sleep } from "https://deno.land/x/sleep/mod.ts";
import {meta_url, about, match, values, not_found} from "{DA_PATH}/src/CLI.ts";
import {run} from "{DA_PATH}/src/Process.ts";
import { yellow, bold, bgRed, white } from "https://deno.land/std/fmt/colors.ts";
import * as path from "https://deno.land/std/path/mod.ts";

meta_url(import.meta.url);

if (match("hello")) {
  await run(`deno run something`);
} // if


not_found();
