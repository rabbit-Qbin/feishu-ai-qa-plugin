# 飞书 AI 智能问答插件

基于飞书多维表格的 AI 智能问答插件，使用 ZAI GLM-4.7 大模型进行产品选品分析。

## 功能特性

- ✅ **智能体模式**：AI 根据问题动态决定读取哪些数据
- ✅ **多维表格选择器**：支持选择不同的多维表格作为数据源
- ✅ **三阶段智能分析**：分析问题 → 执行查询 → 生成回答
- ✅ **符合官方规范**：严格按照飞书应用插件官方文档开发
- ✅ **支持 Create/Config/View 三种状态**

## 技术栈

- **前端框架**: TypeScript + Vite
- **飞书 SDK**: @lark-base-open/js-sdk
- **AI 模型**: ZAI GLM-4.7

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 部署

构建产物在 `dist/` 目录，可以部署到：
- GitHub Pages
- Vercel
- 自己的服务器（需要 HTTPS）

## GitHub Pages 设置

1. 在 GitHub 仓库的 Settings → Pages
2. Source 选择：Deploy from a branch
3. Branch 选择：main，文件夹选择：/ (root)
4. 将 `dist/` 目录的内容推送到 `main` 分支的根目录
5. 访问地址：`https://[你的用户名].github.io/[仓库名]/`

## 使用说明

1. 在飞书多维表格中创建"选品结果表"
2. 确保表包含必要的字段
3. 添加插件到应用
4. 选择多维表格和数据表
5. 输入问题，AI 将基于数据进行分析

## 提示词说明

插件使用专业的选品分析师提示词，要求 AI：
- 基于实际数据回答
- 引用具体数值
- 提供专业建议
- 控制在 500 字以内

## 注意事项

- API 调用需要网络连接
- 大量数据时可能响应较慢
- 建议对 API 调用进行监控和限流
