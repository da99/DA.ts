
import {finish} from "../src/Spec.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {exists, ensureDir} from "https://deno.land/std/fs/mod.ts";
import {ensure_dir} from "../src/Shell.ts";

const this_file      = (new URL(import.meta.url)).pathname;
const this_file_name = (path.relative(path.dirname(this_file), this_file));
const dir            = path.basename(path.dirname(this_file));

ensure_dir("tmp/spec");

const cmd = Deno.args[0] || "full";

import "./CLI.ts";
import "./Array.ts";
import "./Function.ts";
import "./Process.ts";
import "./Spec.ts";
import "./String.ts";
import "./Text_File.ts";
import "./File_Manifest.ts";
import "./Shell.ts";
import "./Shell.dsl.ts";

if (cmd === "full") {  }

switch (cmd) {
  case "full": {
    await finish();
    break;
  }
  case "quick": {
    await finish();
    break;
  }
  default: {
    await finish(cmd);
  }
} // switch
