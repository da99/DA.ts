

// import { ensureDirSync } from "https://deno.land/std/fs/mod.ts";
// import * as path from "https://deno.land/std/path/mod.ts";
//
import {download, sh, yellow, bold} from "../src/Shell.ts";

async function prune() {
  for await (const x of Deno.readDir(Deno.cwd())) {
    if (!x.name.match(/^node-v/))
      continue;
    console.error(`${yellow("Deleting")}: ${bold(x.name)}`);
    if (x.isDirectory)
      Deno.removeSync(x.name, { recursive: true });
    else
      Deno.removeSync(x.name);
  }
} // async function

export async function install_latest() {
  const remote_path = "https://nodejs.org/dist";
  const resp = await fetch(`${remote_path}/index.json`);

  const json = await resp.json();

  const ARCH = "linux-x64";

  let version = null;

  for (const v of json) {
    if (v.files.includes(ARCH)) {
      version = v;
      break;
    }
  } // for

  if (!version) {
    throw new Error(`No latest nodejs version found.`);
  } // if

  const NODE_DIR = `node-${version.version}-${ARCH}`;
  const FILENAME = `${NODE_DIR}.tar.xz`;
  const REMOTE_FILE = `${remote_path}/${version.version}/${FILENAME}`;

  try {
    await Deno.stat(NODE_DIR);
    console.error(`=== Skipping download: ${REMOTE_FILE}`);
    console.error(`=== Latest version already installed.`);
  } catch (e) {
    prune();
    console.error(`Downloading: ${NODE_DIR}`);
    await download(REMOTE_FILE, FILENAME);
    await sh(`tar -xf ${FILENAME}`, 'inherit');
    await sh(`ln -sf ${NODE_DIR} current`, 'inherit');
  }

  console.error(version);
  await sh(`npm update -g`, 'inherit');


} // export async function
