import fs from "fs/promises";
import path from "path";
import os from "os";

// 配置文件路径
const CONFIG_DIR = path.join(os.homedir(), ".ccpatch");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

// 默认配置
const DEFAULT_CONFIG = {
  enabledPatches: []
};

/**
 * 确保配置目录存在
 */
async function ensureConfigDir() {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 读取配置文件
 */
export async function readConfig() {
  try {
    await ensureConfigDir();
    const configData = await fs.readFile(CONFIG_FILE, "utf8");
    return {
      ...DEFAULT_CONFIG,
      ...JSON.parse(configData),
      isNewConfig: false
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      // 配置文件不存在，返回默认配置并标记为新配置
      return {
        ...DEFAULT_CONFIG,
        isNewConfig: true
      };
    }
    throw error;
  }
}

/**
 * 写入配置文件
 */
export async function writeConfig(config) {
  await ensureConfigDir();
  const configData = JSON.stringify(config, null, 2);
  await fs.writeFile(CONFIG_FILE, configData, "utf8");
}

/**
 * 获取可用的patch列表
 */
export function getAvailablePatches() {
  return [
    {
      name: "validationPatch",
      description: "验证补丁 - 绕过模型名称验证",
      file: "./patches/validationPatch.js"
    },
    {
      name: "contextLowPatch",
      description: "上下文补丁 - 移除上下文低提示",
      file: "./patches/contextLowPatch.js"
    }
  ];
}