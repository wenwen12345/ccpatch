# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

ccpatch 是一个用于修改 Claude Code CLI 的 AST 补丁工具。它使用 Babel 解析器修改 JavaScript 代码以绕过某些验证和显示限制。

## 核心架构

### 入口点
- `index.js` - 主入口文件，处理命令行参数和补丁应用流程

### 核心模块
- `lib/config.js` - 配置管理，处理 `~/.ccpatch/config.json` 中的用户配置
- `lib/interactive.js` - 交互式配置界面，用于启用/禁用补丁和恢复备份
- `lib/backup.js` - 备份管理，自动备份和恢复功能
- `patches/` - 包含具体的AST补丁实现

### 补丁系统
当前包含三个补丁：
1. `validationPatch.js` - 绕过模型名称验证，通过查找特定字符串并替换包含函数的实现
2. `contextLowPatch.js` - 移除上下文低提示，替换特定字符串并修改相关函数返回null
3. `escInterruptPatch.js` - 移除ESC中断提示，查找和删除包含'esc'或'to interrupt'的createElement调用

## 常用命令

### 开发和构建
```bash
# 安装依赖
npm install

# 运行工具
node index.js [目标文件]
node index.js config  # 配置模式
node index.js restore [文件] # 恢复备份

# 使用命令行选项
node index.js -p validationPatch,escInterruptPatch [目标文件]  # 指定特定补丁
node index.js --help  # 显示帮助
node index.js --version  # 显示版本

# 如果全局安装了工具
ccpatch  # 应用补丁到配置的默认文件
ccpatch /path/to/target.js  # 应用补丁到指定文件
ccpatch config  # 配置启用的补丁和默认路径
ccpatch restore  # 交互式恢复备份
ccpatch restore /path/to/target.js  # 恢复指定文件
ccpatch -p validationPatch,contextLowPatch cli.js  # 指定特定补丁
```

### 测试和验证
```bash
# 验证AST解析
node -e "import('./index.js')"

# 检查TypeScript类型
npx tsc --noEmit
```

## 技术栈

- **Runtime**: Node.js ESM模块
- **AST处理**: Babel (@babel/parser, @babel/traverse, @babel/generator, @babel/types)
- **开发**: TypeScript配置(仅类型检查), Bun lockfile

## 工作流程

1. **解析目标文件** - 使用 `@babel/parser` 将 JavaScript 代码解析为 AST
2. **创建备份** - 自动将原文件备份到 `~/.ccpatch/backup/` 目录
3. **应用补丁** - 根据配置文件中启用的补丁，使用 `@babel/traverse` 遍历并修改 AST
4. **生成代码** - 使用 `@babel/generator` 将修改后的 AST 转换回 JavaScript 代码
5. **写回文件** - 将修改后的代码写回原文件

## 配置系统

- 配置文件位置: `~/.ccpatch/config.json`
- 备份文件位置: `~/.ccpatch/backup/`
- 默认配置: `{ enabledPatches: [], cliPath: "" }`
- 可用补丁通过 `lib/config.js` 中的 `getAvailablePatches()` 函数定义
- 支持首次运行自动配置向导
- 命令行选项 `-p/--patches` 可覆盖配置文件设置
- 每次应用补丁前自动创建备份，支持交互式恢复

## 补丁开发指南

创建新补丁时需要：
1. 在 `patches/` 目录创建新的补丁文件
2. 导出一个函数，接受 AST 参数，返回 `{ ast, wasModified }` 对象
3. 在 `lib/config.js` 的 `getAvailablePatches()` 中注册新补丁
4. 在 `index.js` 主流程中添加补丁应用逻辑（需要手动添加到applyPatches函数）
5. 补丁函数应该使用 `@babel/traverse` 遍历AST并使用 `@babel/types` 进行修改

## 重要注意事项

- 本工具会在应用补丁前自动创建备份到 `~/.ccpatch/backup/` 目录
- 备份文件命名格式：`文件名.backup.ISO时间戳`
- 使用 `ccpatch restore` 可以交互式选择并恢复任意备份版本
- AST 修改可能影响代码功能，需要仔细测试
- 补丁是基于特定字符串匹配的，目标代码结构变化可能导致补丁失效
- 配置采用用户级别存储(~/.ccpatch/)，不同项目共享配置