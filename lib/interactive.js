import readline from "readline";
import { readConfig, writeConfig, getAvailablePatches } from "./config.js";

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
 * 显示可用的patch列表
 */
function displayPatches(patches, currentConfig) {
  console.log("\n=== 可用的补丁列表 ===");
  patches.forEach((patch, index) => {
    const isEnabled = currentConfig.enabledPatches.includes(patch.name);
    const status = isEnabled ? "✓ 已启用" : "✗ 未启用";
    console.log(`${index + 1}. ${patch.name} - ${patch.description} [${status}]`);
  });
  console.log("0. 保存并退出");
}

/**
 * 交互式配置patch
 */
export async function interactivePatchConfig() {
  const rl = createReadlineInterface();
  const patches = getAvailablePatches();
  let config = await readConfig();

  console.log("欢迎使用 ccpatch 配置工具！");

  try {
    while (true) {
      displayPatches(patches, config);

      const choice = await askQuestion(rl, "\n请选择要切换的补丁编号 (0-退出): ");
      const choiceNum = parseInt(choice, 10);

      if (choiceNum === 0) {
        await writeConfig(config);
        console.log("\n配置已保存到 ~/.ccpatch/config.json");
        break;
      }

      if (choiceNum >= 1 && choiceNum <= patches.length) {
        const selectedPatch = patches[choiceNum - 1];
        const isCurrentlyEnabled = config.enabledPatches.includes(selectedPatch.name);

        if (isCurrentlyEnabled) {
          // 禁用补丁
          config.enabledPatches = config.enabledPatches.filter(name => name !== selectedPatch.name);
          console.log(`✗ 已禁用: ${selectedPatch.name}`);
        } else {
          // 启用补丁
          config.enabledPatches.push(selectedPatch.name);
          console.log(`✓ 已启用: ${selectedPatch.name}`);
        }
      } else {
        console.log("无效的选择，请重新输入。");
      }
    }
  } finally {
    rl.close();
  }
}