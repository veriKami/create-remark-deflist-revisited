#!/usr/bin/env node
//: --------------------------------------------------------
//: make.all.js
//: --------------------------------------------------------
import { rm } from "node:fs/promises";
import { promisify } from "node:util";
import makeBundle from "./make.bundle.js";
import makeDiff from "./make.diff.js";

const exec = promisify(await import("node:child_process")
  .then(module => module.exec));

const templates = ["astro", "express", "simple", "worker"];

/** export **********************************
 */
async function makeAll($ = "") {
  for (const tpl of templates) {
    const projectPath = `templates/remark-deflist-revisited-${tpl}`;
    const outputFile = `pack/bundle.${tpl}.js`;
    const testPath = `pack/test.${tpl}`;
    try {
      /// node make.bundle.js templates/remark-deflist-revisited-simple pack/bundle.simple.js
      // await makeBundle(projectPath, outputFile, true); //: for full console output
      await makeBundle(projectPath, outputFile);

      /// node pack/bundle.simple.js pack/test.simple
      //
      await exec(`node ${outputFile} ${testPath}`);

      console.log("" + "─".repeat(37));
      console.log(`📁 Created: ${testPath}`);

      /// node make.diff.js templates/remark-deflist-revisited-simple pack/test.simple
      //
      await makeDiff(projectPath, testPath);

      /// cleaning
      //
      if (!$) await rm(testPath, { recursive: true, force: true });
    }
    catch (err) {
      console.log("❌ " + err.message);
      process.exit(1);
    }
  }
}

//: USAGE
//: -----------------------------------------
if (import.meta.url.endsWith(process.argv[1])) {
  const option = process.argv[2];
  if (option === "--help") {
    console.log("\n   Usage: ./make.all.js [option]");
    process.exit(1);
  }
  makeAll(option).catch(console.error);
}

export default makeAll;
