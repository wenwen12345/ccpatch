# ccpatch

## 介绍

ccpatch 是一个用于修改 Claude Code CLI 的 AST 补丁工具。它使用 Babel 解析器修改 JavaScript 代码以绕过某些验证和显示限制，支持多种补丁的配置化管理。

## 特性

- 🔧 **首次运行自动配置** - 没有配置文件时自动启动配置向导
- 🎯 **交互式补丁选择** - 可选择启用/禁用特定补丁
- 📦 **模块化补丁系统** - 支持验证补丁、上下文补丁、ESC中断补丁等
- 🛠️ **AST 级别修改** - 基于 Babel 的精确代码转换
- 🚀 **简单易用** - 一键应用已配置的补丁

## 安装

使用 npm 全局安装：

```bash
npm install -g wenwen12345/ccpatch#main
```

或使用其他包管理器：

```bash
# 使用 pnpm
pnpm add -g wenwen12345/ccpatch#main

# 使用 bun
bun add -g wenwen12345/ccpatch#main
```

## 使用

### 基本用法

```bash
# 首次运行会自动启动配置向导
ccpatch [文件名]

# 应用补丁到指定文件
ccpatch /path/to/claude/code/cli.js

# 默认修补当前目录下的 cli.js 文件
ccpatch
```

### 配置管理

```bash
# 手动进入配置页面
ccpatch config

# 显示帮助信息
ccpatch --help

# 显示版本信息
ccpatch --version
```

### 可用补丁

- **验证补丁** (`validationPatch`) - 绕过模型名称验证
- **上下文补丁** (`contextLowPatch`) - 移除上下文低提示
- **ESC中断补丁** (`escInterruptPatch`) - 移除 esc to interrupt 提示

## 工作流程

1. **首次运行** - 自动检测配置文件不存在，启动配置向导
2. **选择补丁** - 在交互界面中选择要启用的补丁
3. **应用补丁** - 对目标文件应用已配置的补丁
4. **完成** - 生成修改后的文件
