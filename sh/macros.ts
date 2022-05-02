#!/usr/bin/env -S deno run --allow-write="src/FaunaDB.ts,src/Node-FaunaDB.mjs" --allow-read="src/FaunaDB.ts,src/Node-FaunaDB.mjs"

import { read, write } from "../src/Shell.ts";
import { each_block } from "../src/String.ts";

const COMMANDS = {
 Add: null,
  Call: null, Ceil: null, Collection: null,
  Collections: null,
  Concat: null, ContainsField: null, ContainsPath: null, ContainsStr: null,
  ContainsStrRegex: null, ContainsValue: null,
  Count: null, Create: null, CreateCollection: null,
  CreateFunction: null, CreateIndex: null, CreateRole: null,
  CurrentIdentity: null, Delete: null, Difference: null, Distinct: null, Divide: null,
  Do: null, Documents: null, Drop: null, EndsWith: null, Epoch: null,
  Functions: null,
  Function: "Fn",
  Database: null,
  Get: null, GT: null, GTE: null,
  Identify: null, If: null, Index: null, Indexes: null, Insert: null, Intersection: null,
  IsArray: null, IsBoolean: null, IsEmpty: null, IsNonEmpty: null, IsNull: null, IsNumber: null, IsSet: null,
  IsString: null, IsTimestamp: null, IsToken: null, Join: null,
  LT: null, LTE: null, LTrim: null, Lambda: null, Length: null, Let: null, Ln: null, LowerCase: null,
  Map: null, Match: null, Max: null, Mean: null, Merge: null, Min: null, Minute: null, Modulo: null, Month: null, Multiply: null,
  Not: null, Now: null, Or: null,
  Paginate: null, Prepend: null,
  Query: null,
  RTrim: null, Range: null, Reduce: null, RegexEscape: null, Role: null, Ref: null, Roles: null,
  Remove: null, Repeat: null, Replace: null, ReplaceStr: null, ReplaceStrRegex: null,
  Reverse: null, Round: null,
  Select: null, Space: null, StartsWith: null, SubString: null, Subtract: null, Sum: null,
  Take: null, Time: null, TimeAdd: null, TimeDiff: null, TimeSubstract: null, TitleCase: null, ToArray: null,
  ToDate: null, ToDouble: null, ToInteger: null, ToString: null, ToTime: null, Trim: null, Trunc: null,
  Union: null, Update: null, UpperCase: null,
  Var: null,
};


// get file and directory name
const __filename = import.meta.url.replace("file://", "");
const __dirname = __filename.split("/").slice(0, -1).join("/");

const cmd = Deno.args[0];

function replace_macro(filename: string, name: string, new_block: string) {
  const old_body = read.default_file("", filename);
  const matches = each_block(old_body, `// start macro: ${name}`, `// end macro`, (old_block) => {
    if (old_block === new_block) {
      console.log(`=== Already updated: ${name} ${filename}`);
      return;
    }
    write.file(filename, old_body.replace(old_block, new_block));
    console.log(`=== Wrote: ${name} ${filename}`);
  });

  if (matches.length === 0) {
    console.error(`!!! No macro found for: ${name} in ${filename}`);
    Deno.exit(1);
  }
} // function

function update_CreateExpr() {
  let values = [];
  for (const [fname, jsname] of Object.entries(COMMANDS)) {
    values.push(`export const ${jsname || fname} = CreateExpr("${fname}");`);
  } // for

  replace_macro("src/FaunaDB.ts", "CreateExpr", values.join("\n"));
} // function

function update_import_node() {
    const values     = [];
    values.push("const {");
    for (const [fname, jsname] of Object.entries(COMMANDS)) {
      if (jsname) {
        values.push(`${fname}: ${jsname},`);
      } else {
        values.push(`${fname},`);
      }
    }
    values.push("} = F.query;");

    replace_macro("src/Node-FaunaDB.mjs", "import-node", values.join("\n"));
} // function

switch (cmd) {

  case "update": {
    update_CreateExpr();
    update_import_node();
  } // case
  break;

  default:
    console.error(`!!! Invalid commands: ${Deno.inspect(Deno.args)}`);
    Deno.exit(1);
} // switch
