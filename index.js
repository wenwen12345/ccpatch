#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { parse } from "@babel/parser";
import generate from "@babel/generator";
import { patchASTWithValidation } from "./patches/validationPatch.js";
import { patchASTWithContextLowRemoval } from "./patches/contextLowPatch.js";
import { patchASTWithEscInterruptRemoval } from "./patches/escInterruptPatch.js";
import { readConfig } from "./lib/config.js";
import { interactivePatchConfig } from "./lib/interactive.js";

// 显示帮助信息
function showHelp() {
  console.log(`
ccpatch - Claude Code 补丁工具

用法:
  ccpatch [文件名]           应用配置的补丁到指定文件
  ccpatch config            配置要启用的补丁

选项:
  -h, --help               显示此帮助信息
  -v, --version            显示版本信息

示例:
  ccpatch cli.js           对 cli.js 应用已配置的补丁
  ccpatch config           进入交互式配置模式
`);
}

// 显示版本信息
function showVersion() {
  console.log("ccpatch v1.0.0");
}

// 应用补丁到文件
async function applyPatches(filePath, config) {
  try {
    // --- 1. 读取文件 ---
    console.log(`Reading file: ${filePath}`);
    const sourceCode = await fs.readFile(filePath, "utf8");

    // --- 2. 解析为 AST ---
    console.log("Parsing AST...");
    const ast = parse(sourceCode, {
      sourceType: "module",
      errorRecovery: true,
    });

    let modifiedAst = ast;
    let hasModifications = false;

    // --- 3. 根据配置应用补丁 ---
    if (config.enabledPatches.includes("validationPatch")) {
      console.log("Applying validation patch...");
      const { ast: newAst, wasModified } = patchASTWithValidation(modifiedAst);
      modifiedAst = newAst;
      hasModifications = hasModifications || wasModified;
    }

    if (config.enabledPatches.includes("contextLowPatch")) {
      console.log("Applying context low patch...");
      const { ast: newAst, wasModified } = patchASTWithContextLowRemoval(modifiedAst);
      modifiedAst = newAst;
      hasModifications = hasModifications || wasModified;
    }

    if (config.enabledPatches.includes("escInterruptPatch")) {
      console.log("Applying esc interrupt patch...");
      const { ast: newAst, wasModified } = patchASTWithEscInterruptRemoval(modifiedAst);
      modifiedAst = newAst;
      hasModifications = hasModifications || wasModified;
    }

    // --- 4. 生成并写回文件 ---
    if (hasModifications) {
      console.log("Generating modified code...");
      const { code } = generate(modifiedAst);
      await fs.writeFile(filePath, code, "utf8");
      console.log(`✓ Successfully updated ${path.basename(filePath)}!`);
    } else {
      console.log("No patches were applied (no modifications needed).");
    }

  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`Error: File not found at ${filePath}`);
    } else {
      console.error("An unexpected error occurred:", error);
    }
    process.exit(1);
  }
}

// 主执行函数
async function main() {
  const args = process.argv.slice(2);

  // 处理帮助和版本参数
  if (args.includes("-h") || args.includes("--help")) {
    showHelp();
    return;
  }

  if (args.includes("-v") || args.includes("--version")) {
    showVersion();
    return;
  }

  // 处理config子命令
  if (args[0] === "config") {
    await interactivePatchConfig();
    return;
  }

  // 处理文件补丁
  const TARGET_FILE = args[0] || "cli.js";
  const filePath = path.resolve(process.cwd(), TARGET_FILE);

  // 读取配置
  const config = await readConfig();

  // 如果是首次运行（配置文件不存在），自动进入配置页面
  if (config.isNewConfig) {
    console.log("🔧 检测到首次运行，正在启动配置向导...");
    await interactivePatchConfig();
    console.log("\n配置完成！现在可以使用 ccpatch 对文件应用补丁了。");
    return;
  }

  if (config.enabledPatches.length === 0) {
    console.log("⚠️  No patches are enabled. Run 'ccpatch config' to configure patches.");
    return;
  }

  console.log(`Enabled patches: ${config.enabledPatches.join(", ")}`);
  await applyPatches(filePath, config);
}

// 运行主函数
main();
