#!/usr/bin/env bun

import fs from "fs/promises";
import path from "path";
import { parse } from "@babel/parser";
import generate from "@babel/generator";
import { patchASTWithValidation } from "./patches/validationPatch.js";
import { patchASTWithContextLowRemoval } from "./patches/contextLowPatch.js";
import { patchASTWithEscInterruptRemoval } from "./patches/escInterruptPatch.js";
import { readConfig, getAvailablePatches } from "./lib/config.js";
import { interactivePatchConfig, interactiveRestore } from "./lib/interactive.js";
import { createBackup } from "./lib/backup.js";

// 显示帮助信息
function showHelp() {
  console.log(`
ccpatch - Claude Code 补丁工具

用法:
  ccpatch <文件路径>         应用配置的补丁到指定文件
  ccpatch config            配置要启用的补丁和默认文件路径(可选)
  ccpatch restore [文件]    恢复文件备份(交互式选择)

选项:
  -h, --help               显示此帮助信息
  -v, --version            显示版本信息
  -p, --patches <patch...> 指定要应用的补丁 (忽略配置文件设置)

可用补丁:
  validationPatch          验证补丁 - 绕过模型名称验证
  contextLowPatch          上下文补丁 - 移除上下文低提示
  escInterruptPatch        中断补丁 - 移除或修改 'esc to interrupt' 显示

示例:
  ccpatch /path/to/cli.js                           对指定文件应用已配置的补丁
  ccpatch config                                    进入交互式配置模式
  ccpatch restore /path/to/cli.js                   恢复文件到之前的备份
  ccpatch -p validationPatch /path/to/cli.js       仅应用验证补丁
  ccpatch -p validationPatch,contextLowPatch cli.js 应用多个补丁

注意:
  - 如果设置了默认路径，可以直接运行 ccpatch (无参数)
  - 使用 -p 选项时会忽略配置文件中的补丁设置
  - 多个补丁可以用逗号分隔或多次使用 -p 选项
  - 应用补丁时会自动创建备份到 ~/.ccpatch/backup/ 目录
`);
}

// 显示版本信息
function showVersion() {
  console.log("ccpatch v1.0.2");
}

// 解析命令行参数
function parseArguments(args) {
  const result = {
    patches: [],
    targetFile: null,
    isConfig: false,
    isRestore: false,
    isHelp: false,
    isVersion: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      result.isHelp = true;
    } else if (arg === "-v" || arg === "--version") {
      result.isVersion = true;
    } else if (arg === "config") {
      result.isConfig = true;
    } else if (arg === "restore") {
      result.isRestore = true;
      // restore命令后面可能跟文件路径
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        result.targetFile = args[i + 1];
        i++;
      }
    } else if (arg === "-p" || arg === "--patches") {
      // 下一个参数应该是补丁列表
      if (i + 1 < args.length) {
        const patchesStr = args[i + 1];
        const patches = patchesStr.split(",").map(p => p.trim()).filter(p => p);
        result.patches.push(...patches);
        i++; // 跳过下一个参数
      }
    } else if (!arg.startsWith("-") && !result.targetFile && !result.isConfig && !result.isRestore) {
      // 第一个非选项参数作为目标文件
      result.targetFile = arg;
    }
  }

  return result;
}

// 验证补丁名称
function validatePatches(patches) {
  const availablePatches = getAvailablePatches();
  const validPatchNames = availablePatches.map(p => p.name);
  const invalidPatches = patches.filter(p => !validPatchNames.includes(p));

  if (invalidPatches.length > 0) {
    console.error(`❌ 无效的补丁名称: ${invalidPatches.join(", ")}`);
    console.error(`可用补丁: ${validPatchNames.join(", ")}`);
    return false;
  }

  return true;
}

// 应用补丁到文件
async function applyPatches(filePath, enabledPatches) {
  try {
    // --- 1. 创建备份 ---
    console.log("Creating backup...");
    await createBackup(filePath);

    // --- 2. 读取文件 ---
    console.log(`Reading file: ${filePath}`);
    const sourceCode = await fs.readFile(filePath, "utf8");

    // --- 3. 解析为 AST ---
    console.log("Parsing AST...");
    const ast = parse(sourceCode, {
      sourceType: "module",
      errorRecovery: true,
    });

    let modifiedAst = ast;
    let hasModifications = false;

    // --- 4. 根据启用的补丁应用 ---
    if (enabledPatches.includes("validationPatch")) {
      console.log("Applying validation patch...");
      const { ast: newAst, wasModified } = patchASTWithValidation(modifiedAst);
      modifiedAst = newAst;
      hasModifications = hasModifications || wasModified;
    }

    if (enabledPatches.includes("contextLowPatch")) {
      console.log("Applying context low patch...");
      const { ast: newAst, wasModified } = patchASTWithContextLowRemoval(modifiedAst);
      modifiedAst = newAst;
      hasModifications = hasModifications || wasModified;
    }

    if (enabledPatches.includes("escInterruptPatch")) {
      console.log("Applying esc interrupt patch...");
      const { ast: newAst, wasModified } = patchASTWithEscInterruptRemoval(modifiedAst);
      modifiedAst = newAst;
      hasModifications = hasModifications || wasModified;
    }

    // --- 5. 生成并写回文件 ---
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
  const parsedArgs = parseArguments(args);

  // 处理帮助和版本参数
  if (parsedArgs.isHelp) {
    showHelp();
    return;
  }

  if (parsedArgs.isVersion) {
    showVersion();
    return;
  }

  // 处理config子命令
  if (parsedArgs.isConfig) {
    await interactivePatchConfig();
    return;
  }

  // 处理restore子命令
  if (parsedArgs.isRestore) {
    const config = await readConfig();
    const targetFile = parsedArgs.targetFile || config.cliPath;

    if (!targetFile) {
      console.log("❌ 请提供文件路径或在配置中设置默认路径:");
      console.log("   ccpatch restore <文件路径>");
      console.log("   或运行 'ccpatch config' 设置默认路径");
      return;
    }

    const filePath = path.resolve(process.cwd(), targetFile);
    await interactiveRestore(filePath);
    return;
  }

  // 如果指定了补丁选项，验证补丁名称
  if (parsedArgs.patches.length > 0) {
    if (!validatePatches(parsedArgs.patches)) {
      process.exit(1);
    }
  }

  // 读取配置
  const config = await readConfig();

  // 如果是首次运行（配置文件不存在），自动进入配置页面
  if (config.isNewConfig && parsedArgs.patches.length === 0) {
    console.log("🔧 检测到首次运行，正在启动配置向导...");
    await interactivePatchConfig();
    console.log("\n配置完成！现在可以使用 ccpatch <文件路径> 对文件应用补丁了。");
    return;
  }

  // 确定要使用的补丁列表：CLI指定的补丁优先于配置文件
  const enabledPatches = parsedArgs.patches.length > 0
    ? parsedArgs.patches
    : config.enabledPatches;

  if (enabledPatches.length === 0) {
    console.log("⚠️  No patches are enabled. Run 'ccpatch config' to configure patches or use -p option to specify patches.");
    return;
  }

  // 确定目标文件路径
  const TARGET_FILE = parsedArgs.targetFile || config.cliPath;
  if (!TARGET_FILE) {
    console.log("❌ 请提供文件路径或在配置中设置默认路径:");
    console.log("   ccpatch <文件路径>");
    console.log("   ccpatch -p <补丁名> <文件路径>");
    console.log("   或运行 'ccpatch config' 设置默认路径");
    return;
  }

  const filePath = path.resolve(process.cwd(), TARGET_FILE);

  // 显示使用的补丁来源
  if (parsedArgs.patches.length > 0) {
    console.log(`Using CLI-specified patches: ${enabledPatches.join(", ")}`);
  } else {
    console.log(`Using configured patches: ${enabledPatches.join(", ")}`);
  }

  await applyPatches(filePath, enabledPatches);
}

// 运行主函数
main();
