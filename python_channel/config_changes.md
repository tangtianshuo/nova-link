# nanobot 配置修改指南

需要修改以下文件来启用 LocalPet Channel：

## 1. nanobot/config/schema.py

在 `ChannelsConfig` 类中添加 `localpet` 字段：

```python
# 在文件顶部添加新的 Config 类
class LocalPetConfig(Base):
    """Configuration for LocalPet desktop channel."""

    enabled: bool = False
    host: str = "127.0.0.1"
    port: int = 18791
    allow_from: list[str] = Field(default_factory=lambda: ["*"])
```

然后在 `ChannelsConfig` 类中添加：

```python
class ChannelsConfig(Base):
    # ... 其他 channels ...

    localpet: LocalPetConfig = Field(default_factory=LocalPetConfig)
```

## 2. nanobot/channels/manager.py

在 `_init_channels` 方法中添加 LocalPet Channel 加载：

```python
# 在文件顶部添加类型导入
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from nanobot.config.schema import LocalPetConfig

# 在 _init_channels 方法中添加
# LocalPet channel
if self.config.channels.localpet.enabled:
    try:
        from nanobot.channels.localpet import LocalPetChannel
        self.channels["localpet"] = LocalPetChannel(
            self.config.channels.localpet,
            self.bus,
        )
        logger.info("LocalPet channel enabled")
    except ImportError as e:
        logger.warning("LocalPet channel not available: {}", e)
```

## 3. ~/.nanobot/config.json

添加配置：

```json
{
  "channels": {
    "localpet": {
      "enabled": true,
      "host": "127.0.0.1",
      "port": 18791
    }
  }
}
```
