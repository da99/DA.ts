import { describe, it, equals, matches } from "../src/Spec.ts";
import { HTML } from "../src/HTML.ts";


// =============================================================================
describe(".to_html()");

it("returns a string", () => {
  const h = new HTML();
  h.div({"class": "hello"}, "yo");
  equals(h.to_html(), `<div class="hello">yo</div>`);
});

// =============================================================================
describe(".attribute()");

it("accepts a string", () => {
  const h = new HTML();
  h.div("#main.red", "yo");
  equals(h.to_html(), `<div id="main" class="red">yo</div>`);
});

it("accepts an :href attribute with a relative file path", () => {
  const h = new HTML();
  h.a({href: "file.css"}, "yo");
  equals(h.to_html(), `<a href="file.css">yo</a>`);
});

it("throws an error if there are any invalid path characters in a :href attribute with a relative file path", () => {
  const h = new HTML();
  let msg = "no error thrown";
  try {
    h.a({href: "file^^^.css"}, "yo");
  } catch (e) {
    msg = e.message;
  }
  matches(msg, /invalid href attribute/i);
});

it("throws an error if :href attribute is an invalid url", () => {
  const h = new HTML();
  let msg = "no error thrown";
  try {
    h.a({href: "javascript:sdfom"}, "yo");
  } catch (e) {
    msg = e.message;
  }
  matches(msg, /invalid href attribute/i);
});

it("throws an error if :href attribute has an unknown protocol", () => {
  const h = new HTML();
  let msg = "no error thrown";
  try {
    h.a({href: "bittorrent://www.gogle.com"}, "yo");
  } catch (e) {
    msg = e.message;
  }
  matches(msg, /invalid href attribute/i);
});

// =============================================================================
describe(".new_tag()");

it("creates a tag", () => {
  const h = new HTML();
  h.new_tag("span", "#main01.cool", "yo", true);
  equals(h.to_html(), `<span id="main01" class="cool">yo</span>`);
});
