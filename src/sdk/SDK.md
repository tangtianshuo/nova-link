# OpenClaw Gateway SDK

一个用于连接 OpenClaw Gateway 的 WebSocket 客户端 SDK，支持聊天、事件流和自动重连功能。

## 安装

```bash
npm install
```

## 快速开始

```typescript
import { GatewayClient } from './sdk/index.js';

const client = new GatewayClient({
  url: 'ws://127.0.0.1:18789/',
  token: 'your-device-token',
  onStatusChange: (status) => console.log('Status:', status),
  onMessage: (message) => console.log('Message:', message),
  onStreamUpdate: (text) => console.log('Streaming:', text),
  onConnected: (hello) => console.log('Connected!'),
  onError: (error) => console.error('Error:', error),
});

await client.connect();
await client.sendMessage({ message: 'Hello!' });
```

## API 参考

### GatewayClient 类

#### 构造函数

```typescript
new GatewayClient(options: GatewayClientOptions)
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | WebSocket 连接地址 |
| token | string | 否 | 认证令牌 |
| sessionKey | string | 否 | 会话密钥，默认 `agent:main:main` |
| autoReconnect | boolean | 否 | 是否自动重连，默认 `true` |
| reconnectInterval | number | 否 | 重连间隔（毫秒），默认 `3000` |
| maxReconnectAttempts | number | 否 | 最大重连次数，默认 `10` |
| onStatusChange | function | 否 | 连接状态变化回调 |
| onMessage | function | 否 | 新消息回调 |
| onStreamUpdate | function | 否 | 流式更新回调 |
| onError | function | 否 | 错误回调 |
| onConnected | function | 否 | 连接成功回调 |
| onDisconnected | function | 否 | 断开连接回调 |

#### 方法

##### connect()

连接到 Gateway 服务器。

```typescript
await client.connect(): Promise<GatewayHelloOk>
```

**返回**: Promise<GatewayHelloOk> - 连接成功后的握手响应

**示例**

```typescript
try {
  const hello = await client.connect();
  console.log('Connected to:', hello.server.version);
} catch (error) {
  console.error('Connection failed:', error);
}
```

##### disconnect()

断开与 Gateway 的连接。

```typescript
client.disconnect(): void
```

##### sendMessage()

发送聊天消息。

```typescript
await client.sendMessage(options: SendMessageOptions): Promise<string | null>
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 消息内容 |
| sessionKey | string | 否 | 会话密钥 |
| deliver | boolean | 否 | 是否投递，默认 `false` |
| idempotencyKey | string | 否 | 幂等键 |
| attachments | array | 否 | 附件列表 |

**返回**: Promise<string> - 消息的 runId

**示例**

```typescript
const runId = await client.sendMessage({
  message: 'Hello, how are you?',
  sessionKey: 'agent:main:main'
});
```

##### abort()

中止当前正在生成的响应。

```typescript
await client.abort(options?: AbortOptions): Promise<void>
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionKey | string | 否 | 会话密钥 |
| runId | string | 否 | 要中止的 runId |

**示例**

```typescript
await client.abort();
// 或中止特定的 run
await client.abort({ runId: 'xxx-xxx' });
```

##### loadHistory()

加载聊天历史。

```typescript
await client.loadHistory(sessionKey?: string, limit?: number): Promise<ChatHistoryResponse>
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionKey | string | 否 | 会话密钥 |
| limit | number | 否 | 消息数量限制，默认 `200` |

**返回**: Promise<ChatHistoryResponse>

**示例**

```typescript
const { messages, thinkingLevel } = await client.loadHistory();
messages.forEach(msg => console.log(msg.role, msg.content));
```

##### clearHistory()

清除本地聊天历史（不清除服务器端）。

```typescript
client.clearHistory(): void
```

##### setSessionKey()

设置会话密钥。

```typescript
client.setSessionKey(sessionKey: string): void
```

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| status | ConnectionStatus | 当前连接状态 |
| isConnected | boolean | 是否已连接 |
| messages | ChatMessage[] | 当前会话的所有消息 |
| currentStream | string | 当前流式内容 |
| currentRunId | string \| null | 当前运行的 runId |

### 类型定义

#### ConnectionStatus

连接状态枚举。

```typescript
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
```

#### ChatMessage

聊天消息结构。

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: Array<{ type: string; text?: string }>;
  timestamp?: number;
}
```

#### GatewayHelloOk

连接成功后的握手响应。

```typescript
interface GatewayHelloOk {
  protocol: number;
  server: {
    version: string;
    connId: string;
  };
  features: {
    methods: string[];
    events: string[];
  };
  snapshot: {
    presence: PresenceEntry[];
    health: any;
    stateVersion: any;
    uptimeMs: number;
    configPath: string;
    stateDir: string;
    sessionDefaults: any;
    authMode: string;
  };
  canvasHostUrl: string;
  auth: {
    deviceToken?: string;
    role: string;
    scopes: string[];
    issuedAtMs: number;
  };
  policy: {
    maxPayload: number;
    maxBufferedBytes: number;
    tickIntervalMs: number;
  };
}
```

#### SendMessageOptions

发送消息选项。

```typescript
interface SendMessageOptions {
  message: string;
  sessionKey?: string;
  deliver?: boolean;
  idempotencyKey?: string;
  attachments?: Array<{
    type: string;
    mimeType: string;
    content: string;
  }>;
}
```

## 完整示例

```typescript
import { GatewayClient } from './sdk/index.js';

// 创建客户端
const client = new GatewayClient({
  url: 'ws://127.0.0.1:18789/',
  token: 'your-device-token',

  // 状态变化
  onStatusChange: (status) => {
    console.log('Connection status:', status);
  },

  // 流式更新（实时显示AI回复）
  onStreamUpdate: (text) => {
    updateUI(text); // 实时更新UI
  },

  // 完整消息（AI回复完成）
  onMessage: (message) => {
    if (message.role === 'assistant') {
      console.log('AI回复:', message.content);
    }
  },

  // 错误处理
  onError: (error) => {
    console.error('Error:', error);
  },

  // 连接成功
  onConnected: (hello) => {
    console.log('Connected to Gateway v' + hello.server.version);

    // 加载历史记录
    client.loadHistory().then(({ messages }) => {
      console.log('Loaded', messages.length, 'messages');
    });
  },

  // 断开连接
  onDisconnected: () => {
    console.log('Disconnected from Gateway');
  }
});

async function main() {
  try {
    // 连接
    await client.connect();

    // 发送消息
    await client.sendMessage({
      message: 'Hello! What time is it?'
    });

    // 或者使用 async/await 等待回复
    const response = await new Promise((resolve) => {
      client.onMessage = (msg) => {
        if (msg.role === 'assistant') resolve(msg);
      };
      client.sendMessage({ message: 'Tell me a joke' });
    });

    console.log('Got response:', response);

    // 中止正在生成的回复
    // await client.abort();

    // 断开连接
    // client.disconnect();

  } catch (error) {
    console.error('Failed:', error);
  }
}

main();
```

## 在 React 中使用

```tsx
import React, { useEffect, useState } from 'react';
import { GatewayClient } from './sdk/index.js';

function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [client, setClient] = useState(null);

  useEffect(() => {
    const gwClient = new GatewayClient({
      url: 'ws://127.0.0.1:18789/',
      token: 'your-token',
      onStatusChange: setStatus,
      onMessage: (msg) => setMessages(prev => [...prev, msg]),
      onStreamUpdate: (text) => setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: [{ text }] }];
        }
        return [...prev, { role: 'assistant', content: [{ text }] }];
      })
    });

    gwClient.connect();
    setClient(gwClient);

    return () => gwClient.disconnect();
  }, []);

  const handleSend = () => {
    if (input.trim() && client) {
      client.sendMessage({ message: input });
      setInput('');
    }
  };

  return (
    <div>
      <div>Status: {status}</div>
      <div>
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content[0]?.text}
          </div>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

## 在 Vue 中使用

```vue
<template>
  <div>
    <div>Status: {{ status }}</div>
    <div v-for="(msg, i) in messages" :key="i" :class="msg.role">
      {{ msg.content[0]?.text }}
    </div>
    <input v-model="input" @keyup.enter="send" />
    <button @click="send">Send</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { GatewayClient } from './sdk/index.js';

const status = ref('disconnected');
const messages = ref([]);
const input = ref('');
let client = null;

onMounted(() => {
  client = new GatewayClient({
    url: 'ws://127.0.0.1:18789/',
    token: 'your-token',
    onStatusChange: (s) => status.value = s,
    onMessage: (msg) => messages.value.push(msg),
    onStreamUpdate: (text) => {
      const last = messages.value[messages.value.length - 1];
      if (last?.role === 'assistant') {
        last.content[0].text = text;
      } else {
        messages.value.push({ role: 'assistant', content: [{ text }] });
      }
    }
  });
  client.connect();
});

const send = () => {
  if (input.value.trim() && client) {
    client.sendMessage({ message: input.value });
    input.value = '';
  }
};

onUnmounted(() => client?.disconnect());
</script>
```

## 在 Node.js 中使用

SDK 主要设计用于浏览器环境，但在 Node.js 中也能工作（需要 polyfill WebSocket）:

```javascript
// 需要 ws 模块: npm install ws
// 注意: Node.js 中使用需要自行处理 WebSocket polyfill

import { WebSocket } from 'ws';
globalThis.WebSocket = WebSocket;

import { GatewayClient } from './sdk/index.js';

const client = new GatewayClient({
  url: 'ws://127.0.0.1:18789/',
  token: 'your-token',
  onMessage: (msg) => console.log(msg)
});

await client.connect();
await client.sendMessage({ message: 'Hello from Node.js!' });
```

## 错误处理

```typescript
try {
  await client.connect();
} catch (error) {
  if (error.message.includes('Connection timeout')) {
    // 处理超时
  } else if (error.message.includes('authentication')) {
    // 处理认证失败
  }
}

// 实时错误
client.onError = (error) => {
  console.error('Gateway error:', error);
};
```

## 最佳实践

1. **始终处理错误**: 使用 try-catch 和 onError 回调
2. **设置重连**: 默认启用自动重连，可根据需要调整参数
3. **管理状态**: 使用 status 属性检查连接状态后再发送消息
4. **清理资源**: 组件卸载时调用 disconnect()
5. **使用幂等键**: 长时间运行的任务使用 idempotencyKey 防止重复
