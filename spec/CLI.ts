import { describe, it } from "../src/Spec.ts";
import { split_whitespace } from "../src/String.ts";
import { daEquals } from "./_.helper.ts";
import { get_vars, split_cli_command } from "../src/Shell.ts";

// =============================================================================
describe("split_cli_command(...)");

it("splits whole words", () => {
  daEquals("splits whole words".split(" "), split_cli_command("splits whole words"));
});

it("splits words surrounded by brackets: < > [ ]", () => {
  daEquals(["create", "<git>", "[ignore]"], split_cli_command("create <git> [ignore]"));
});

it("removes unnecessary whitespace in <> brackets: < a   b > -> <a b>", () => {
  const actual = split_cli_command("command < hello   name > <  name   name>");
  daEquals(actual, ["command", "<hello name>", "<name name>"]);
});

it("removes whitespace surrounding |: <a |  c  |  b> -> <a|c|b>", () => {
  const actual = split_cli_command("command <hello |w  | name> <name|  w| name>");
  daEquals(actual, ["command", "<hello|w|name>", "<name|w|name>"]);
});

// =============================================================================
describe("get_vars(...)");

it("returns vars according to pattern: hello <var1> <var2>", function () {
   const actual = get_vars("hello <var1> <var2>", split_whitespace("hello 1 2"));
   daEquals(actual, ["1", "2"]);
}); // it function

it("returns vars with retricted values: hello <1|2|3> <4|5>", function () {
   const actual = get_vars("hello <1|2|3> <4>", split_whitespace("hello 2 4"));
   daEquals(actual, ["2", "4"]);
}); // it function

it("returns vars that are optional: help [search]", function () {
   const actual = get_vars("help [search]", split_whitespace("help something"));
   daEquals(actual, ["something"]);
}); // it function

it("returns the default value if the user input is missing: build [*all|worker|public]", function () {
   const actual = get_vars("build [*all|worker|public]", split_whitespace("build"));
   daEquals(actual, ["all"]);
}); // it function

it("returns remaining values as an Array for <...args>: run <cmd> <...args>", function () {
   const actual = get_vars("run <cmd> <...args>", split_whitespace("run my command with args"));
   daEquals(actual, ["my", ["command", "with", "args"]]);
}); // it function

it("returns false if there are no input values for <...args>", function () {
   const actual = get_vars("run <cmd> <...args>", split_whitespace("run my"));
   daEquals(actual, false);
}); // it function

it("returns an empty array if there are no input values for [...args]", function () {
   const actual = get_vars("run <cmd> [...args]", split_whitespace("run my"));
   daEquals(actual, ["my", []]);
}); // it function
