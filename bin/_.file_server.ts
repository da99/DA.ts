

import {
  content_type, split_whitespace, path
} from "../src/da.ts";

import {
  yellow, bold, green, bgRed, white,
  join, sh, read
} from "../src/Shell.ts";

import {
  Application,
  Router,
  send,
  ServerSentEventTarget
} from "https://deno.land/x/oak/mod.ts";

import {writeAll} from 'https://deno.land/std/streams/conversion.ts';
import nunjucks from "https://deno.land/x/nunjucks/mod.js";

import type {Process_Result} from "../src/Shell.ts";
// import type {Context} from "https://deno.land/x/oak/context.ts";

// const NUN = nunjucks.configure({noCache: true});

const watches: Array<ServerSentEventTarget> = [];

const router = new Router();
const app    = new Application();

async function print(s: string) {
  return await writeAll(Deno.stderr, new TextEncoder().encode(s));
} // async function

const CONFIG = {
  "port": 5555,
  "public_dir": "./",
  "render_cmd": split_whitespace("../bin/__ render")
};

async function file_exists(file_path: string): Promise<boolean> {
  try {
    const s = await Deno.stat(file_path);
    return s.isFile;
  } catch (e) {
    return false;
  }
} // function

async function read_file(file_path: string): Promise<string | null> {
  return await Deno.readTextFile(file_path);
} // function

export async function render(file_path: string): Promise<Process_Result> {
  const cmd: string[] = CONFIG.render_cmd.slice();
  cmd.push(file_path);
  return await sh(cmd, "piped", "inherit");
} // export async function

export async function start(port: number, render_cmd: string[]) {
  Object.assign(CONFIG, {port, render_cmd});
  console.error(CONFIG);

  // =============================================================================
  // === Logger:
  // =============================================================================
  app.use(async (ctx: any, next: any) => {
    await print(`${yellow(ctx.request.method)} ${bold(ctx.request.url.pathname)} `);
    try {
      await next();
      switch (ctx.response.status) {
        case 200: {
          await print(`${green(ctx.response.status.toString())}`);
          break;
        }
        default: { await print(`${bgRed(white(ctx.response.status.toString()))}`); }
      } // switch

      print(` .type: ${ctx.response.type}\n`);

      if (ctx.response.status === 418) {
        print(`${String(ctx.response.body)}\n\n`);
        ctx.response.body = "ERROR - CHECK CONSOLE OUTPUT FOR MORE INFORMATION.";
      }
    } catch (err) {
      await print(`${bgRed(white(err.name))}:${err.message}\n`);
      throw err;
    }
  });


  // =============================================================================
  // ==== Routes: ============================================================
  // =============================================================================
  router
  .get("/da.ts/watch", (ctx) => {
    const target = ctx.sendEvents();
    watches.pop();
    watches.push(target);
  })
  .get("/da.ts/reload.js", (ctx) => {
    ctx.response.body   = `
    const es = new EventSource("/da.ts/watch");
    console.log("watching reload: ", new Date());
    es.onmessage = function (event) {
      switch (event.data) {
        case 'reload':
          window.location.reload();
        break;
        default:
          console.error("--- Unknown server sent message:");
        console.error(event);
        console.error("--------------------------------");
      } // switch
    };
    `;
    ctx.response.status = 200;
    ctx.response.type   = content_type("file.js");
  });

  app.use( router.routes() );
  app.use( router.allowedMethods() );

  // =============================================================================
  // === Static Files:
  // =============================================================================
  app.use(async (ctx, next) => {
    const pathname = ctx.request.url.pathname;
    if (pathname.at(-1) !== '/' && !pathname.match(/\.(otf|ttf|txt|woff2?|ico|png|jpe?g|gif|html|js|json|mjs|css)$/)) {
      ctx.response.body   = `Not found: ${Deno.inspect(pathname)}`;
      ctx.response.status = 404;
      ctx.response.type   = "text";
      return;
    } // if

    const file_path = join('.', ctx.request.url.pathname);
    const ext       = path.extname(file_path);

    if (await file_exists(file_path)) {
      ctx.response.body   = (file_path.match(/\.html$/)) ? add_js_reload(read.file(file_path)) : read.file(file_path);
      ctx.response.status = 200;
      ctx.response.type   = content_type(file_path);
      return;
    }

    switch (ext) {
      case ".css": {
        const less = file_path.replace(/\.css$/, '.less');
        if (await file_exists(less)) {
          const result = await sh(`npx lessc ${less}`);
          if (result.success) {
            ctx.response.body   = result.stdout;
            ctx.response.status = 200;
            ctx.response.type   = content_type(file_path);
            return;
          }
        }
        break;
      } // case

      case '.mjs': {
        const file_ts = file_path.replace(/\.mjs$/, '.ts');
        if (await file_exists(file_ts)) {
          const result = await sh(`deno bundle -q ${file_ts}`);
          if (result.success) {
            ctx.response.body   = result.stdout;
            ctx.response.status = 200;
            ctx.response.type   = content_type("file.js");
            return;
          }
        }
      } // case

      case '': {
        const file_html = path.join(file_path, 'index.html');
        if (await file_exists(file_html)) {
          ctx.response.body   = add_js_reload(Deno.readTextFileSync(file_html));
          ctx.response.status = 200;
          ctx.response.type   = content_type(file_html);
          return;
        }
      }
    } // switch


    try {
      const result = await render(file_path);
      switch (result.code) {
        case 0: {
          const ct = content_type(file_path);
          ctx.response.type = ct
          if (path.extname(ct.toLowerCase()) === '.html')
            ctx.response.body = add_js_reload(result.stdout);
          else
            ctx.response.body = result.stdout;
          return;
        }
        case 40: {
          ctx.response.status = 404;
          ctx.response.body   = `Not found: ${Deno.inspect(file_path)}`
          ctx.response.type   = content_type("404.txt");
          return;
        }
        default: {
          ctx.response.status = 500;
          ctx.response.body   = `${result.stderr}\n${result.stdout}`;
          ctx.response.type   = "text";
          return;
        }
      }
    } catch (err) {
      ctx.response.status = 500;
      ctx.response.body   = err.message;
      ctx.response.type   = "text";
    }

    return;
    // await next();
  });

  // =============================================================================
  // === Listen:
  // =============================================================================
  app.addEventListener("listen", ({hostname, port}) => {
    console.error(`=== Listening on: ${hostname}:${green(port.toString())}`);
  });

  // === Signal: =================================================================
  Deno.addSignalListener("SIGUSR1", () => {
    console.log("reloading clients");
    watches.forEach(x => {
      try { x.dispatchMessage("reload"); } catch (e) { console.log(e); }
    });
  });

  // === listen: =================================================================
  return await app.listen({ port: CONFIG["port"] });
} // export async function

function add_js_reload(str: string): string {
  return `${str}\n<script defer src="/da.ts/reload.js"></script>`;
};
