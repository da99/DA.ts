
import { escapeHtml as escape } from "https://deno.land/x/escape/mod.ts";

export type Attrs = string | Record<string, string>;
export type Body = string | ((h: HTML) => void);

export class HTML {
  pieces: string[];

  constructor() {
    this.pieces = [];
  } // constructor

  new_tag(name: string, attrs: Attrs, body: Body, end_tag: boolean = true) {
    this.pieces.push(`<${name} ${attrs_to_string(attrs)}`);
    if (end_tag === true) {
      this.pieces.push('>')
      if (typeof body === "string") {
        this.pieces.push(escape(body));
      } else {
        body(this);
      }
      this.pieces.push(`</${name}>`);
    } else {
      this.pieces.push(` />`);
    } // if end_tag
  } // method

  div(a: Attrs, body: Body) {
    return this.new_tag('div', a, body, true);
  } // method

  to_html() {
    return this.pieces.join('');
  } // method
} // class

function attrs_to_string(o: Attrs): string {
    if (typeof o === "string") {
      const str = o as string;
      const new_attr: Attrs = {};
      let classes: Array<string> = [];
      const pieces               = str.split(".");

      for (const raw_y of pieces) {
        const y = raw_y.trim();
        if (y.length === 0) { return ""; }

        if (y.indexOf("#") === -1) {
          classes.push(y.trim());
          continue;
        }

        if (y.length < 2) {
          continue
        }

        const id = y.split("#")[1];
        if (id)
          new_attr["id"] = id.trim();
      }; // for

      let classes_str: string = classes.join(" ").trim();
      if (classes_str.length > 0) {
        new_attr["class"] = classes_str;
      }
      return attrs_to_string(new_attr);
    } // if

    return Object.entries(o).map(([k,v]) => {
      return `${k}=${Deno.inspect(v)}`;
    }).join(' ');
  } // function
