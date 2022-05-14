
import { escapeHtml as escape } from "https://deno.land/x/escape/mod.ts";

export type Attrs = string | Record<string, string>;
export type Body = string | (() => void);

let PIECES: string[] = [];

export function new_page() {
  PIECES = [];
} // function

export function new_tag(name: string, attrs: Attrs, body: Body, end_tag: boolean = true) {
  PIECES.push(`<${name} ${attrs_to_string(attrs)}`);
  if (end_tag === true) {
    PIECES.push('>')
    if (typeof body === "string") {
      PIECES.push(escape(body));
    } else {
      body();
    }
    PIECES.push(`</${name}>`);
  } else {
    PIECES.push(` />`);
  } // if end_tag
} // export function

export function div(attrs: Attrs = "", body: Body = "") {
  return new_tag('div', attrs, body, true);
} // export function

export function a(attrs: Attrs, body: Body) {
  return new_tag('a', attrs, body, true);
} // export function

export function to_html() {
  return PIECES.join('');
} // export function

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
        body();
      }
      this.pieces.push(`</${name}>`);
    } else {
      this.pieces.push(` />`);
    } // if end_tag
  } // method

  div(attrs: Attrs = "", body: Body = "") {
    return this.new_tag('div', attrs, body, true);
  } // method

  a(attrs: Attrs, body: Body) {
    return this.new_tag('a', attrs, body, true);
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
      switch (k) {
        case "href": {
          v = v.trim();
          let u: null | URL = null;
          try {
            u = new URL(v);
          } catch (e) {
            const new_v = v
            .trim()
            .replaceAll(/[^a-z0-9\_\-\.\/]+/ig, '')
            .replaceAll(/\.+/g, '.')
            .replaceAll(/\/+/g, '/');
            if (new_v !== v)
              throw new Error(`Invalid href attribute: ${Deno.inspect(v)}`);
            return `${k}=${Deno.inspect(escape(new_v))}`;
          }
          const protocol = u.protocol.trim().toLowerCase();
          switch (protocol) {
            case "http":
            case "https":
            case "ssh":
            case "ftp":
            case "sftp":
            case "git":
            case "magnet":
            case "gopher": {
              return `${k}=${Deno.inspect(escape(u.toString()))}`;
            }
            default: {
              throw new Error(`Invalid href attribute: ${Deno.inspect(v)}`);
            }
          }
        }
        default: {
          return `${k}=${Deno.inspect(escape(v))}`;
        }
      }
    }).join(' ');
  } // function
