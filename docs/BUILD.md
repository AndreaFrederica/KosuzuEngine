# 构建

首次克隆或更新子模块引用后，先初始化仓库依赖：

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm build
```

Live2D 原生后端来自 `external/Live2dRender`，官方 Framework 来自
`external/CubismWebFramework`，固定在 `5-r.4` 对应的提交。
构建不需要本地 `external/Live2D/CubismSdkForWeb` 目录。

Cloudflare 的构建环境也需要初始化 Git 子模块；如果克隆阶段没有自动完成，
将构建命令设置为 `git submodule update --init --recursive && pnpm build`。
静态输出目录为 `dist/spa`。生产分支应跟随合入后的 `master`。
