import readline from "readline";
import fs from "fs/promises";
import pc from "picocolors";
import { readConfig, writeConfig, getAvailablePatches } from "./config.js";
import { listBackups, restoreBackup, formatSize, formatDateTime } from "./backup.js";

/**
 * 创建readline接口
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 询问用户问题并获取答案
 */
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * 验证文件路径是否存在
 */
async function validateFilePath(filePath) {
  if (!filePath || !filePath.trim()) {
    return { valid: true, message: "" }; // 空路径允许（清除路径）
  }

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return { valid: false, message: "路径存在但不是文件" };
    }
    return { valid: true, message: "" };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { valid: false, message: "文件不存在" };
    }
    return { valid: false, message: `无法访问文件: ${error.message}` };
  }
}

/**
 * 显示标题栏
 */
function displayHeader() {
  console.log("\n" + pc.cyan("━".repeat(60)));
  console.log(pc.bold(pc.cyan("  ccpatch 补丁配置工具")));
  console.log(pc.cyan("━".repeat(60)));
}

/**
 * 显示配置摘要
 */
function displayConfigSummary(patches, currentConfig) {
  const enabledCount = currentConfig.enabledPatches.length;
  const totalCount = patches.length;

  console.log("\n" + pc.bold("当前配置状态:"));
  console.log(`  已启用补丁: ${pc.green(enabledCount)}/${totalCount}`);

  if (currentConfig.cliPath) {
    console.log(`  默认路径: ${pc.blue(currentConfig.cliPath)}`);
  } else {
    console.log(`  默认路径: ${pc.yellow("(未设置)")}`);
  }
}

/**
 * 显示可用的patch列表
 */
function displayPatches(patches, currentConfig) {
  console.log("\n" + pc.bold("可用补丁列表:"));
  console.log(pc.dim("─".repeat(60)));

  patches.forEach((patch, index) => {
    const isEnabled = currentConfig.enabledPatches.includes(patch.name);
    const status = isEnabled
      ? pc.green("✓ 已启用")
      : pc.dim("✗ 未启用");
    const number = pc.cyan(`${index + 1}.`);
    console.log(`  ${number} ${patch.name}`);
    console.log(`     ${pc.dim(patch.description)} ${status}`);
  });

  console.log(pc.dim("─".repeat(60)));
  console.log(`  ${pc.cyan(`${patches.length + 1}.`)} ${pc.yellow("设置默认文件路径")}`);
  console.log(pc.dim("─".repeat(60)));
}

/**
 * 显示操作菜单
 */
function displayMenu() {
  console.log("\n" + pc.bold("快捷操作:"));
  console.log(`  ${pc.cyan("0")}     - 保存并退出`);
  console.log(`  ${pc.cyan("q")}     - 放弃更改并退出`);
  console.log(`  ${pc.cyan("a")}     - 全部启用`);
  console.log(`  ${pc.cyan("n")}     - 全部禁用`);
  console.log(`  ${pc.cyan("r")}     - 反选`);
  console.log(`  ${pc.dim("提示: 可输入多个编号(用逗号分隔)，如: 1,3,4")}`);
}

/**
 * 处理快捷操作
 */
function handleShortcutAction(action, patches, config) {
  switch (action.toLowerCase()) {
    case "a": // 全部启用
      config.enabledPatches = patches.map(p => p.name);
      console.log(pc.green("\n✓ 已启用全部补丁"));
      return true;
    case "n": // 全部禁用
      config.enabledPatches = [];
      console.log(pc.yellow("\n✗ 已禁用全部补丁"));
      return true;
    case "r": // 反选
      const allPatchNames = patches.map(p => p.name);
      const enabledSet = new Set(config.enabledPatches);
      config.enabledPatches = allPatchNames.filter(name => !enabledSet.has(name));
      console.log(pc.blue("\n↔ 已反选所有补丁"));
      return true;
    default:
      return false;
  }
}

/**
 * 处理补丁切换
 */
function handlePatchToggle(choiceNum, patches, config) {
  if (choiceNum >= 1 && choiceNum <= patches.length) {
    const selectedPatch = patches[choiceNum - 1];
    const isCurrentlyEnabled = config.enabledPatches.includes(selectedPatch.name);

    if (isCurrentlyEnabled) {
      // 禁用补丁
      config.enabledPatches = config.enabledPatches.filter(
        name => name !== selectedPatch.name
      );
      console.log(pc.yellow(`  ✗ 已禁用: ${selectedPatch.name}`));
    } else {
      // 启用补丁
      config.enabledPatches.push(selectedPatch.name);
      console.log(pc.green(`  ✓ 已启用: ${selectedPatch.name}`));
    }
    return true;
  }
  return false;
}

/**
 * 处理路径设置
 */
async function handlePathSetting(rl, config) {
  const newPath = await askQuestion(
    rl,
    pc.cyan("\n请输入文件的完整路径 (留空清除当前路径): ")
  );

  if (newPath.trim()) {
    // 验证路径
    const validation = await validateFilePath(newPath.trim());
    if (!validation.valid) {
      console.log(pc.red(`✗ 路径验证失败: ${validation.message}`));
      const confirm = await askQuestion(
        rl,
        pc.yellow("是否仍要保存此路径? (y/n): ")
      );
      if (confirm.toLowerCase() !== "y") {
        console.log(pc.dim("已取消路径设置"));
        return;
      }
    }

    config.cliPath = newPath.trim();
    console.log(pc.green(`✓ 已设置默认路径: ${config.cliPath}`));
  } else {
    config.cliPath = "";
    console.log(pc.yellow("✓ 已清除默认路径"));
  }
}

/**
 * 交互式备份恢复界面
 */
export async function interactiveRestore(filePath) {
  const rl = createReadlineInterface();

  try {
    console.log("\n" + pc.cyan("━".repeat(60)));
    console.log(pc.bold(pc.cyan("  ccpatch 备份恢复工具")));
    console.log(pc.cyan("━".repeat(60)));

    console.log(pc.dim(`\n正在查找备份: ${filePath}`));

    // 获取备份列表
    const backups = await listBackups(filePath);

    if (backups.length === 0) {
      console.log(pc.yellow("\n⚠️  未找到任何备份文件"));
      console.log(pc.dim("提示: 运行 ccpatch <文件> 应用补丁时会自动创建备份\n"));
      return;
    }

    console.log(pc.green(`\n✓ 找到 ${backups.length} 个备份文件\n`));

    // 显示备份列表
    console.log(pc.bold("可用备份列表:"));
    console.log(pc.dim("─".repeat(60)));

    backups.forEach((backup, index) => {
      const number = pc.cyan(`${index + 1}.`);
      const time = formatDateTime(backup.mtime);
      const size = formatSize(backup.size);
      console.log(`  ${number} ${time}`);
      console.log(`     ${pc.dim(`文件: ${backup.name}`)}`);
      console.log(`     ${pc.dim(`大小: ${size}`)}`);
    });

    console.log(pc.dim("─".repeat(60)));
    console.log(`  ${pc.cyan("0")}  - 取消恢复\n`);

    // 获取用户选择
    const choice = await askQuestion(
      rl,
      pc.cyan("请选择要恢复的备份 (输入编号): ")
    );

    if (choice === "0" || choice.toLowerCase() === "q") {
      console.log(pc.yellow("\n已取消恢复操作\n"));
      return;
    }

    const choiceNum = parseInt(choice, 10);

    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > backups.length) {
      console.log(pc.red("\n❌ 无效的选择\n"));
      return;
    }

    const selectedBackup = backups[choiceNum - 1];

    // 二次确认
    console.log(pc.yellow("\n⚠️  确认恢复操作:"));
    console.log(`   备份时间: ${formatDateTime(selectedBackup.mtime)}`);
    console.log(`   目标文件: ${filePath}`);
    console.log(pc.red("   警告: 当前文件内容将被覆盖！\n"));

    const confirm = await askQuestion(
      rl,
      pc.cyan("确认恢复此备份? (输入 'yes' 确认): ")
    );

    if (confirm.toLowerCase() !== "yes") {
      console.log(pc.yellow("\n已取消恢复操作\n"));
      return;
    }

    // 执行恢复
    await restoreBackup(selectedBackup.path, filePath);
    console.log(pc.green("\n✓ 文件恢复成功！\n"));

  } catch (error) {
    console.error(pc.red(`\n❌ 恢复过程出错: ${error.message}\n`));
    throw error;
  } finally {
    rl.close();
  }
}

/**
 * 交互式配置patch
 */
export async function interactivePatchConfig() {
  const rl = createReadlineInterface();
  const patches = getAvailablePatches();
  let config = await readConfig();
  const originalConfig = JSON.parse(JSON.stringify(config)); // 深拷贝原始配置

  displayHeader();

  try {
    while (true) {
      displayConfigSummary(patches, config);
      displayPatches(patches, config);
      displayMenu();

      const choice = await askQuestion(
        rl,
        pc.cyan("\n请输入选项 (编号/快捷键): ")
      );

      // 处理保存并退出
      if (choice === "0") {
        await writeConfig(config);
        console.log(pc.green("\n✓ 配置已保存到 ~/.ccpatch/config.json"));
        console.log(pc.dim("使用 'ccpatch <文件路径>' 应用补丁\n"));
        break;
      }

      // 处理放弃更改并退出
      if (choice.toLowerCase() === "q") {
        // 检查是否有未保存的更改
        const hasChanges =
          JSON.stringify(config.enabledPatches) !== JSON.stringify(originalConfig.enabledPatches) ||
          config.cliPath !== originalConfig.cliPath;

        if (hasChanges) {
          const confirm = await askQuestion(
            rl,
            pc.yellow("\n⚠️  存在未保存的更改，确认放弃? (y/n): ")
          );
          if (confirm.toLowerCase() !== "y") {
            console.log(pc.dim("已取消退出"));
            continue;
          }
        }

        console.log(pc.yellow("\n✗ 已放弃更改，配置未保存\n"));
        break;
      }

      // 处理快捷操作
      if (handleShortcutAction(choice, patches, config)) {
        continue;
      }

      // 处理多选输入
      const choices = choice
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0);

      if (choices.length === 0) {
        console.log(pc.red("无效的输入，请重新输入。"));
        continue;
      }

      // 处理所有选择
      let hasValidChoice = false;
      for (const choiceStr of choices) {
        const choiceNum = parseInt(choiceStr, 10);

        if (isNaN(choiceNum)) {
          console.log(pc.red(`无效的选择: ${choiceStr}`));
          continue;
        }

        if (handlePatchToggle(choiceNum, patches, config)) {
          hasValidChoice = true;
        } else if (choiceNum === patches.length + 1) {
          // 设置默认文件路径
          await handlePathSetting(rl, config);
          hasValidChoice = true;
        } else {
          console.log(pc.red(`无效的选择: ${choiceNum}`));
        }
      }

      if (!hasValidChoice) {
        console.log(pc.red("没有有效的选择，请重新输入。"));
      }
    }
  } finally {
    rl.close();
  }
}