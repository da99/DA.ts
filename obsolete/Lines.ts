
export class Lines {
  readonly raw: string[];

  constructor(x: string | string[]) {
    if (typeof x === "string")
      this.raw = x.trim().split('\n');
    else
      this.raw = x;
  }

  get length() { return this.raw.length; }
  get trimmed_lines () {
    return this.raw.map(x => x.trim()).filter(x => x.length > 0);
  } // get

  /*
    Use this when you expect one line that is not empty.
    Throws otherwise.
    Automatically trims the string.
  */
  get raw_string(): string {
    const lines = this.raw.map(x => x.trim()).filter(x => x.length > 0);
    if (lines.length === 1)
      return lines.join('');
    if (lines.length === 0)
      throw new Error(`No output for: Lines#raw_string ${Deno.inspect(this.raw)}`);
    throw new Error(`More than one line for: Lines#raw_string ${Deno.inspect(this.raw)}`);
  } // get

  default_non_empty_string(d: any, f: (x: string) => any) {
    const trimmed = this.trimmed_lines;
    if (trimmed.length === 0)
      return d;
    return f(trimmed.join('\n'));
  } // method

  split(pattern: string | RegExp): Table {
    return table(
      this.raw.map(s => s.trim().split(pattern))
    );
  } // method

  filter(f: (s: string) => boolean): Lines {
    return lines(this.raw.filter(s => f(s)));
  } // method

  remove(f: (s: string) => boolean): Lines {
    return lines(this.raw.filter(s => !f(s)));
  } // method

  promise_all(f: (x: any) => Promise<any>): Promise<any> {
    return Promise.all(this.raw.map(f));
  } // method
} // class

