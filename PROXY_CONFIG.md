# 配置代理 URL 使用指南

本文档说明如何为 openwork 配置代理 URL 或自定义 API 端点。

## 配置方式

### 1. 创建配置文件

在用户目录下创建 `.openwork/.env` 文件：

**macOS/Linux:**

```bash
mkdir -p ~/.openwork
nano ~/.openwork/.env
```

**Windows:**

```powershell
mkdir $env:USERPROFILE\.openwork
notepad $env:USERPROFILE\.openwork\.env
```

### 2. 配置代理 URL

在 `.env` 文件中添加以下配置：

```bash
# API 密钥（必需）
ANTHROPIC_API_KEY=your-api-key-here

# 自定义代理 URL（可选）
ANTHROPIC_BASE_URL=http://your-proxy-server:port/v1
```

## 支持的代理配置

### Anthropic Claude

```bash
ANTHROPIC_BASE_URL=http://localhost:8080/v1
```

### OpenAI

```bash
OPENAI_BASE_URL=http://localhost:8080/v1
```

### Google Gemini

```bash
GOOGLE_BASE_URL=http://localhost:8080/v1
```

## 使用场景

### 1. 本地代理服务器

如果你在本地运行了代理服务器（如 `http://localhost:8080`）：

```bash
ANTHROPIC_BASE_URL=http://localhost:8080/v1
```

### 2. 企业内网代理

如果需要通过企业代理访问 API：

```bash
ANTHROPIC_BASE_URL=http://proxy.company.com:8080/anthropic/v1
```

### 3. 自定义 API 网关

如果使用自定义的 API 网关或转发服务：

```bash
ANTHROPIC_BASE_URL=https://api-gateway.example.com/claude
```

### 4. 中转服务

如果使用第三方中转服务：

```bash
ANTHROPIC_BASE_URL=https://forward.example.com/v1
```

## 完整配置示例

```bash
# ~/.openwork/.env

# API 密钥
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=AIzaSyxxxxx

# 代理配置（根据需要选择）
ANTHROPIC_BASE_URL=http://47.120.47.251:3000
OPENAI_BASE_URL=http://localhost:8080/v1
GOOGLE_BASE_URL=http://proxy.example.com:8080/v1
```

## 验证配置

1. 重启 openwork 应用
2. 发送一条测试消息
3. 查看控制台日志，应该看到类似输出：
   ```
   [Runtime] Anthropic config: {
     hasApiKey: true,
     baseUrl: 'http://your-proxy-url'
   }
   ```

## 故障排除

### 连接失败

- 检查代理 URL 是否正确
- 确认代理服务器正在运行
- 检查网络连接和防火墙设置

### 认证错误

- 确认 API 密钥正确
- 检查代理服务器是否需要特殊的认证头
- 查看代理服务器日志

### 超时错误

- 检查代理服务器响应时间
- 确认网络延迟是否过高
- 考虑使用更快的代理服务器

## 注意事项

1. **安全性**: `.env` 文件包含敏感信息，请勿分享或提交到版本控制
2. **URL 格式**: 确保代理 URL 以 `http://` 或 `https://` 开头
3. **路径**: 某些代理可能需要特定路径（如 `/v1`），请根据代理服务器的文档配置
4. **端口**: 确保代理服务器的端口正确且可访问
5. **CORS**: 如果使用 Web 代理，确保正确配置了 CORS

## 常见代理服务器

### Agent.py 中转

```bash
ANTHROPIC_BASE_URL=http://localhost:8080/v1
```

### Nginx 反向代理

```bash
ANTHROPIC_BASE_URL=https://your-domain.com/proxy/anthropic
```

### VPN 或隧道

```bash
ANTHROPIC_BASE_URL=http://localhost:port/v1
```

## 技术支持

如果遇到问题：

1. 查看应用日志（控制台输出）
2. 测试代理服务器是否可直接访问
3. 参考代理服务器的文档
4. 提交 Issue 到 GitHub 仓库
