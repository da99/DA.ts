import { describe, it } from "../src/Spec.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { Text_File, find_parent_file } from "../src/Shell.ts";

describe("Text_File.find_parent_file");

it("finds file within same directory", () => {
  const actual = find_parent_file("test", "sh/");
  assertEquals("sh/test", actual);
});

it("finds file within parent directory", () => {
  const actual = find_parent_file("test", "sh/a/b/c/d/e/f/main.ts");
  assertEquals("sh/test", actual);
});

it("returns null if file not found", () => {
  const actual = find_parent_file("run", "sh/a/b/c/d/e/f/main.ts");
  assertEquals(null, actual);
});
