// file: patch-cli.js

import fs from "fs/promises";
import path from "path";
import { parse } from "@babel/parser";
import generate from "@babel/generator";
import { patchASTWithValidation } from "./patches/validationPatch.js";
import { patchASTWithContextLowRemoval } from "./patches/contextLowPatch.js";

// 主执行函数
async function main() {
  const TARGET_FILE = process.argv[2] || "cli.js";
  const filePath = path.resolve(process.cwd(), TARGET_FILE);

  try {
    // --- 1. 读取文件 ---
    console.log(`Reading file: ${filePath}`);
    const sourceCode = await fs.readFile(filePath, "utf8");

    // --- 2. 解析为 AST ---
    // 添加 errorRecovery: true 使其对语法错误有更好的容忍度
    const ast = parse(sourceCode, {
      sourceType: "module",
      errorRecovery: true,
    });

    // --- 3. 使用注入函数修改 AST ---
    const { ast: modifiedAstv, wasModifiedv } = patchASTWithValidation(ast);
    const { ast: modifiedAstcl, wasModifiedcl } =
      patchASTWithContextLowRemoval(modifiedAstv);

    // --- 4. 写回文件 (如果已修改) ---
    console.log("Generating modified code...");
    const { code } = generate(modifiedAstcl, {
      /* options */
    });

    await fs.writeFile(filePath, code, "utf8");
    console.log(`Successfully updated ${TARGET_FILE}!`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`Error: File not found at ${filePath}`);
    } else {
      console.error("An unexpected error occurred:", error);
    }
    process.exit(1); // 退出并返回错误码
  }
}

// 运行主函数
main();
