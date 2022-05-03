
import { describe, it, equals } from "../src/Spec.ts";
import { throw_on_fail, process } from "../src/Shell.ts";

// =============================================================================
describe("process");

it("accepts a string as a command.", async () => {
  const {stdout} = await process("echo a b c");
  equals(stdout, "a b c\n");
});

it("accepts a Array<string> as a command.", async () => {
  const {stdout} = await process(["echo", "1", "2", "3"]);
  equals(stdout, "1 2 3\n");
});

it("accepts 'piped' as an option.", async () => {
  const {stdout} = await process(["echo", "1", "2", "3"], "piped");
  equals(stdout, "1 2 3\n");
});

it("accepts {stdout: 'piped', stderr: 'piped'} as an option.", async () => {
  const {stdout} = await process(["echo", "1", "2", "3"], {stdout: 'piped', stderr: 'piped'});
  equals(stdout, "1 2 3\n");
});

it("returns STDOUT output", async function () {
  const {stdout} = await process("echo 4 5 6");
  equals(stdout, "4 5 6\n");
}); // it async

it("returns STDERR output", async function () {
  const {stderr} = await process(["node", "1", "2", "3"]);
  equals(stderr.match("Error: Cannot find module"), ["Error: Cannot find module"]);
}); // it async

it("returns status w/code", async function () {
  const {status} = await process(["node", "1", "2", "3"]);
  equals(status.code, 1);
}); // it async

it("returns status w/success boolean", async function () {
  const {status} = await process(["node", "1", "2", "3"]);
  equals(status.success, false);
}); // it async

// =============================================================================
describe("throw_on_fail(...)");

it("throws if result is not success", async function () {
  let msg = null;
  try {
    await throw_on_fail(process("node 1 2 3"));
  } catch (err) {
    msg = err.message;
  }
  const actual = (msg || "").split("\n")[0];
  equals(actual, "Exit 1");
}); // it async

