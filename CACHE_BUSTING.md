# GitHub Pages CDN 缓存破坏策略

## 问题描述

GitHub Pages 默认会缓存静态文件很长时间（通常是 10 分钟到数小时），即使推送了新文件，CDN 仍然返回旧版本。这导致用户无法立即看到最新的代码更新。

## 解决方案

### 1. **时间戳文件名（主要策略）**

在 `vite.config.mts` 中添加时间戳到文件名：

```typescript
rollupOptions: {
  output: {
    entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
    chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
    assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
  }
}
```

**效果**：每次构建都会生成全新的文件名，例如：
- `index-G3M7MufU-1771012761231.js`（1771012761231 是时间戳）
- 下次构建：`index-H4N8PvgW-1771012999456.js`

由于文件名完全不同，CDN 无法返回旧缓存。

### 2. **GitHub Actions 自动部署**

在 `.github/workflows/deploy.yml` 中添加：

```yaml
- name: Add cache busting
  run: |
    # 添加 .nojekyll 文件禁用 Jekyll
    touch dist/.nojekyll
    
    # 为所有 HTML 文件添加时间戳注释
    find dist -name "*.html" -type f -exec sed -i "s|</head>|<!-- Build: $(date +%s) --></head>|g" {} \;
```

### 3. **禁用 Jekyll**

创建 `.nojekyll` 文件，防止 GitHub Pages 使用 Jekyll 处理文件，避免额外的缓存层。

## 工作原理

```
用户访问 → GitHub Pages CDN 检查 URL
                ↓
          URL 包含时间戳（新文件名）
                ↓
          CDN 中没有该文件的缓存
                ↓
          从源服务器获取新文件
                ↓
          返回给用户（最新版本）
```

## 验证方法

### 方法 1：检查文件名
打开浏览器开发者工具（F12）→ Network 标签，查看加载的 JS 文件名：
- ✅ 正确：`index-G3M7MufU-1771012761231.js`（包含时间戳）
- ❌ 错误：`index-BDtGaeJ6.js`（旧文件名）

### 方法 2：查看 HTML 源代码
右键点击页面 → 查看源代码，检查 `<script>` 标签：
```html
<script type="module" crossorigin src="./assets/index-G3M7MufU-1771012761231.js"></script>
```

### 方法 3：强制刷新
- **Windows/Linux**: `Ctrl + Shift + R` 或 `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

## 部署流程

1. 修改代码
2. 提交并推送到 GitHub
3. GitHub Actions 自动构建（生成新的时间戳文件名）
4. 自动部署到 GitHub Pages
5. 用户访问时自动获取最新文件（无需手动清除缓存）

## 注意事项

- **每次构建都会生成新文件**：这意味着 `assets` 目录会不断增长
- **建议定期清理旧文件**：可以手动删除旧的构建文件，或在 GitHub Actions 中添加清理步骤
- **时间戳是构建时生成的**：即使代码没有变化，重新构建也会生成新的文件名

## 优势

✅ **彻底解决 CDN 缓存问题**：每次都是全新的文件名  
✅ **无需用户操作**：用户刷新页面即可获取最新版本  
✅ **自动化部署**：GitHub Actions 自动处理一切  
✅ **兼容性好**：适用于所有浏览器和 CDN  

## 相关文件

- `vite.config.mts` - Vite 构建配置（时间戳文件名）
- `.github/workflows/deploy.yml` - GitHub Actions 自动部署
- `.nojekyll` - 禁用 Jekyll 处理

## 参考资料

- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [Vite 构建选项](https://vitejs.dev/config/build-options.html)
- [Cache Busting 最佳实践](https://web.dev/http-cache/)

