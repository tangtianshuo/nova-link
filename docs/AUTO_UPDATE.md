# Nova Link 自动更新（GitHub CI/CD）技术实现文档

本文档描述 Nova Link（Tauri v2 + Vue 3）如何通过 GitHub Actions 构建发布后，让客户端获取更新信息并完成版本升级（含签名校验、下载、安装、重启）。方案以 **Tauri v2 Updater 插件 + GitHub Releases 静态 JSON** 为主，兼容后续切换到自建更新服务。

## 1. 背景与现状

- 当前已存在 GitHub Actions 发布流程：[build.yml](file:///d:/Projects/Tauri/nova-link/.github/workflows/build.yml)
  - 触发条件：push tag `v*` 或手动触发
  - 平台：Windows（MSI）、macOS（DMG）
- 当前 Tauri 配置：[tauri.conf.json](file:///d:/Projects/Tauri/nova-link/src-tauri/tauri.conf.json)
  - bundle targets：`msi`、`dmg`
  - 未配置 Updater 插件，也未启用 Updater 产物（sig / updater bundle / latest.json）

目标：在不引入额外服务的情况下，利用 **GitHub Releases** 作为更新源，让客户端可自动升级。

## 2. 设计目标

- **安全**：所有更新必须通过签名校验，防止中间人或篡改包注入（Tauri Updater 强制签名校验）。
- **可自动化**：打 Tag 后自动构建、签名、发布 Release，并产出更新元数据 `latest.json`。
- **可跨平台**：Windows / macOS 使用同一套更新机制。
- **可回滚**：允许保留旧版本 Release，必要时可通过版本策略实现回退（需要额外策略，见 9.2）。

## 3. 总体方案

### 3.1 更新源（Update Feed）

采用静态 JSON 模式：

- 更新元数据地址：`https://github.com/<owner>/<repo>/releases/latest/download/latest.json`
- 客户端启动或用户手动触发时访问该 URL，判断 `version` 是否大于当前版本，若大于则提示更新。

参考：

- Tauri Updater 插件文档：https://v2.tauri.app/plugin/updater/

### 3.2 更新包与签名产物

启用 `bundle.createUpdaterArtifacts = true` 后，Tauri bundler 会为不同平台生成 updater 所需的更新包与签名文件（`.sig`）。同时，GitHub Actions 需要注入私钥用于签名（CI 环境变量）。

参考：

- 环境变量说明：https://v2.tauri.app/reference/environment-variables/

### 3.3 客户端升级流程

1. 检查更新（静默/手动）
2. 有更新：显示变更说明（Release notes）
3. 用户确认：下载并安装
4. 安装完成：重启应用

## 4. 版本与发布规范

### 4.1 Tag 规范

- Git Tag：`vMAJOR.MINOR.PATCH`（例如 `v0.1.1`）
- Tag 推送触发 GitHub Actions 的 Release 构建。

### 4.2 版本一致性

建议保持以下版本一致：

- [tauri.conf.json](file:///d:/Projects/Tauri/nova-link/src-tauri/tauri.conf.json) `version`
- [Cargo.toml](file:///d:/Projects/Tauri/nova-link/src-tauri/Cargo.toml) `[package].version`
- [package.json](file:///d:/Projects/Tauri/nova-link/package.json) `version`

## 5. 密钥与签名（必须）

### 5.1 生成签名密钥

在任意开发机上执行一次（生成公私钥对）：

```bash
npm run tauri signer generate -- -w ~/.tauri/nova-link.key
```

会得到：

- 私钥：`~/.tauri/nova-link.key`（必须保密，丢失将无法给已安装用户继续发布可用更新）
- 公钥：`~/.tauri/nova-link.key.pub`（可公开，写入 tauri.conf.json）

### 5.2 GitHub Secrets 配置

在 GitHub 仓库 Secrets 增加：

- `TAURI_SIGNING_PRIVATE_KEY`：私钥内容（推荐直接存“文件内容”而不是路径）
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：私钥密码（可选，但建议设置）

说明：Tauri CLI 不读取 `.env` 文件签名信息，必须由 CI 环境变量注入。

## 6. Tauri 配置改造

### 6.1 启用 Updater 产物生成

在 [tauri.conf.json](file:///d:/Projects/Tauri/nova-link/src-tauri/tauri.conf.json) 增加：

```json
{
	"bundle": {
		"createUpdaterArtifacts": true
	}
}
```

### 6.2 配置 Updater 插件（静态 JSON）

在 [tauri.conf.json](file:///d:/Projects/Tauri/nova-link/src-tauri/tauri.conf.json) 增加：

```json
{
	"plugins": {
		"updater": {
			"pubkey": "<填入 nova-link.key.pub 的内容（纯文本）>",
			"endpoints": [
				"https://github.com/<owner>/<repo>/releases/latest/download/latest.json"
			],
			"windows": {
				"installMode": "passive"
			}
		}
	}
}
```

注意：

- `pubkey` 必须是公钥“内容”，不能是文件路径。
- 生产环境强制 HTTPS。GitHub Releases 满足要求。

## 7. Rust / 插件集成

### 7.1 添加依赖

在 [Cargo.toml](file:///d:/Projects/Tauri/nova-link/src-tauri/Cargo.toml) 增加（版本以当前 v2 稳定版为准）：

```toml
tauri-plugin-updater = "2"
tauri-plugin-dialog = "2"
tauri-plugin-process = "2"
```

### 7.2 初始化插件

在后端入口（当前仓库已拆分模块，入口为 [lib.rs](file:///d:/Projects/Tauri/nova-link/src-tauri/src/lib.rs)）中初始化：

- `tauri_plugin_updater::Builder::new().build()`
- `tauri_plugin_dialog::init()`
- `tauri_plugin_process::init()`

备注：

- 更新安装完成后通常需要调用 `process.relaunch()` 重启。
- Windows 平台安装更新可能会强制退出应用（installer 限制），需在 UI 或事件回调里做好提示。

## 8. Capabilities 权限（Tauri v2 权限模型）

当前 capabilities 文件为 [default.json](file:///d:/Projects/Tauri/nova-link/src-tauri/capabilities/default.json)，需要加入 updater/dialog/process 权限。

建议增加（具体权限名以 `src-tauri/gen/` 的 schema 为准）：

- `updater:default`
- `updater:allow-check`
- `updater:allow-download-and-install`
- `dialog:default`
- `dialog:allow-message`
- `dialog:allow-ask`
- `process:default`
- `process:allow-restart`

参考：

- https://v2.tauri.app/plugin/updater/

## 9. 前端实现（更新检查与交互）

### 9.1 依赖安装

前端安装插件：

```bash
npm i @tauri-apps/plugin-updater @tauri-apps/plugin-dialog @tauri-apps/plugin-process
```

### 9.2 更新检查模块（建议单独封装）

建议新增 `src/utils/updater.ts`，提供：

- `checkForUpdates({ userInitiated: boolean })`
- 可选：定时检查、跳过此版本、显示 release notes、下载进度展示

核心流程（示意）：

```ts
import { check } from "@tauri-apps/plugin-updater"
import { ask, message } from "@tauri-apps/plugin-dialog"
import { relaunch } from "@tauri-apps/plugin-process"

export async function checkForUpdates(userInitiated: boolean) {
	const update = await check()
	if (!update) {
		if (userInitiated) {
			await message("检查更新失败，请稍后再试", {
				title: "更新",
				kind: "error",
			})
		}
		return
	}

	if (!update.available) {
		if (userInitiated) {
			await message("当前已是最新版本", { title: "更新", kind: "info" })
		}
		return
	}

	const yes = await ask(
		`发现新版本 ${update.version}\\n\\n${update.body ?? ""}`,
		{
			title: "发现更新",
			kind: "info",
			okLabel: "立即更新",
			cancelLabel: "稍后",
		},
	)
	if (!yes) return

	await update.downloadAndInstall()
	await relaunch()
}
```

### 9.3 触发时机建议

- 启动后 3~10 秒：静默检查（有更新才弹窗）
- 设置页：提供“检查更新”按钮（无更新也提示）

## 10. GitHub Actions（构建、签名、发布、latest.json）

当前 workflow 为 [build.yml](file:///d:/Projects/Tauri/nova-link/.github/workflows/build.yml)。要实现自动更新，需要做到：

1. CI 注入签名密钥（环境变量）
2. bundler 开启 `createUpdaterArtifacts`
3. Release 上传：
   - Windows：`.msi` + `.msi.sig`（可选再含 portable + sig）
   - macOS：`.app.tar.gz` + `.sig`（Updater 使用 tar.gz；DMG 可作为手动下载）
   - `latest.json`

### 10.1 关键 CI 环境变量

在 `tauri-apps/tauri-action` step 的 `env:` 增加：

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

### 10.2 latest.json 产出

`tauri-action` 可生成静态 JSON 并附加到 Release（参数名以 action 版本为准，常见为 `includeUpdaterJson: true` 或同等功能）。

实现标准：Release Assets 中能看到 `latest.json`，并能通过：

`https://github.com/<owner>/<repo>/releases/latest/download/latest.json`

直接访问到。

### 10.3 macOS 架构策略建议

Updater 静态 JSON 的平台 key 通常区分 `darwin-x86_64` 与 `darwin-aarch64`。如果仅发布 universal dmg，不利于 updater 精确匹配架构。

建议：

- 保留 universal DMG：用于用户手动下载
- Updater 产物按架构输出 `.app.tar.gz` + `.sig`，并写入 `latest.json.platforms`

## 11. 测试与验收

### 11.1 本地验收（不发 Release）

1. 临时准备私钥环境变量（本地 shell 环境）：
   - `TAURI_SIGNING_PRIVATE_KEY`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
2. 本地执行 `tauri build`，确认生成 `.sig` 等 updater 产物。

### 11.2 端到端验收（发 Release）

1. 打 tag：`v0.1.1` → 推送
2. Actions 构建完成后，确认 Release assets：
   - `latest.json`
   - 各平台 updater 包 + sig
3. 在旧版本客户端运行：
   - 启动检查更新：提示新版本
   - 下载并安装：完成后重启进入新版本

## 12. 运维与风险

### 12.1 私钥丢失风险

如果丢失签名私钥：

- 已安装客户端将无法验证新签名（更新链断裂）
- 只能换一个全新应用标识/或重新分发新安装包，无法无缝升级

建议：

- 私钥离线备份（密码管理器 + 冷备）
- CI secrets 仅限管理员可读

### 12.2 回滚策略

静态 `latest.json` 默认只指向最新版本：

- 若要回滚，需要发布一个“更高版本号”的修复版本（推荐）
- 或实现自建更新服务，通过版本比较策略返回旧版本（复杂且需谨慎）

---

## 附录：参考链接

- Tauri Updater 插件：https://v2.tauri.app/plugin/updater/
- Tauri 环境变量（签名相关）：https://v2.tauri.app/reference/environment-variables/
