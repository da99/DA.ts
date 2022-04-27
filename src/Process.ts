
import {inspect} from "../src/Shell.ts";
import {split_whitespace, flatten_cmd} from "../src/String.ts";
import { bold, red, green, yellow, bgRed, white } from "https://deno.land/std/fmt/colors.ts";
// import { sleep } from "https://deno.land/x/sleep/mod.ts";

export type VERBOSE_LEVEL = "verbose" | "verbose-exit" | "verbose-fail" | "quiet";

export interface Result {
  cmd:     string[];
  status:  Deno.ProcessStatus;
  process: Deno.Process<Deno.RunOptions>;
  stdout:  string;
  stderr:  string;
  success: boolean;
  code:    number;
}

class Keep_Alive_Process {
  cmd:               string[];
  cmd_string:        string;
  is_finished:       boolean;
  should_keep_alive: boolean;
  process:           Deno.Process<Deno.RunOptions>;

  constructor(raw_cmd: string | string[]) {
    this.should_keep_alive = true;
    this.is_finished       = false;
    this.cmd               = split_cmd(raw_cmd);
    this.cmd_string        = this.cmd.join(' ');
    this.process           = Deno.run({cmd: this.cmd});
    print_start(this.cmd, this.process.pid);
  } // constructor

  get pid() {
    return this.process.pid;
  } // get

  get rid() {
    return this.process.rid;
  } // get

  async family_pids() {
    return await pstree_p(this.pid);
  } // async method

  async status() {
    const stat = await this.process.status();
    if (Deno.resources()[this.process.rid])
      this.process.close();
    this.is_finished = true;
    return stat;
  } // async method

  async keep_alive(): Promise<void> {
    const kap = this;
    while (kap.should_keep_alive) {
      const status = await kap.status();
      print_status(kap.cmd, kap.pid, status);
      kap.restart();
    }
  } // async method

  async kill(signal: "-TERM" | "-INT" = "-TERM"): Promise<void> {
    const kap = this;
    await run(`kill ${signal} ${kap.pid}`, "inherit", "verbose-exit")
    if (Deno.resources()[kap.rid])
      kap.process.close();
  } // async method

  restart() {
    if (!this.is_finished) {
      throw new Error(`Use "await status()" before calling restart();`);
    }
    this.process     = Deno.run({cmd: this.cmd});
    this.is_finished = false;
    print_start(this.cmd, this.process.pid);
    return this;
  } // method
} // class

export function split_cmd(x: string | string[]): string[] {
  if (typeof x === "string")
    return split_whitespace(x);
  if (x.length === 1)
    return split_whitespace(x[0]);
  if (x.length === 0)
    throw new Error(`Invalid command: ${inspect(x)}`);
  return x;
} // export function

export async function exit(pr: Promise<Result>) {
  const result = await pr;
  Deno.exit(result.code);
} // export async function

export async function exit_on_fail(pr: Promise<Result>) {
  const result = await pr;
  if (!result.success) {
    Deno.exit(result.code);
  }
  return result;
} // export async function

export async function throw_on_fail(pr: Promise<Result>) {
  const r = await pr;
  if (r.success)
    return r;
  const msgs = [`Exit ${r.status.code}`, r.stdout, r.stderr].join("\n").trim();
  throw new Error(msgs);
} // export async function

export async function run(
  arr:     string | string[],
  std:     "inherit" | "piped" | "null" | number = "piped",
  verbose: VERBOSE_LEVEL = "quiet"
): Promise<Result> {
  const cmd    = flatten_cmd([arr]);
  let stdout   = "";
  let stderr   = "";

  if (verbose === "verbose") {
      console.error(`=== ${yellow(cmd.join(" "))} ===`);
  } // if

  try {
    const process = Deno.run({ cmd, stderr: std, stdout: std });
    const status  = await process.status();

    // NOTE: For some reason, the process is never closed automatically.
    // At this point, we can close it manually since we have all the output
    // we need.
    process.close();

    if (std === "piped") {
      stdout = new TextDecoder().decode(await process.output());
      stderr =  new TextDecoder().decode(await process.stderrOutput());
    } // if

    if (verbose === "verbose" || verbose === "verbose-exit" || (!status.success && verbose === "verbose-fail" )) {
      print_status(cmd, process.pid, status);
    } // if

    return {
      cmd, status, process,
      stdout, stderr,
      success: status.success,
      code:    status.code
    };
  } catch (e) {
    console.error(cmd);
    throw e;
  }
} // export

export function print_start(cmd: string[], pid: number) {
  console.error(`=== ${bold('Start')}: (${pid}) ${bold('' + cmd[0])} ${yellow(inspect(cmd.slice(1)))} ${(new Date()).toLocaleString()}`);
} // export function

export function print_status(cmd: string[], pid: number, r: Deno.ProcessStatus) {
  const human_cmd = cmd.join(' ');
  if (r.success) {
    console.error(`--- (${pid}) ${green(human_cmd)} --- ${(new Date()).toLocaleString()}`);
  } else {
    console.error(`--- (${pid}) ${bgRed(white(" " + r.code.toString() + " "))}: ${bold(red(human_cmd))} --- ${(new Date()).toLocaleString()}`);
  }
} // export function

export async function keep_alive(...args: Array<string | string[]>) {
  const promises: Array<Promise<void>> = args.map((cmd) => {
    const ka = new Keep_Alive_Process(cmd);
    return ka.keep_alive();
  });

  await Promise.all(promises);
} // export async

export async function pgrep_f(pattern: string): Promise<number[]> {
  const io = await run(["pgrep", "-f", pattern], "piped", "quiet");
  return split_whitespace(io.stdout).map(x => parseInt(x)).filter(x => x !== Deno.pid);
} // export async function

/*
 * Returns: A number[] of child processes (recursively). In other words,
 * the family tree of pids, including the PID originally passed to the
 * function.
 */
export async function pstree_p(pid: string | number): Promise<number[]> {
  const result = await run(`pstree --hide-threads --ascii -p ${pid}`);
  let pids: number[] = [];
  if (!result.success)
    return pids;

  // Output is something like: name(123)--name(456)--name(789)
  // The pattern here grabs just the whole numbers with lookbehind/lookahead.
  const match = result.stdout.match(/(?<=\()\d+(?=\))/g);
  if (match) {
    pids = match.map(
      (x: string) => parseInt(x)
    );
  }
  return pids;
} // export async function
