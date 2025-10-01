import fs from "fs/promises";
import path from "path";
import os from "os";

// 备份目录路径
const CONFIG_DIR = path.join(os.homedir(), ".ccpatch");
const BACKUP_DIR = path.join(CONFIG_DIR, "backup");

/**
 * 确保备份目录存在
 */
async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

/**
 * 生成备份文件名
 * @param {string} originalPath - 原始文件路径
 * @returns {string} 备份文件名
 */
function generateBackupName(originalPath) {
  const fileName = path.basename(originalPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${fileName}.backup.${timestamp}`;
}

/**
 * 创建文件备份
 * @param {string} filePath - 要备份的文件路径
 * @returns {Promise<string>} 备份文件的完整路径
 */
export async function createBackup(filePath) {
  try {
    await ensureBackupDir();

    // 读取原文件内容
    const content = await fs.readFile(filePath, "utf8");

    // 生成备份文件名
    const backupName = generateBackupName(filePath);
    const backupPath = path.join(BACKUP_DIR, backupName);

    // 写入备份
    await fs.writeFile(backupPath, content, "utf8");

    console.log(`✓ 已创建备份: ${backupName}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ 创建备份失败: ${error.message}`);
    throw error;
  }
}

/**
 * 列出指定文件的所有备份
 * @param {string} filePath - 原始文件路径
 * @returns {Promise<Array>} 备份信息列表
 */
export async function listBackups(filePath) {
  try {
    await ensureBackupDir();

    const fileName = path.basename(filePath);
    const files = await fs.readdir(BACKUP_DIR);

    // 筛选出匹配的备份文件
    const backups = [];
    for (const file of files) {
      if (file.startsWith(`${fileName}.backup.`)) {
        const backupPath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(backupPath);

        // 从文件名中提取时间戳
        const timestampStr = file.replace(`${fileName}.backup.`, "");

        backups.push({
          name: file,
          path: backupPath,
          timestamp: timestampStr,
          size: stats.size,
          mtime: stats.mtime
        });
      }
    }

    // 按修改时间降序排序（最新的在前）
    backups.sort((a, b) => b.mtime - a.mtime);

    return backups;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * 恢复指定的备份文件
 * @param {string} backupPath - 备份文件路径
 * @param {string} targetPath - 目标文件路径
 */
export async function restoreBackup(backupPath, targetPath) {
  try {
    const content = await fs.readFile(backupPath, "utf8");
    await fs.writeFile(targetPath, content, "utf8");
    console.log(`✓ 已恢复文件: ${path.basename(targetPath)}`);
  } catch (error) {
    console.error(`❌ 恢复失败: ${error.message}`);
    throw error;
  }
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 格式化日期时间
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期时间
 */
export function formatDateTime(date) {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}
