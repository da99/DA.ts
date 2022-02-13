
import { split_whitespace } from "./String.ts";
import { run } from "./Process.ts";
import { inspect, raw_inspect } from "./CLI.ts";
import {deepEqual} from "https://deno.land/x/cotton@v0.7.3/src/utils/deepequal.ts";

type schema_category = "role" | "collection" | "index" | "function";

const DEFAULT_CLIENT_VALUES = {
  secret:    "",
  port:      443,
  scheme:    "https",
  keepAlive: false,
  timeout:   5
}; // const


export type Expr = {
  readonly name: string;
  readonly args: any[];
  // [Deno.customInspect](): string;
} // class

type Common_Doc_Value = number | string | null | boolean | any[];
export type FQL_Doc = Record<string, Expr | Common_Doc_Value>;
export type Schema          = Array<FQL_Doc>;
export type Standard_Doc    = Record<string, Record<string, Common_Doc_Value> | Common_Doc_Value>;
export type Standard_Schema = Array<Standard_Doc>;


type Privilege = {
  resource: Expr,
  actions: {
    read: boolean,
    write: boolean,
    create: boolean,
    delete: boolean,
    history_read: boolean,
    history_write: boolean,
    unrestricted_read: boolean
  }
} // type

interface Param_Object_Group {
 [key: string]: Param_Object
}

interface Param_Object_Data {
   hash_version?: string,
   [key: string]: any
}

interface Param_Object {
 ref?: Expr,
 name: string,
 privileges?: Array<Privilege>,
 history_days?: number,
 role?: Expr,
 body?: Expr,
 data?: Param_Object_Data
}

interface Client_Options {
  secret?: string,
  domain?: string,
}

type ENV = {
  [key: string]: string,
};

class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
} // export

interface ProcessResults {
  stdout: string | null,
  stderr: string | null,
  code: number,
  success: boolean
} // interface

// start macro: create_expr
export const Add = create_expr("Add");
export const Append = create_expr("Append");
export const Call = create_expr("Call");
export const Ceil = create_expr("Ceil");
export const Collection = create_expr("Collection");
export const Collections = create_expr("Collections");
export const Concat = create_expr("Concat");
export const ContainsField = create_expr("ContainsField");
export const ContainsPath = create_expr("ContainsPath");
export const ContainsStr = create_expr("ContainsStr");
export const ContainsStrRegex = create_expr("ContainsStrRegex");
export const ContainsValue = create_expr("ContainsValue");
export const Count = create_expr("Count");
export const Create = create_expr("Create");
export const CreateCollection = create_expr("CreateCollection");
export const CreateFunction = create_expr("CreateFunction");
export const CreateIndex = create_expr("CreateIndex");
export const CreateRole = create_expr("CreateRole");
export const CurrentIdentity = create_expr("CurrentIdentity");
export const Delete = create_expr("Delete");
export const Difference = create_expr("Difference");
export const Distinct = create_expr("Distinct");
export const Divide = create_expr("Divide");
export const Do = create_expr("Do");
export const Documents = create_expr("Documents");
export const Drop = create_expr("Drop");
export const EndsWith = create_expr("EndsWith");
export const Exists   = create_expr("Exists");
export const Epoch = create_expr("Epoch");
export const Equals = create_expr("Equals");
export const Filter = create_expr("Filter");
export const Functions = create_expr("Functions");
export const Fn = create_expr("Fn");
export const Foreach = create_expr("Foreach");
export const Database = create_expr("Database");
export const Get = create_expr("Get");
export const GT = create_expr("GT");
export const GTE = create_expr("GTE");
export const Identify = create_expr("Identify");
export const If = create_expr("If");
export const Index = create_expr("Index");
export const Indexes = create_expr("Indexes");
export const Insert = create_expr("Insert");
export const Intersection = create_expr("Intersection");
export const IsArray = create_expr("IsArray");
export const IsBoolean = create_expr("IsBoolean");
export const IsCollection = create_expr("IsCollection");
export const IsEmpty = create_expr("IsEmpty");
export const IsFunction = create_expr("IsFunction");
export const IsIndex = create_expr("IsIndex");
export const IsNonEmpty = create_expr("IsNonEmpty");
export const IsNull = create_expr("IsNull");
export const IsNumber = create_expr("IsNumber");
export const IsSet = create_expr("IsSet");
export const IsString = create_expr("IsString");
export const IsRef = create_expr("IsRef");
export const IsRole = create_expr("IsRole");
export const IsTimestamp = create_expr("IsTimestamp");
export const IsToken = create_expr("IsToken");
export const Join = create_expr("Join");
export const LT = create_expr("LT");
export const LTE = create_expr("LTE");
export const LTrim = create_expr("LTrim");
export const Lambda = create_expr("Lambda");
export const Length = create_expr("Length");
export const Let = create_expr("Let");
export const Ln = create_expr("Ln");
export const LowerCase = create_expr("LowerCase");
export const Map = create_expr("Map");
export const Match = create_expr("Match");
export const Max = create_expr("Max");
export const Mean = create_expr("Mean");
export const Merge = create_expr("Merge");
export const Min = create_expr("Min");
export const Minute = create_expr("Minute");
export const Modulo = create_expr("Modulo");
export const Month = create_expr("Month");
export const Multiply = create_expr("Multiply");
export const Not = create_expr("Not");
export const Now = create_expr("Now");
export const Or = create_expr("Or");
export const Paginate = create_expr("Paginate");
export const Prepend = create_expr("Prepend");
export const Query = create_expr("Query");
export const RTrim = create_expr("RTrim");
export const Range = create_expr("Range");
export const Reduce = create_expr("Reduce");
export const RegexEscape = create_expr("RegexEscape");
export const Role = create_expr("Role");
export const Ref = create_expr("Ref");
export const Roles = create_expr("Roles");
export const Remove = create_expr("Remove");
export const Repeat = create_expr("Repeat");
export const Replace = create_expr("Replace");
export const ReplaceStr = create_expr("ReplaceStr");
export const ReplaceStrRegex = create_expr("ReplaceStrRegex");
export const Reverse = create_expr("Reverse");
export const Round = create_expr("Round");
export const Select = create_expr("Select");
export const Space = create_expr("Space");
export const StartsWith = create_expr("StartsWith");
export const SubString = create_expr("SubString");
export const Subtract = create_expr("Subtract");
export const Sum = create_expr("Sum");
export const Take = create_expr("Take");
export const Time = create_expr("Time");
export const TimeAdd = create_expr("TimeAdd");
export const TimeDiff = create_expr("TimeDiff");
export const TimeSubstract = create_expr("TimeSubstract");
export const TitleCase = create_expr("TitleCase");
export const ToArray = create_expr("ToArray");
export const ToDate = create_expr("ToDate");
export const ToObject = create_expr("ToObject");
export const ToDouble = create_expr("ToDouble");
export const ToInteger = create_expr("ToInteger");
export const ToString = create_expr("ToString");
export const ToTime = create_expr("ToTime");
export const Trim = create_expr("Trim");
export const Trunc = create_expr("Trunc");
export const Union = create_expr("Union");
export const Update = create_expr("Update");
export const UpperCase = create_expr("UpperCase");
export const Var = create_expr("Var");

// # =============================================================================
// # === Node Process Functions ==================================================
// # =============================================================================
export async function node(...args: string[]) {
  return await run({
    cmd: [
      "node",
      "src/Node-FaunaDB.mjs",
      ...args
    ]
  });
} // export

export async function inherit_node(...args: string[]) {
  const result = await run({
    cmd: [
      "node",
      "src/Node-FaunaDB.mjs",
      ...args
    ],
    stderr: "inherit",
    stdout: "inherit"
  });

  if (!result.success) {
    throw Error("Failed.");
  }
  return true;
} // export

export async function query(o: Client_Options, raw_body: Expr | Record<string, any>) {
  const options = JSON.stringify(o);
  const body    = raw_inspect(raw_body);
  const cmd     = ["node", "src/Node-FaunaDB.mjs", "query", options, body ];
  const result  = await run({cmd});

  if (result.success) {
    const o = eval(`(${(result.stdout as string).replaceAll("Function(", "Fn(")})`);
    return o;
  }

  console.error("============ ");
  console.error(`Command: query`);
  console.error("=== FQL query failed:: === ");
  console.error(`Exit code: ${result.code}`);
  console.error("============ ");
  console.error(inspect(raw_body));
  console.error("============ ");
  console.error("STDOUT: ", result.stdout);
  console.error("STDERR: ", result.stderr);
  console.error("============ ");

  throw new Error("failed.");
} // export

// # =============================================================================
// # === FQL Composition Functions ===============================================
// # =============================================================================

export function schema() {
  return Reduce(
    Lambda(
      ["acc", "coll"],
      Append(
        Select(
          "data",
          Map(
            Paginate(Var("coll")),
            Lambda("x", Get(Var("x")))
          )
        ), // Map
        Var("acc")
      ) // Prepend
    ), // Lambda
    [],
    [Roles(), Collections(), Functions(), Indexes()]
  ); // Reduce
} // export

export function concat_data(...args: Expr[]) {
  const new_args = args.map((x) => {
    return Select("data", x);
  });
  return concat_array(...new_args);
} // export function

export function drop(x: Expr) {
  return Map(
    Paginate(x),
    Lambda("x", Delete(Var("x")))
  );
} // export function

export function map_select(x: Expr, k: string) {
  return Map(
    x,
    Lambda(
      "doc",
      Select(k, Var("doc"))
    ) // Lambda
  );
} // export function

export function concat_array(...args: Expr[]) {
  return args.reverse().reduce((old, curr) => {
    if (!old) { return curr; }
    return Prepend(old, curr);
  });
} // export function

export function create_expr(name: string) {
  return (...args: any[]) : Expr => {
    return {
      name: name,
      args: args,
      [Symbol.for("Deno.customInspect")](): string {
        return `${name}(${args.map((x: any) => Deno.inspect(x, {depth: Infinity})).join(', ')})`;
      }
    };
  };
} // function

export function drop_schema() {
  return Do(
    drop(Collections()),
    drop(Roles()),
    drop(Indexes()),
    drop(Functions())
  );
} // export

export function delete_if_exists(x: any): Expr {
  return If(Exists(x), Delete(x), false);
} // export function

export function collection_names(): Expr {
  return Select("data", Map(
    Paginate(Collections()),
    Lambda("x", Select("name", Get(Var("x"))))
  ));
} // export function

export function map_get(x: Expr, keys?: string[]) {
  let to_doc = Get(Var("x"));
  if (keys) {
    to_doc = Let(
      { doc: Get(Var("x")) },
      select_keys(keys, Var("doc"))
    ); // Let
  }
  return Map(
    Paginate(x),
    Lambda( "x", to_doc)
  ); // Map
} // export function

export function Select_Map_Paginate(x: Expr) {
  return Select(
    "data",
    Map(
      Paginate(x),
      Lambda("x", Get(Var("x")))
    )
  );
} // func

// # =============================================================================
// # === Migration Functions =====================================================
// # =============================================================================

export function standardize(raw_x: any) {
  return JSON.parse(JSON.stringify(raw_x));
} // export function

export function select_keys(keys: string[], x: Expr) {
  const o: Record<string, Expr> = {};
  for (let k of keys) {
    if (k.indexOf('?') === k.length - 1) {
      const new_k = k.substring(0, k.length - 1);
      o[new_k] = Select(new_k, x, null);
    } else {
      o[k] = Select(k, x);
    }
  } // for
  return o;
} // export function

export function create_doc(doc: FQL_Doc): Expr {
  const ref        = doc.ref as Expr;
  const coll_name  = ref.name;
  const new_values = Object.assign({}, doc);
  delete new_values.ref;

  switch (coll_name) {
    case "Index": {
      return CreateIndex(new_values);
    }
    case "Role": {
      return CreateRole(new_values);
    }
    case "Collection": {
      delete new_values.ts
      return CreateCollection(new_values);
    }
    case "Function": {
      return CreateFunction(new_values);
    }
    default: {
      throw new Error(`Unknown resource: ${ref.name}`);
    }
  } // swotcj
} // export function

export function ref_compare(x: FQL_Doc, y: FQL_Doc) {
  return deepEqual(x.ref, y.ref);
} // export function

export function doc_compare(old_doc: FQL_Doc, new_doc: FQL_Doc): boolean | Expr {
  if (!ref_compare(old_doc, new_doc))
    return false;
  const merged = Object.assign({}, old_doc, new_doc);
  if (deepEqual(merged, old_doc))
    return true;

  const ref = new_doc.ref;
  const new_new = Object.assign({}, new_doc);
  delete new_new.ref
  return Update(ref, new_new);
} // export function

export function diff(f_old: Schema, f_new: Schema) {
  const fin: Expr[] = [];

  for (let i = 0; i < f_new.length; i++) {
    const new_doc = f_new[i];
    let do_create = true;

    for (let j = 0; j < f_old.length; j++) inner: {
      const old_doc = f_old[j];
      const c = doc_compare(old_doc, new_doc);
      switch (c) {
        case true: { // Docs match.
          do_create = false;
          break inner;
        }
        case false: { // No match.
          break;
        }
        default: {
          fin.push(c as Expr);
          do_create = false;
          break inner;
        }
      } // switch
    } // for

    if (do_create)
      fin.push(create_doc(new_doc));
  } // for

  for (const old_doc of f_old) {
    const new_doc = f_new.find(
      (n: FQL_Doc) => ref_compare(n, old_doc)
    );

    if (!new_doc) {
      fin.push(Delete(old_doc.ref));
    } // if
  } // for

  return fin;
} // export function

// CreateRole({
//   name: "cloudflare_worker_function",
//   privileges: [
//     {
//       resource: Collection("screen_name"),
//       actions: {
//         read: true,
//         write: true,
//         create: true,
//         delete: false,
//         history_read: false,
//         history_write: false,
//         unrestricted_read: false
//       }
//     }
//   ]
// }) ;
