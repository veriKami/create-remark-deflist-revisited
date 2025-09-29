#!/usr/bin/env node
//: --------------------------------------------------------
import { promisify } from "node:util";
import { readFile, writeFile, access, rm } from "node:fs/promises";
// import {
//   readFile, writeFile, copyFile, access, lstat, mkdir, readdir, rm
// } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import enquirer from "enquirer";
import $ from "ansi-colors";

// import { promisify } from 'node:util';
// import child_process from 'node:child_process';
// const exec = promisify(child_process.exec);
const exe = promisify(await import("node:child_process")
  .then(module => module.exec));

const __dirname = dirname(fileURLToPath(import.meta.url));

$.theme({ title: $.bold.cyan });

//: --------------------------------------------------------
//: TEMPLATES
//: --------------------------------------------------------
const TEMPLATES = {
  "remark-deflist-revisited-simple": {
    name: "Simple Node.js Module",
    description: "— Minimalist Node.js example",
    emoji: "📁",
    color: $.green,
    commands: ["npm start", "npm run dev", "npm run example", "npm test"],
    dependencies: ["@verikami/remark-deflist-revisited", "remark", "remark-html"],
    exclude: ["output.html"]
  },
  "remark-deflist-revisited-express": {
    name: "Express.js Server",
    description: "— Express.js server with REST API endpoints",
    emoji: "📁",
    color: $.green,
    commands: ["npm start", "npm run dev"],
    dependencies: ["@verikami/remark-deflist-revisited", "express", "remark", "remark-html", "dedent"],
    exclude: []
  },
  "remark-deflist-revisited-worker": {
    name: "Cloudflare Worker",
    description: "— Serverless edge runtime with global deployment",
    emoji: "📁",
    color: $.green,
    commands: ["npm run dev", "npm run deploy"],
    dependencies: ["@verikami/remark-deflist-revisited", "remark", "remark-html", "dedent"],
    exclude: [".wrangler"]
  },
  "remark-deflist-revisited-astro": {
    name: "Astro Static Site",
    description: "— Static site generation and server-side rendering",
    emoji: "📁",
    color: $.green,
    commands: ["npm run dev", "npm run build", "npm run preview"],
    dependencies: ["@verikami/remark-deflist-revisited", "astro"],
    exclude: [".astro"]
  }
};

//: --------------------------------------------------------
//: Function for copy files from bundle
//: --------------------------------------------------------
async function copyTemplateFiles(source, destination) {

  await rm(destination, { recursive: true, force: true });

  const src = basename(source).split("-").pop();
  const cmd = `node pack/bundle.${src}.js ${destination} false`;

  const { stdout, stderr } = await exe(cmd);
  console.log($.dim(stdout));
  // console.error('stderr:', stderr);
  // if (stderr) throw Error(stderr.message);
  // console.error(stderr.split("\n")[0]);
  if (stderr) throw Error(stderr.split("\n")[0]);
}

//: --------------------------------------------------------
//: Function for copy files with filter
//: --------------------------------------------------------
/*/
async function _copyTemplateFiles(source, destination, exclude = []) {
  const xclude = ["•*", "Icon*", "__*", ".codes*", ".git", "node_modules", "package-*"];
  exclude = [...xclude, ...exclude];

  try {
    await access(source);
    await rm(destination, { recursive: true, force: true });
    await mkdir(destination, { recursive: true });

    const items = await readdir(source);

    for (const item of items) {
      const shouldExclude = exclude.some(pattern => {
        if (pattern.includes("*")) {
          const regex = new RegExp(pattern.replace("*", ".*"));
          return regex.test(item);
        }
        return item === pattern;
      });

      if (shouldExclude) {
        console.log($.dim(`   ↳ Skipping: ${item}`));
        continue;
      }

      const sourcePath = join(source, item);
      const destPath = join(destination, item);
      const stats = await lstat(sourcePath);

      if (stats.isDirectory()) {
        await copyTemplateFiles(sourcePath, destPath, exclude);
      } else {
        await copyFile(sourcePath, destPath);
        console.log($.dim(`   ↳ Created: ${item}`));
      }
    }
  }
  catch (err) {
    throw new Error(`Failed to copy template: ${err.message}`);
  }
}
//*/
//: --------------------------------------------------------

//: --------------------------------------------------------
//: Promise for installing dependencies
//: --------------------------------------------------------
function installDependencies(projectPath, packageManager) {
  return new Promise((resolve, reject) => {
    console.log($.cyan(`📦 Installing dependencies with ${packageManager}...\n`));

    const command = packageManager === "pnpm" ? "pnpm install" :
      packageManager === "yarn" ? "yarn install" : "npm install";

    const install = exec(command, { cwd: projectPath });

    install.stdout.on("data", (data) => {
      process.stdout.write("   " + $.dim(data));
    });

    install.stderr.on("data", (data) => {
      process.stderr.write("   " + $.yellow(data));
    });

    install.on("close", (code) => {
      if (code === 0) {
        console.log($.green("\n✅ Dependencies installed successfully"));
        resolve();
      } else {
        reject(new Error(`\n❌ Installation failed with code ${code}`));
      }
    });
  });
}

//: --------------------------------------------------------
//: MAIN
//: --------------------------------------------------------
async function main() {
  console.log(`  ${$.magenta("─").repeat(57)}
  ${$.title("Create Remark Deflist Revisited Project")}
  ${$.magenta("─").repeat(57)}
  ${$.dim("Scaffold a project with enhanced definition lists support\n")}
  ${$.yellow("Press Ctrl+C at any time to exit\n")}`);

  try {
    //: 1. Template with exit
    //: -------------------------------------
    const { template } = await enquirer.prompt({
      type: "select",
      name: "template",
      message: $.cyan("Choose a template (or press Esc to exit):"),
      choices: [
        ...Object.entries(TEMPLATES).map(([key, config]) => ({
          name: key,
          message: `${config.emoji} ${config.color(config.name)}`,
          hint: $.dim(config.description)
        })),
        {
          name: "exit",
          message: $.yellow("❌ Exit\n"),
          value: "exit"
        }
      ],
      result(value) {
        return this.find(value, "name");
      }
    });

    if (template === "exit") {
      console.log($.yellow("\n  🍋 Goodbye!\n"));
      return;
    }

    //: 2. Project name with skip/exit
    //: -------------------------------------
    const { projectName } = await enquirer.prompt({
      type: "input",
      name: "projectName",
      message: $.cyan("Project name (or type \"skip\" to cancel):"),
      initial: template,
      validate(value) {
        if (value.toLowerCase() === "skip") return true;
        if (!value.trim()) return "Project name is required";
        if (/[^a-z0-9-]/i.test(value)) return "Use only letters, numbers and hyphens";
        return true;
      }
    });

    if (projectName.toLowerCase() === "skip") {
      console.log($.yellow("\n❌ Creation cancelled"));
      return;
    }

    //: 3. Package manager selection
    //: -------------------------------------
    const { packageManager } = await enquirer.prompt({
      type: "select",
      name: "packageManager",
      message: $.cyan("Choose package manager:"),
      choices: [
        { name: "skip", message: `🍋 ${$.yellow("Skip packages installation")}`},
        { name: "npm", message: "📦 npm" },
        { name: "pnpm", message: "📦 pnpm" },
        { name: "yarn", message: "📦 yarn" },
      ],
      initial: "skip"
    });

    //: 4. Additional options with skip
    //: -------------------------------------
    const { features } = await enquirer.prompt({
      type: "select",
      name: "features",
      message: $.cyan("Additional features:"),
      choices: [
        { name: "skip", message: `🍋 ${$.yellow("Skip additional features")}`},
        { name: "git", message: "⛺️ Initialize Git repository" }
      ],
      //: @ multiselect
      // result(values) {
      //   if (values.includes("skip")) return { skip: true };
      //   return values.reduce((acc, value) => {
      //     acc[value] = true;
      //     return acc;
      //   }, {});
      // }
    });

    const templateConfig = TEMPLATES[template];
    const projectPath = join(process.cwd(), projectName);

    //: Check if folder exists
    //: -------------------------------------
    try {
      await access(projectPath);
      const { overwrite } = await enquirer.prompt({
        type: "confirm",
        name: "overwrite",
        message: $.yellow(`Directory "${projectName}" already exists. Overwrite?`),
        initial: false
      });

      if (!overwrite) {
        console.log($.yellow("\n❌ Creation cancelled"));
        return;
      }
    }
    catch {
      //: continue
    }

    console.log(`\n${$.cyan("📦 Creating project...\n")}`);
    console.log($.dim(`   Template: ${templateConfig.name}`));
    console.log($.dim(`   Location: ./${projectName}\n`));

    //: Copy with filter
    //: -------------------------------------
    await copyTemplateFiles(
      join(__dirname, "templates", template),
      projectPath,
      templateConfig.exclude
    );

    //: Actual package.json
    //: -------------------------------------
    const packagePath = join(projectPath, "package.json");
    const pkg = JSON.parse(await readFile(packagePath, "utf8"));
    pkg.name = projectName;

    await writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n");

    //: Install dependencies
    //: -------------------------------------
    if (packageManager !== "skip") {
      try {
        await installDependencies(projectPath, packageManager);
      }
      catch {
        console.log($.yellow("⚠️  Installation failed, but project was created."));
        console.log($.dim(`You can install manually with: cd ${projectName} && ${packageManager} install`));
      }
    }

    //: Git init
    //: -------------------------------------
    //: @ multiselect
    //: if (features.git && !features.skip) {
    if (features === "git") {
      try {
        await exe("git init -q", { cwd: projectPath });
        console.log($.green("✅ Git repository initialized"))
      }
      catch {
        //: continue
      }
    }

    //: Final output
    //: -------------------------------------
    console.log(`${$.green("✅ Project created successfully")}`);
    console.log(`
${$.bold("   Next steps:")}
${$.cyan(`     cd ${projectName}`)}${packageManager === "skip" ? $.cyan("\n     npm install") : ""}

${$.bold("   Available commands:")}
${templateConfig.commands.map(cmd => $.cyan(`     ${cmd}`)).join("\n")}

${$.dim("   Documentation: https://github.com/veriKami/remark-deflist-revisited")}
${$.dim("   Issues: https://github.com/veriKami/remark-deflist-revisited/issues")}
    `);
  }
  catch (err) {
    if (err.message === "cancelled") {
      console.log($.yellow("\n🍋 Goodbye!"));
    } else if (err.message) {
      console.error($.red("\n❌ Error:"), err.message);
      console.log($.dim("If this persists, please report the issue."));
    } else {
      process.exit(0);
    }
  }
}

//: -----------------------------------------
//: Handle Ctrl+C

process.on("SIGINT", () => {
  console.log($.yellow("\n\n🍋 Goodbye!"));
  process.exit(0);
});

//: -----------------------------------------
//: ACTION

main().catch(console.error);
