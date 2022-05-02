
import {finish} from "../src/Spec.ts";
import {create_dir} from "../src/Shell.ts";

// const this_file      = (new URL(import.meta.url)).pathname;
// const this_file_name = (path.relative(path.dirname(this_file), this_file));
// const dir            = path.basename(path.dirname(this_file));

create_dir("tmp/spec/");

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
import "./Shell.helpers.ts";
import "./Build_WWW.ts";

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
