# GitHub Pages 部署指南

## 方法一：直接部署（推荐）

### 1. 创建 GitHub 仓库

1. 在 GitHub 上创建一个新仓库（例如：`feishu-ai-qa-plugin`）
2. 不要初始化 README、.gitignore 或 license（我们已经有了）

### 2. 推送代码到 GitHub

```bash
# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/feishu-ai-qa-plugin.git

# 重命名分支为 main（如果当前是 master）
git branch -M main

# 推送代码
git push -u origin main
```

### 3. 设置 GitHub Pages

1. 进入仓库的 **Settings** 页面
2. 在左侧菜单找到 **Pages**
3. 在 **Source** 部分：
   - 选择 **Deploy from a branch**
   - Branch 选择：**main**
   - Folder 选择：**/ (root)**
4. 点击 **Save**

### 4. 访问插件

等待几分钟后，访问：
```
https://你的用户名.github.io/feishu-ai-qa-plugin/
```

## 方法二：使用 gh-pages 分支（可选）

如果你不想将构建产物提交到 main 分支，可以使用 gh-pages 分支：

```bash
# 创建 gh-pages 分支
git checkout -b gh-pages

# 将 dist 目录的内容复制到根目录
cp -r dist/* .

# 提交
git add .
git commit -m "Deploy to GitHub Pages"

# 推送到 gh-pages 分支
git push origin gh-pages
```

然后在 GitHub Pages 设置中选择 **gh-pages** 分支。

## 方法三：使用 GitHub Actions 自动部署（高级）

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16.19.0'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 注意事项

1. **vite.config.mts** 中已经设置了 `base: "./"`，这是 GitHub Pages 必需的
2. 如果仓库名不是根路径（例如在子目录），需要修改 `base` 为 `"/仓库名/"`
3. 首次部署可能需要几分钟时间
4. 更新代码后，GitHub Pages 会自动重新部署

## 在飞书中使用

部署完成后，在飞书插件市场添加插件时，使用：
```
https://你的用户名.github.io/feishu-ai-qa-plugin/
```

