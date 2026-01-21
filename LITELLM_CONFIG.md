# LiteLLM 代理服务器配置指南

## 什么是 LiteLLM？

LiteLLM 是一个统一的代理服务器，可以用统一的接口调用多个 LLM 提供商的 API。当使用 LiteLLM 时，即使调用 Claude 模型，也会使用 OpenAI 兼容的 API 格式。

## 配置步骤

### 1. 确保 LiteLLM 服务器正在运行

你的 LiteLLM 服务器地址是：`http://47.120.47.251:3000`

### 2. 配置 `~/.openwork/.env` 文件

在用户目录下创建或编辑 `.openwork/.env` 文件：

```bash
# LiteLLM 代理服务器地址
ANTHROPIC_BASE_URL=http://47.120.47.251:3000

# LiteLLM API 密钥（如果服务器启用了认证）
# 使用你的 Anthropic API key
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 3. 重启 openwork 应用

```bash
npm run dev
```

## 工作原理

当配置了 `ANTHROPIC_BASE_URL` 指向 LiteLLM 服务器时：

1. **自动检测**: 应用会检测到这是一个 LiteLLM 代理
2. **接口转换**: 自动将 Claude 模型的调用转换为 OpenAI 兼容格式
3. **请求路由**: LiteLLM 服务器接收请求并转发到相应的模型提供商

## 日志输出

配置正确时，你会在控制台看到：

```
[Runtime] Using LiteLLM proxy for Anthropic: {
  hasApiKey: true,
  hasAuthToken: false,
  baseUrl: 'http://47.120.47.251:3000'
}
```

## 支持的模型

通过 LiteLLM 代理，你可以使用以下模型：

- `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet
- `claude-3-5-haiku-20241022` - Claude 3.5 Haiku
- `claude-sonnet-4-5-20250929` - Claude Sonnet 4.5
- 以及其他在 LiteLLM 中配置的模型

## 常见问题

### 403 错误

**原因**: LiteLLM 服务器认证失败

**解决方案**:
1. 检查 LiteLLM 服务器是否需要 API key
2. 确认 `ANTHROPIC_API_KEY` 配置正确
3. 查看 LiteLLM 服务器日志

### 连接超时

**原因**: 无法连接到 LiteLLM 服务器

**解决方案**:
1. 确认服务器地址正确：`http://47.120.47.251:3000`
2. 检查网络连接
3. 确认 LiteLLM 服务器正在运行

### 模型不支持

**原因**: 模型名称在 LiteLLM 中未配置

**解决方案**:
1. 检查 LiteLLM 的 `litellm_config.yaml` 配置文件
2. 确认该模型已在 LiteLLM 中添加
3. 尝试使用其他模型名称

## LiteLLM 服务器配置示例

如果你的 LiteLLM 配置文件 (`litellm_config.yaml`) 如下：

```yaml
model_list:
  - model_name: claude-3-5-sonnet
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY
```

那么在 openwork 中使用时：
- 设置 `ANTHROPIC_BASE_URL=http://47.120.47.251:3000`
- 设置 `ANTHROPIC_API_KEY` 为你的 Anthropic API key
- 选择模型 `claude-3-5-sonnet-20241022`

## 测试配置

配置完成后，发送一条测试消息：

```
hello
```

如果配置正确，你应该能收到 AI 的回复。

## 调试

如果遇到问题，请查看：

1. **应用日志** - 控制台输出会显示详细的配置信息
2. **LiteLLM 日志** - 查看 LiteLLM 服务器的日志文件
3. **网络请求** - 使用工具检查请求是否正确发送到代理服务器

## 相关资源

- [LiteLLM 官方文档](https://docs.litellm.ai/)
- [LiteLLM GitHub](https://github.com/BerriAI/litellm)
- [openwork 代理配置指南](PROXY_CONFIG.md)
