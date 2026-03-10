# LocalPet Channel for nanobot

本目录包含 LocalPet Channel 实现，需要集成到 nanobot 中。

## 文件说明

将以下文件复制到 nanobot 项目对应位置：

```
nanobot/nanobot/channels/localpet.py    →  Channel 实现
nanobot/nanobot/config/schema.py         →  添加 LocalPetConfig
nanobot/nanobot/channels/manager.py     →  添加 LocalPetChannel 加载
```

## MVP 版本功能

- WebSocket Server (监听连接)
- 简单的消息收发
- 固定端口 18791
- 不支持多客户端（MVP 简化）
