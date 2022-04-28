
import { describe, it, equals } from "../src/Spec.ts";
import {
  local_tmp, a_local_tmp,
  tmp, a_tmp,
  shell_string,
} from "../src/Shell.ts";

// =============================================================================
describe("local_tmp");
// =============================================================================

it("executes commands in ./tmp", () => {
  const contents = Date.now().toString();
  local_tmp("spec.dsl", () => {
    Deno.writeTextFileSync("a.txt", contents);
  });
  const actual = Deno.readTextFileSync("tmp/spec.dsl/a.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  const actual = local_tmp("spec.dsl", () => {
    return "hello sync"
  });
  equals(actual, "hello sync");
});

// =============================================================================
describe("a_local_tmp");
// =============================================================================

it("executes commands in ./tmp", async () => {
  const contents = Date.now().toString();
  const x = await a_local_tmp("spec.dsl", async () => {
    return await Deno.writeTextFile("b.txt", contents);
  });
  const actual = Deno.readTextFileSync("tmp/spec.dsl/b.txt");
  equals(actual, contents);
});

it("returns the value of the function", async () => {
  const actual = await a_local_tmp("spec.dsl", async () => {
    return shell_string(`echo`, 'hello')
  });
  equals(actual, "hello");
});

