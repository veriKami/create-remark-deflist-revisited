#!/usr/bin/env node
//: --------------------------------------------------------
//: make.bundle.js
//: --------------------------------------------------------
import { readFile, writeFile, readdir, stat } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);

/** export **********************************
 */
async function makeBundle(projectPath, outputFile, $ = false) {
  const n = $ ? "\n" : "";

  console.log("\n" + "─".repeat(57));
  console.log(`🚺 TARGET: ${outputFile}`);
  console.log("" + "─".repeat(57));
  console.log(`📦 Packing: ${projectPath}${n}`);

  const files = await collectFiles(projectPath, "", undefined, $);
  const bundle = generateBundle(files, outputFile);

  await writeFile(outputFile, bundle, "utf8");
  console.log(`${n}📦 Created: ${outputFile} (${files.size} plików)`);
}

async function collectFiles(dir, relative = "", files = new Map(), $ = false) {
  const items = await readdir(dir);

  const exclude = [
    ".DS_Store",
    "Icon\r",
    "__*",
    "•*",
    "node_modules",
    "package-*",
    ".codesandbox",
    // ".vscode",
    ".wrangler",
    ".astro",
    ".git",
    "dist",
    "output.html",
  ];

  //: Konwersja patternów na regex
  //: Zamień * na .* i escape'uj inne znaki
  //: ---------------------------------------
  const patterns = exclude.map(pattern => {
    const regexPattern = pattern
      .split("*")
      .map(part => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${regexPattern}$`);
    // Escape specjalnych znaków regex, ale nie *
    // const escaped = pattern
    //   .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    //   .replace(/\*/g, ".*");
    // return new RegExp(`^${escaped}$`);
  });

  // Funkcja sprawdzająca czy ścieżka powinna być wykluczona
  //: ---------------------------------------
  function isExcluded(itemName, fullPath) {
    return patterns.some(rx =>
        rx.test(itemName) ||
        rx.test(fullPath) ||
        fullPath.split(path.sep).some(part => rx.test(part))
    );
  }

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relPath = path.join(relative, item);

    if (isExcluded(item, relPath)) {
      // console.log(`   🚺 Pominięto: ${relPath}`)
      continue;
    }

    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      await collectFiles(fullPath, relPath, files, $);
    } else {
      const content = await readFile(fullPath, "utf8");
      files.set(relPath, content);
      if ($) console.log(`   ✅ ${relPath}`);
    }
  }
  return files;
}

function generateBundle(files, outputFile = "bundle.js") {
  const filesObj = Object.fromEntries(files);
  //: ---------------------------------------
  // function escapeContent(filesObj) {
  //   const escaped = {};
  //   for (const [key, value] of Object.entries(filesObj)) {
  //     escaped[key] = value.replace(/\\/g, "\\\\") // escapowanie backslashy
  //   }
  //   return escaped;
  // }
  //: const escapedFiles = escapeContent(filesObj);
  //: ---------------------------------------
  const escapedFiles = filesObj;

  //: Default Path
  //: ---------------------------------------
  const defaultPath = outputFile
    .replace(/.*\.(.*)\.js$/, "remark-deflist-revisited-$1");

  return `import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const files = ${JSON.stringify(escapedFiles, null, 2)};

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  }
  catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

async function generate(target = ".", $ = true) {
  if ($) console.log("\\n🚺 CREATING PROJECT\\n");
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(target, filePath);
    await ensureDir(path.dirname(fullPath));
    await writeFile(fullPath, content);
    if ($) console.log("   📄", filePath)
    else console.log("   ↳ Created:", filePath)
  }
  if ($) console.log("\\n✅ PROJECT READY");
}

if (import.meta.url.endsWith(process.argv[1])) {
  if (!process.argv[2]) {
    console.log("\\nUSAGE: node ${outputFile} <path>");
    console.log("USING (default): ${defaultPath}");
  }
  const target = process.argv[2] || "${defaultPath}";
  const $ = process.argv[3] === "false" ? false : true;
  generate(target, $).catch(console.error);
}

export default generate;
`;
}

//: USAGE
//: -----------------------------------------
if (process.argv[1] === __filename) {
  const projectPath = process.argv[2];
  const name = process.argv[2] ? process.argv[2].split("-").pop() : "_";
  const outputFile = process.argv[3] || `bundle.${name}.js`;
  if (!projectPath) {
    console.log("\nUSAGE: make.bundle.js <project-path> [output-file]");
    process.exit(1);
  }
  makeBundle(projectPath, outputFile).catch(console.error);
}

export default makeBundle;
export { makeBundle };
