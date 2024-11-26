// 生成短网址的函数
function generateShortId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 验证管理员身份
function isValidAdmin(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }
  
  const credentials = atob(authHeader.split(' ')[1]);
  const [username, password] = credentials.split(':');
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

// 处理管理接口的响应
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 管理接口
  if (url.pathname === '/api/urls') {
    // 只允许管理员访问管理接口
    if (!isValidAdmin(request)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (request.method === 'POST') {
      const { longUrl, customId } = await request.json();
      const shortId = (customId ? customId.replace(/\s+/g, '-') : undefined) || generateShortId();
      
      // 检查 URL 是否已存在
      const existing = await URL_STORE.get(shortId);
      if (existing) {
        return json({ error: 'Short URL already exists' }, 400);
      }

      await URL_STORE.put(shortId, longUrl);
      return json({ 
        shortId,
        shortUrl: `https://${BASE_URL}/${shortId}`,
        longUrl 
      });
    }

    if (request.method === 'GET') {
      // 列出所有短网址
      const list = await URL_STORE.list();
      const urls = [];
      for (const key of list.keys) {
        const longUrl = await URL_STORE.get(key.name);
        urls.push({
          shortId: key.name,
          shortUrl: `https://${BASE_URL}/${key.name}`,
          longUrl
        });
      }
      return json(urls);
    }

    if (request.method === 'DELETE') {
      const { shortId } = await request.json();
      await URL_STORE.delete(shortId);
      return json({ message: 'Deleted successfully' });
    }
  }

  // 重定向接口
  const shortId = url.pathname.slice(1);
  if (shortId) {
    const longUrl = await URL_STORE.get(shortId);
    if (longUrl) {
      return Response.redirect(longUrl, 301);
    }
  }

  // 如果请求路径是 /admin，返回管理界面
  if (url.pathname === '/admin') {
    const adminHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>短网址管理系统</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <!-- 登录表单 -->
        <div id="loginForm" class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold mb-4">登录</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-gray-700">用户名</label>
                    <input type="text" id="username" class="w-full border rounded p-2">
                </div>
                <div>
                    <label class="block text-gray-700">密码</label>
                    <input type="password" id="password" class="w-full border rounded p-2" onkeydown="keydown(event)">
                </div>
                <button onclick="login()" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
                    登录
                </button>
            </div>
        </div>

        <!-- 管理界面 -->
        <div id="adminPanel" class="hidden">
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">短网址管理</h2>
                    <button onclick="logout()" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                        退出登录
                    </button>
                </div>
                
                <!-- 添加新链接 -->
                <div class="space-y-4 mb-8 border-b pb-6">
                    <h3 class="text-lg font-semibold">添加新链接</h3>
                    <div class="flex gap-4">
                        <input type="text" id="longUrl" placeholder="输入长网址" 
                               class="flex-1 border rounded p-2">
                        <input type="text" id="customId" placeholder="自定义短码（可选）" 
                               class="w-40 border rounded p-2">
                        <button onclick="addUrl()" 
                                class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                            添加
                        </button>
                    </div>
                </div>

                <!-- 链接列表 -->
                <div>
                    <h3 class="text-lg font-semibold mb-4">现有链接</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full table-auto">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="px-4 py-2 text-left">短网址</th>
                                    <th class="px-4 py-2 text-left">原始网址</th>
                                    <th class="px-4 py-2 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody id="urlList">
                                <!-- 动态填充 -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let authHeader = '';
        const BASE_URL = 'https://u.pgit.top';

        function keydown(event) {
            if (event.key === 'Enter') {
                login();
            }
        }

        // 登录函数
        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            authHeader = 'Basic ' + btoa(username + ':' + password);

            try {
                const response = await fetch(\`\${BASE_URL}/api/urls\`, {
                    headers: { 'Authorization': authHeader }
                });

                if (response.ok) {
                    document.getElementById('loginForm').classList.add('hidden');
                    document.getElementById('adminPanel').classList.remove('hidden');
                    loadUrls();
                } else {
                    alert('登录失败，请检查用户名和密码');
                }
            } catch (error) {
                alert('登录失败：' + error.message);
            }
        }

        // 退出登录
        function logout() {
            authHeader = '';
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('adminPanel').classList.add('hidden');
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        }

        // 加载所有URL
        async function loadUrls() {
            try {
                const response = await fetch(\`\${BASE_URL}/api/urls\`, {
                    headers: { 'Authorization': authHeader }
                });
                const urls = await response.json();
                
                const tbody = document.getElementById('urlList');
                tbody.innerHTML = '';
                
                urls.forEach(url => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = \`
                        <td class="border px-4 py-2">
                            <a href="\${BASE_URL}/\${url.shortId}" target="_blank" 
                               class="text-blue-500 hover:underline">
                                \${BASE_URL}/\${url.shortId}
                            </a>
                        </td>
                        <td class="border px-4 py-2 truncate max-w-md">
                            <a href="\${url.longUrl}" target="_blank" 
                               class="text-gray-600 hover:underline">
                                \${url.longUrl}
                            </a>
                        </td>
                        <td class="border px-4 py-2 text-center">
                            <button onclick="deleteUrl('\${url.shortId}')"
                                    class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                                删除
                            </button>
                        </td>
                    \`;
                    tbody.appendChild(tr);
                });
            } catch (error) {
                alert('加载失败：' + error.message);
            }
        }

        // 添加新URL
        async function addUrl() {
            const longUrl = document.getElementById('longUrl').value;
            const customId = document.getElementById('customId').value.replace(/\s+/g, '-');
            
            if (!longUrl) {
                alert('请输入长网址');
                return;
            }

            try {
                const response = await fetch(\`\${BASE_URL}/api/urls\`, {
                    method: 'POST',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        longUrl,
                        customId: customId || undefined
                    })
                });

                if (response.ok) {
                    document.getElementById('longUrl').value = '';
                    document.getElementById('customId').value = '';
                    loadUrls();
                } else {
                    const error = await response.json();
                    alert('添加失败：' + error.error);
                }
            } catch (error) {
                alert('添加失败：' + error.message);
            }
        }

        // 删除URL
        async function deleteUrl(shortId) {
            if (!confirm('确定要删除这个短网址吗？')) {
                return;
            }

            try {
                const response = await fetch(\`\${BASE_URL}/api/urls\`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ shortId })
                });

                if (response.ok) {
                    loadUrls();
                } else {
                    alert('删除失败');
                }
            } catch (error) {
                alert('删除失败：' + error.message);
            }
        }
    </script>
</body>
</html>`;
    return new Response(adminHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // 默认返回简单的HTML页面
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>URL Shortener</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>URL Shortener</h1>
        <p>This is a private URL shortener service.</p>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'html' },
  });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
