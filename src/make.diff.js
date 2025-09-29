#!/usr/bin/env node
//: --------------------------------------------------------
//: make.diff.js
//: --------------------------------------------------------
import { readFile, readdir, stat } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

//: HASH
//: -----------------------------------------
function hashContent(content) {
  return crypto.createHash("md5").update(content).digest("hex");
}

//: GET FILES
//: -----------------------------------------
async function getFilesFromDir(dirPath) {
  const files = new Map();

  async function collectFiles(dir, relative = "") {
    const items = await readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relPath = path.join(relative, item);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        await collectFiles(fullPath, relPath);
      } else {
        const content = await readFile(fullPath, "utf8");
        const hash = hashContent(content);
        files.set(relPath, { content, hash, size: stats.size });
      }
    }
  }

  await collectFiles(dirPath);
  return files;
}

//: COMPARE FILES
//: -----------------------------------------
async function compareFiles(originalPath, generatedPath) {
  console.log("" + "─".repeat(37));
  console.log("📁 PORÓWNANIE WYGENEROWANYCH PLIKÓW");
  console.log("─".repeat(37));
  console.log(`   📁 Oryginał: ${originalPath}`);
  console.log(`   📁 Wygenerowany: ${generatedPath}`);

  //: Pobierz tylko pliki z wygenerowanego projektu
  //: ------------------------------------------------------
  const generatedFiles = await getFilesFromDir(generatedPath);
  console.log(`   📦 Jest (${generatedFiles.size}) plików w projekcie`);

  const results = {
    identical: [],
    different: [],
    missing: [],
    totalCompared: 0,
  };

  //: Porównaj pliki w wygenerowanym projekcie
  //: ------------------------------------------------------
  for (const [relPath, generatedData] of generatedFiles) {
    const originalFilePath = path.join(originalPath, relPath);

    try {
      await stat(originalFilePath);
      const originalContent = await readFile(originalFilePath, "utf8");
      const originalHash = hashContent(originalContent);

      if (originalHash === generatedData.hash) {
        results.identical.push(relPath);
      } else {
        results.different.push({
          path: relPath,
          originalSize: originalContent.length,
          generatedSize: generatedData.size,
          originalHash: originalHash.substring(0, 8),
          generatedHash: generatedData.hash.substring(0, 8),
        });
      }
    }
    catch {
      results.missing.push(relPath);
    }

    results.totalCompared++;
  }

  return results;
}

//: DISPLAY RESULTS
//: -----------------------------------------
function displayResults(results) {
  // console.log("\n📊 WYNIK PORÓWNANIA");
  // console.log("─".repeat(57));
  // console.log(`   🔍 Porównano: ${results.totalCompared} plików`);
  // console.log(`   ✅ Identyczne: ${results.identical.length}`);
  // console.log(`   ⚠️  Różne: ${results.different.length}`);
  // console.log(`   ❌ Brak w oryginale: ${results.missing.length}`);
  // const successRate = ((results.identical.length / results.totalCompared) * 100).toFixed(1);
  // console.log(`   📈 Sukces: ${successRate}%`);

  if (results.different.length) {
    // console.log("\n📝 PLIKI Z RÓŻNICAMI");
    // console.log("─".repeat(57));
    console.log();
    results.different.slice(0, 10).forEach(file => {
      console.log(`   ❌ ${file.path}`);
      // console.log(`      Oryginał: ${file.originalHash} (${file.originalSize}b)`);
      // console.log(`      Wygenerowany: ${file.generatedHash} (${file.generatedSize}b)`);
    });
    if (results.different.length > 10) {
      console.log(`   ... i ${results.different.length - 10} więcej`);
    }
  }

  // if (results.missing.length) {
  //   console.log("\n🚫 PLIKI BRAKUJĄCE W ORYGINALE");
  //   console.log("─".repeat(57));
  //   results.missing.slice(0, 10).forEach(file => {
  //     console.log(`   📂 ${file}`)
  //   });
  //   if (results.missing.length > 10) {
  //     console.log(`   ... i ${results.missing.length - 10} więcej`);
  //   }
  // }

  if (results.identical.length) {
    console.log("" + "─".repeat(37));
    const diff = (results.different.length)
      ? ` ❌ RÓŻNE (${results.different.length})` : "";
    const miss = (results.missing.length)
      ? ` ❌ BRAKUJĄCE (${results.missing.length})` : "";
    console.log(`✅ IDENTYCZNE PLIKI (${results.identical.length})${diff}${miss}`);
    // console.log("" + "─".repeat(37));
  }

  if (results.different.length || results.missing.length) {
    console.log("" + "─".repeat(57));
    throw Error("COMPARISON FAILED");
  }
}

//: MAIN
//: -----------------------------------------
async function makeDiff(originalPath, generatedPath) {
  const results = await compareFiles(originalPath, generatedPath);
  displayResults(results);
  return results;
}

//: USAGE
//: -----------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const [orig, gen] = process.argv.slice(2);
  if (!orig || !gen) {
    console.log("\nUSAGE: make.diff.js <original> <generated>");
    process.exit(1);
  }
  makeDiff(orig, gen).catch(console.error);
}

export default makeDiff;
export { makeDiff };
