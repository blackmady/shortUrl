# URL Shortener Service

基于 Cloudflare Workers 的私人短网址服务。

## 功能特点

- 创建短网址
- 支持自定义短网址
- 仅管理员可以管理链接
- 公开访问短网址重定向
- 列出所有短网址
- 删除短网址
- 修改原始网址

## 部署步骤

1. 安装 Wrangler CLI:
```bash
npm install -g wrangler
```

2. 登录到你的 Cloudflare 账户:
```bash
wrangler login
```

3. 创建 KV namespace:
```bash
wrangler kv:namespace create URL_STORE
```

4. 修改 `wrangler.toml` 文件中的 KV namespace ID

5. 设置环境变量:
```bash
# 设置管理员用户名
wrangler secret put ADMIN_USERNAME

# 设置管理员密码
wrangler secret put ADMIN_PASSWORD

# 在 wrangler.toml 中设置你的域名
# [vars]
# BASE_URL = "your-domain.com"
```

6. 部署服务:
```bash
wrangler deploy
```

## 环境变量说明

本项目使用以下环境变量：

1. `ADMIN_USERNAME`: 管理员用户名
   - 用于管理界面登录
   - 通过 `wrangler secret` 设置

2. `ADMIN_PASSWORD`: 管理员密码
   - 用于管理界面登录
   - 通过 `wrangler secret` 设置

3. `BASE_URL`: 服务域名
   - 在 `wrangler.toml` 的 `[vars]` 部分设置
   - 例如: "your-domain.workers.dev"

## 安全说明

- 使用环境变量存储敏感信息
- 管理接口使用基本认证保护
- 建议使用强密码
- 建议使用自定义域名

## API 使用说明

### 创建短网址
```bash
curl -X POST https://your-domain.com/api/urls \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com", "customId": "custom"}'
```

### 修改短网址
```bash
curl -X PUT https://your-domain.com/api/urls \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"shortId": "custom", "longUrl": "https://new-example.com"}'
```

### 列出所有短网址
```bash
curl https://your-domain.com/api/urls \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)"
```

### 删除短网址
```bash
curl -X DELETE https://your-domain.com/api/urls \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"shortId": "custom"}'
```

## 开源协议

MIT License