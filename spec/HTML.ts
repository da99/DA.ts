import { describe, it, equals } from "../src/Spec.ts";
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


// =============================================================================
describe(".new_tag()");

it("creates a tag", () => {
  const h = new HTML();
  h.new_tag("a", {href: "#hello"}, "yo", true);
  equals(h.to_html(), `<a href="#hello">yo</a>`);
});
