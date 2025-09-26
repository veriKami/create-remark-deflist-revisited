#!/usr/bin/env node
//: --------------------------------------------------------
import {
  readFile, writeFile, access, mkdir, readdir, lstat, copyFile
} from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import enquirer from "enquirer";
import $ from "ansi-colors";

const __dirname = dirname(fileURLToPath(import.meta.url));

//: --------------------------------------------------------
//: TEMPLATES
//: --------------------------------------------------------
const TEMPLATES = {
  "remark-deflist-revisited-simple": {
    name: "Simple Node.js Module",
    description: "Minimalist example without Express dependencies",
    emoji: "📦",
    color: $.green,
    commands: ["node index.js", "npm test"],
    dependencies: ["@verikami/remark-deflist-revisited", "remark", "remark-html"],
    exclude: ["•*", "Icon*", ".git", ".gitignore", "node_modules", "package-lock.json", "output.html"]
  },
  "remark-deflist-revisited-express": {
    name: "Express.js Server",
    description: "Full Node.js server with REST API endpoints",
    emoji: "⚡",
    color: $.yellow,
    commands: ["npm start", "npm run dev"],
    dependencies: ["@verikami/remark-deflist-revisited", "express", "remark", "remark-html", "dedent"],
    exclude: ["•*", "Icon*", ".git", ".gitignore", "node_modules", "package-lock.json"]
  },
  "remark-deflist-revisited-worker": {
    name: "Cloudflare Worker",
    description: "Serverless edge runtime with global deployment",
    emoji: "🚀",
    color: $.blue,
    commands: ["npm run dev", "npm run deploy"],
    dependencies: ["@verikami/remark-deflist-revisited", "remark", "remark-html", "dedent"],
    exclude: ["•*", "Icon*", ".git", ".gitignore", "node_modules", "package-lock.json", ".wrangler"]
  }
};

//: --------------------------------------------------------
//: Funkcja do kopiowania z filtrowaniem
//: --------------------------------------------------------
async function copyTemplateFiles(source, destination, excludePatterns = []) {
  try {
    await access(source);
    await mkdir(destination, { recursive: true });

    const items = await readdir(source);

    for (const item of items) {
      const shouldExclude = excludePatterns.some(pattern => {
        if (pattern.includes("*")) {
          const regex = new RegExp(pattern.replace("*", ".*"));
          return regex.test(item);
        }
        return item === pattern;
      });

      if (shouldExclude) {
        console.log($.dim(`  ↳ Skipping: ${item}`));
        continue;
      }

      const sourcePath = join(source, item);
      const destPath = join(destination, item);
      const stats = await lstat(sourcePath);

      if (stats.isDirectory()) {
        await copyTemplateFiles(sourcePath, destPath, excludePatterns);
      } else {
        await copyFile(sourcePath, destPath);
        console.log($.dim(`  ↳ Created: ${item}`));
      }
    }
  }
  catch (err) {
    throw new Error(`Failed to copy template: ${err.message}`);
  }
}

//: --------------------------------------------------------
//: Funkcja do instalacji dependencies
//: --------------------------------------------------------
async function installDependencies(projectPath, packageManager) {
  return new Promise((resolve, reject) => {
    console.log($.cyan(`\n📦 Installing dependencies with ${packageManager}...\n`));

    const command = packageManager === "pnpm" ? "pnpm install" :
      packageManager === "yarn" ? "yarn install" : "npm install";

    const installProcess = exec(command, { cwd: projectPath });

    installProcess.stdout.on("data", (data) => {
      process.stdout.write($.dim(data));
    });

    installProcess.stderr.on("data", (data) => {
      process.stderr.write($.yellow(data));
    });

    installProcess.on("close", (code) => {
      if (code === 0) {
        console.log($.green("\n✅ Dependencies installed successfully"));
        resolve();
      } else {
        reject(new Error(`\nInstallation failed with code ${code}`));
      }
    });
  });
}

//: --------------------------------------------------------
//: Promise for exec (git)
//: --------------------------------------------------------
function run(cmd, options) {
  return new Promise((resolve, reject) => {
    exec(cmd, options, (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) return reject(stderr);
      resolve(stdout);
    });
  });
}

//: --------------------------------------------------------
//: MAIN
//: --------------------------------------------------------
async function main() {
  console.log(`
  ${$.bold($.cyan("✨ Create Remark Deflist Revisited Project"))}
  ${$.dim("Scaffold a project with enhanced definition lists support")}

  ${$.yellow("Press Ctrl+C at any time to exit.")}
  `);

  try {
    //: 1. Wybór template'u z opcją exit
    //: -------------------------------------
    const { template } = await enquirer.prompt({
      type: "select",
      name: "template",
      message: $.cyan("Choose a template (or press Esc to exit):"),
      choices: [
        ...Object.entries(TEMPLATES).map(([key, config]) => ({
          name: key,
          message: `${config.emoji}  ${config.color(config.name)}`,
          hint: $.dim(config.description)
        })),
        {
          name: "exit",
          message: $.red("❌  Exit\n"),
          value: "exit"
        }
      ],
      result(value) {
        return this.find(value, "name");
      }
    });

    if (template === "exit") {
      console.log($.yellow("\n  👋  Goodbye!\n"));
      return;
    }

    //: 2. Nazwa projektu z opcją skip/exit
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
      console.log($.yellow("❌ Creation cancelled"));
      return;
    }

    //: 3. Package manager selection
    //: -------------------------------------
    const { packageManager } = await enquirer.prompt({
      type: "select",
      name: "packageManager",
      message: $.cyan("Choose package manager:"),
      choices: [
        { name: "skip", message: "⏭️  Skip installation" },
        { name: "npm", message: "📦 npm" },
        { name: "pnpm", message: "📦 pnpm (fast)" },
        { name: "yarn", message: "📦 yarn" },
      ],
      initial: "skip"
    });

    //: 4. Dodatkowe opcje z możliwością skip
    //: -------------------------------------
    const { features } = await enquirer.prompt({
      type: "multiselect",
      name: "features",
      message: $.cyan("Additional features (space to select, enter to continue):"),
      choices: [
        // { name: "skip", message: "⏭️  Skip all additional features" },
        { name: "git", message: "📚 Initialize Git repository" },
        // { name: "examples", message: "📝 Include example markdown files" },
        // { name: "readme", message: "📄 Generate README.md" },
      ],
      result(values) {
        if (values.includes("skip")) return { skip: true };
        return values.reduce((acc, value) => {
          acc[value] = true;
          return acc;
        }, {});
      }
    });

    const templateConfig = TEMPLATES[template];
    const projectPath = join(process.cwd(), projectName);

    //: Sprawdź czy folder już istnieje
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
        console.log($.yellow("❌ Creation cancelled"));
        return;
      }
    }
    catch {
      //: continue
    }

    console.log(`\n${$.cyan("📦 Creating project...\n")}`);
    console.log($.dim(`Template: ${templateConfig.name}`));
    console.log($.dim(`Location: ./${projectName}`));

    //: Kopiowanie z filtrowaniem
    //: -------------------------------------
    await copyTemplateFiles(
      join(__dirname, "templates", template),
      projectPath,
      templateConfig.exclude
    );

    //: Aktualizacja package.json
    //: -------------------------------------
    const packagePath = join(projectPath, "package.json");
    const pkg = JSON.parse(await readFile(packagePath, "utf8"));
    pkg.name = projectName;
    await writeFile(packagePath, JSON.stringify(pkg, null, 2));

    //: Instalacja dependencies jeśli nie skip
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

    //: Inicjalizacja Git jeśli wybrano (i nie skip)
    //: -------------------------------------
    if (features.git && !features.skip) {
      try {
        await run("git init -q", { cwd: projectPath });
        console.log($.green("\n📚 Git repository initialized"))
      }
      catch {
        //: continue
      }
    }

    //: Final output
    //: -------------------------------------
    console.log(`
${$.green("✅ Project created successfully")}

${$.bold("   Next steps:")}
${$.cyan(`     cd ${projectName}`)}${packageManager === "skip" ? $.cyan("\n     npm install") : ""}

${$.bold("   Available commands:")}
${templateConfig.commands.map(cmd => $.cyan(`     ${cmd}`)).join("\n")}

${$.bold("   Key files:")}
${$.dim("      index.js/server.js - Main application file")}
${$.dim("      package.json - Project configuration")}

${$.dim("   Documentation: https://github.com/veriKami/remark-deflist-revisited")}
${$.dim("   Issues: https://github.com/veriKami/remark-deflist-revisited/issues")}
    `);
  }
  catch (err) {
    if (err.message === "cancelled") {
      console.log($.yellow("👋 Goodbye!"));
    } else {
      console.error($.red("💥 Error:"), err.message);
      console.log($.dim("If this persists, please report the issue."));
    }
  }
}

//: Handle Ctrl+C gracefully
//: -----------------------------------------
process.on("SIGINT", () => {
  console.log($.yellow("\n\n👋 Goodbye!"));
  process.exit(0);
});

//: -----------------------------------------
//: ACTION

main().catch(console.error);
