# 额度总览

显示 **设置 → 模型** 中已部署的全部供应商和模型额度。

## 位置

- 对话输入框上方：一行额度栏，点「全部 N」展开全部供应商。
- 设置 → 额度：完整列表，带「刷新全部」。

## 支持的数据源

| 供应商 | 数据 |
|---|---|
| `deepseek-account` | DeepSeek 账号充值余额 + 赠送余额（不需要 API Key） |
| `deepseek`（API Key） | `GET https://api.deepseek.com/user/balance` |
| `zai` / `zhipu` / `bigmodel` / `glm` | Coding Plan 5h / 7d 已用百分比、剩余额度与重置时间 |
| `kimi` / `moonshot` | `GET /v1/users/me/balance`（可用余额 + 代金券） |
| `siliconflow` / 硅基流动 | `GET https://api.siliconflow.cn/v1/user/info` 余额 |

其他供应商仍会列出模型，但标记「额度接口未适配」，不会伪造数字。通义（DashScope）、火山方舟、腾讯混元、百度千帆等平台的余额只有控制台级接口，API Key 无法查询，故暂不支持。

额度是**供应商/账户级**的：同一供应商下的多个模型共享一个额度，界面按供应商分组并列出全部模型。

## 安全

- API Key 只在 Host 侧通过 `ctx.credentials` 解析和使用，不进入浏览器响应。
- DeepSeek 账号余额通过 `ctx.deepseekAccount.getBalance()` 获取，不下发 token。
- 查询路由 `GET /api/llm-quota` 走 DSH 的认证 `/api` 通道。
- 出站请求固定官方端点，15 秒超时，不读取用户自定义 URL。

## 刷新

- 输入框额度栏：每 60 秒、窗口重新聚焦、每轮结束后刷新。
- 手动刷新会绕过 Host 30 秒缓存。
- 查询失败时保留上次成功数据并标记「显示上次成功数据」。

## 安装（从 GitHub）

需要已安装 DeepSeek Harness（DSH）。

### 方式一：下载压缩包安装

1. 在本仓库页面下载源码（Code → Download ZIP），或 `git clone` 本仓库。
2. 打包并安装（profile 名按实际使用，桌面版通常是 `desktop`，Web 版通常是 `web`）：

   ```sh
   cd dsh-llm-quota-board
   npm pack
   dsh plugin --profile desktop add ./llm-quota-board-0.1.0.tgz
   ```

   也可以打开 DSH 的 **插件 → 添加插件**，直接填 tgz 的绝对路径。
3. 重启 DSH（桌面版退出重开；Web 版重启 `dsh web`），再刷新页面。
4. 在 **设置 → 额度**，或对话输入框上方查看。

### 方式二：从本仓库目录直接安装（已 clone 时）

```sh
git clone https://github.com/xypshot/dsh-llm-quota-board.git
dsh plugin --profile desktop add ./dsh-llm-quota-board
```

## 卸载

在插件管理里禁用或移除 `@local/llm-quota-board`。源码目录就是本包解压后的目录。
