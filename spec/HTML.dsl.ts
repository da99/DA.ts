import { describe, it, equals, matches } from "../src/Spec.ts";
import { new_page, new_tag, div, a, to_html } from "../src/HTML.ts";


// =============================================================================
describe(".to_html()");

it("returns a string", () => {
  new_page();
  div({"class": "hello"}, "yo");
  equals(to_html(), `<div class="hello">yo</div>`);
});

// =============================================================================
describe(".attribute()");

it("accepts a string", () => {
  new_page();
  div("#main.red", "yo");
  equals(to_html(), `<div id="main" class="red">yo</div>`);
});

it("accepts an :href attribute with a relative file path", () => {
  new_page();
  a({href: "file.css"}, "yo");
  equals(to_html(), `<a href="file.css">yo</a>`);
});

it("throws an error if there are any invalid path characters in a :href attribute with a relative file path", () => {
  new_page();
  let msg = "no error thrown";
  try {
    a({href: "file^^^.css"}, "yo");
  } catch (e) {
    msg = e.message;
  }
  matches(msg, /invalid href attribute/i);
});

it("throws an error if :href attribute is an invalid url", () => {
  new_page();
  let msg = "no error thrown";
  try {
    a({href: "javascript:sdfom"}, "yo");
  } catch (e) {
    msg = e.message;
  }
  matches(msg, /invalid href attribute/i);
});

it("throws an error if :href attribute has an unknown protocol", () => {
  new_page();
  let msg = "no error thrown";
  try {
    a({href: "bittorrent://www.gogle.com"}, "yo");
  } catch (e) {
    msg = e.message;
  }
  matches(msg, /invalid href attribute/i);
});

// =============================================================================
describe(".new_tag()");

it("creates a tag", () => {
  new_page();
  new_tag("span", "#main01.cool", "yo", true);
  equals(to_html(), `<span id="main01" class="cool">yo</span>`);
});
