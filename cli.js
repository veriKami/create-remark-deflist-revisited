#!/usr/bin/env node
//: --------------------------------------------------------
import {
  readFile, writeFile, access, mkdir, readdir, lstat, copyFile
} from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import enquirer from "enquirer";
import colors from "ansi-colors";
import { exec } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

//: --------------------------------------------------------
//: TEMPLATES
//: --------------------------------------------------------
const TEMPLATES = {
  "remark-deflist-revisited-simple": {
    name: "Simple Node.js Module",
    description: "Minimalist example without Express dependencies",
    emoji: "📦",
    color: colors.green,
    commands: ["node index.js", "npm test"],
    dependencies: ["@verikami/remark-deflist-revisited", "remark", "remark-html"],
    exclude: ["•*", "Icon*", ".git", "node_modules", "package-lock.json", "output.html"]
  },
  "remark-deflist-revisited-express": {
    name: "Express.js Server",
    description: "Full Node.js server with REST API endpoints",
    emoji: "⚡",
    color: colors.yellow,
    commands: ["npm start", "npm run dev"],
    dependencies: ["@verikami/remark-deflist-revisited", "express", "remark", "remark-html", "dedent"],
    exclude: ["•*", "Icon*", ".git", "node_modules", "package-lock.json"]
  },
  "remark-deflist-revisited-worker": {
    name: "Cloudflare Worker",
    description: "Serverless edge runtime with global deployment",
    emoji: "🚀",
    color: colors.blue,
    commands: ["npm run dev", "npm run deploy"],
    dependencies: ["@verikami/remark-deflist-revisited", "remark", "remark-html", "dedent"],
    exclude: ["•*", "Icon*", ".git", "node_modules", "package-lock.json", ".wrangler"]
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
        console.log(colors.dim(`  ↳ Skipping: ${item}`));
        continue;
      }

      const sourcePath = join(source, item);
      const destPath = join(destination, item);
      const stats = await lstat(sourcePath);

      if (stats.isDirectory()) {
        await copyTemplateFiles(sourcePath, destPath, excludePatterns);
      } else {
        await copyFile(sourcePath, destPath);
        console.log(colors.dim(`  ↳ Created: ${item}`));
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
    console.log(colors.cyan(`\n📦 Installing dependencies with ${packageManager}...`));

    const command = packageManager === "pnpm" ? "pnpm install" :
      packageManager === "yarn" ? "yarn install" : "npm install";

    const installProcess = exec(command, { cwd: projectPath });

    installProcess.stdout.on("data", (data) => {
      process.stdout.write(colors.dim(data));
    });

    installProcess.stderr.on("data", (data) => {
      process.stderr.write(colors.yellow(data));
    });

    installProcess.on("close", (code) => {
      if (code === 0) {
        console.log(colors.green("✅ Dependencies installed successfully!"));
        resolve();
      } else {
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
  });
}

//: --------------------------------------------------------
//: MAIN
//: --------------------------------------------------------
async function main() {
  console.log(`
  ${colors.bold(colors.cyan("✨ Create Remark Deflist Revisited Project"))}
  ${colors.dim("Scaffold a project with enhanced definition lists support")}

  ${colors.yellow("Press Ctrl+C at any time to exit.")}
  `);

  try {
    // 1. Wybór template'u z opcją exit
    //: -------------------------------------
    const { template } = await enquirer.prompt({
      type: "select",
      name: "template",
      message: colors.cyan("Choose a template (or press Esc to exit):"),
      choices: [
        ...Object.entries(TEMPLATES).map(([key, config]) => ({
          name: key,
          message: `${config.emoji}  ${config.color(config.name)}`,
          hint: colors.dim(config.description)
        })),
        {
          name: "exit",
          message: colors.red("❌ Exit"),
          value: "exit"
        }
      ],
      result(value) {
        return this.find(value, "name");
      }
    });

    if (template === "exit") {
      console.log(colors.yellow("👋 Goodbye!"));
      return;
    }

    // 2. Nazwa projektu z opcją skip/exit
    //: -------------------------------------
    const { projectName } = await enquirer.prompt({
      type: "input",
      name: "projectName",
      message: colors.cyan("Project name (or type \"skip\" to cancel):"),
      // initial: 'my-remark-project',
      initial: template,
      validate(value) {
        if (value.toLowerCase() === "skip") return true;
        if (!value.trim()) return "Project name is required";
        if (/[^a-z0-9-]/i.test(value)) return "Use only letters, numbers and hyphens";
        return true;
      }
    });

    if (projectName.toLowerCase() === "skip") {
      console.log(colors.yellow("❌ Creation cancelled"));
      return;
    }

    // 3. Package manager selection
    //: -------------------------------------
    const { packageManager } = await enquirer.prompt({
      type: "select",
      name: "packageManager",
      message: colors.cyan("Choose package manager:"),
      choices: [
        { name: "skip", message: "⏭️  Skip installation" },
        { name: "npm", message: "📦 npm" },
        { name: "pnpm", message: "📦 pnpm (fast)" },
        { name: "yarn", message: "📦 yarn" },
      ],
      initial: "skip"
    });

    // 4. Dodatkowe opcje z możliwością skip
    //: -------------------------------------
    const { features } = await enquirer.prompt({
      type: "multiselect",
      name: "features",
      message: colors.cyan("Additional features (space to select, enter to continue):"),
      choices: [
        { name: "skip", message: "⏭️  Skip all additional features" },
        { name: "git", message: "📚 Initialize Git repository" },
        { name: "examples", message: "📝 Include example markdown files" },
        { name: "readme", message: "📄 Generate README.md" },
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

    // Sprawdź czy folder już istnieje
    //: -------------------------------------
    try {
      await access(projectPath);
      const { overwrite } = await enquirer.prompt({
        type: "confirm",
        name: "overwrite",
        message: colors.yellow(`Directory "${projectName}" already exists. Overwrite?`),
        initial: false
      });

      if (!overwrite) {
        console.log(colors.yellow("❌ Creation cancelled"));
        return;
      }
    } catch (error) {
      // Folder nie istnieje - kontynuuj
    }

    console.log(`\n${colors.cyan("📦 Creating project...")}`);
    console.log(colors.dim(`Template: ${templateConfig.name}`));
    console.log(colors.dim(`Location: ./${projectName}`));

    // Kopiowanie z filtrowaniem
    //: -------------------------------------
    await copyTemplateFiles(
      join(__dirname, "templates", template),
      projectPath,
      templateConfig.exclude
    );

    // Aktualizacja package.json
    //: -------------------------------------
    const packagePath = join(projectPath, "package.json");
    const pkg = JSON.parse(await readFile(packagePath, "utf8"));
    pkg.name = projectName;
    await writeFile(packagePath, JSON.stringify(pkg, null, 2));

    // Inicjalizacja Git jeśli wybrano (i nie skip)
    //: -------------------------------------
    if (features.git && !features.skip) {
      const { exec } = await import("child_process");
      exec("git init", { cwd: projectPath }, (error) => {
        if (!error) {
          console.log(colors.green("📚 Git repository initialized"));
        }
      });
    }

    // Instalacja dependencies jeśli nie skip
    //: -------------------------------------
    if (packageManager !== "skip") {
      try {
        await installDependencies(projectPath, packageManager);
      } catch (error) {
        console.log(colors.yellow("⚠️  Installation failed, but project was created."));
        console.log(colors.dim(`You can install manually with: cd ${projectName} && ${packageManager} install`));
      }
    }

    // Final output
    //: -------------------------------------
    console.log(`
${colors.green("✅ Project created successfully!")}

${colors.bold("Next steps:")}
${colors.cyan(`  cd ${projectName}`)}${packageManager === "skip" ? colors.cyan("\n  npm install") : ""}

${colors.bold("Available commands:")}
${templateConfig.commands.map(cmd => colors.cyan(`  ${cmd}`)).join("\n")}

${colors.bold("Key files:")}
${colors.dim("  index.js/server.js - Main application file")}
${colors.dim("  package.json - Project configuration")}

${colors.dim("Documentation: https://github.com/veriKami/remark-deflist-revisited")}
${colors.dim("Issues: https://github.com/veriKami/remark-deflist-revisited/issues")}
    `);

  } catch (error) {
    if (error.message === "cancelled") {
      console.log(colors.yellow("👋 Goodbye!"));
    } else {
      console.error(colors.red("💥 Error:"), error.message);
      console.log(colors.dim("If this persists, please report the issue."));
    }
  }
}

// Handle Ctrl+C gracefully
//: -----------------------------------------
process.on("SIGINT", () => {
  console.log(colors.yellow("\n\n👋 Goodbye!"));
  process.exit(0);
});

//: -----------------------------------------
//: ACTION

main().catch(console.error);
