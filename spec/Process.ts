
import { describe, it, equals, matches } from "../src/Spec.ts";
import { sh } from "../src/Shell.ts";

// =============================================================================
describe("process");

it("accepts a string as a command.", async () => {
  const {stdout} = await sh("echo a b c");
  equals(stdout, "a b c\n");
});

it("accepts a Array<string> as a command.", async () => {
  const {stdout} = await sh(["echo", "1", "2", "3"]);
  equals(stdout, "1 2 3\n");
});

it("accepts 'piped' as an option.", async () => {
  const {stdout} = await sh(["echo", "1", "2", "3"], "piped");
  equals(stdout, "1 2 3\n");
});

it("accepts stdout: 'piped', stderr: 'piped' as options.", async () => {
  const {stdout} = await sh(["echo", "1", "2", "3"], 'piped', 'piped');
  equals(stdout, "1 2 3\n");
});

it("returns STDOUT output", async function () {
  const {stdout} = await sh("echo 4 5 6");
  equals(stdout, "4 5 6\n");
}); // it async

it("returns STDERR output", async function () {
  const {stderr} = await sh(["node", "1", "2", "3"], "piped", "piped", false);
  equals(stderr.match("Error: Cannot find module"), ["Error: Cannot find module"]);
}); // it async

it("returns status w/code", async function () {
  const {status} = await sh(["node", "1", "2", "3"], "piped", "piped", false);
  equals(status.code, 1);
}); // it async

it("returns status w/success boolean", async function () {
  const {status} = await sh(["node", "1", "2", "3"], 'piped', 'piped', false);
  equals(status.success, false);
}); // it async

// =============================================================================
describe("sh(..., true)");

it("throws if result is not success", async function () {
  let msg = "No error thrown.";
  try {
    await sh("node 1 2 3", 'piped', 'piped', true);
  } catch (err) {
    msg = err.message;
  }

  matches(msg, /Failed .+1.+"node".+/);
}); // it async

