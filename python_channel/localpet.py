"""LocalPet channel - WebSocket server for desktop pet connection."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from loguru import logger

from nanobot.bus.events import InboundMessage, OutboundMessage
from nanobot.bus.queue import MessageBus
from nanobot.channels.base import BaseChannel


class LocalPetChannel(BaseChannel):
    """
    LocalPet channel using WebSocket server.

    Connects to Tauri desktop pet application via WebSocket.
    """

    name = "localpet"

    def __init__(self, config: "LocalPetConfig", bus: MessageBus):
        super().__init__(config, bus)
        self.config: LocalPetConfig = config
        self._server: asyncio.Server | None = None
        self._clients: set[asyncio.WebSocketServerProtocol] = set()
        self._client_lock = asyncio.Lock()

    async def start(self) -> None:
        """Start the WebSocket server."""
        self._running = True

        host = self.config.host
        port = self.config.port

        logger.info(f"Starting LocalPet WebSocket server on {host}:{port}...")

        self._server = await asyncio.start_server(
            self._handle_client,
            host,
            port,
        )

        async with self._server.serve_forever():
            pass

    async def stop(self) -> None:
        """Stop the WebSocket server."""
        self._running = False

        # Close all clients
        async with self._client_lock:
            for client in list(self._clients):
                try:
                    await client.close()
                except Exception:
                    pass
            self._clients.clear()

        # Stop server
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None

        logger.info("LocalPet WebSocket server stopped")

    async def send(self, msg: OutboundMessage) -> None:
        """Send a message to the connected desktop client."""
        async with self._client_lock:
            if not self._clients:
                logger.warning("No connected LocalPet client")
                return

            # MVP: send to first connected client
            client = next(iter(self._clients))

            try:
                # 构建消息体
                payload = {
                    "type": "message",
                    "content": msg.content,
                    "chat_id": msg.chat_id,
                    "sender_id": msg.sender_id,
                }

                # 如果有媒体，添加媒体信息
                if msg.media:
                    payload["media"] = msg.media

                await client.send_json(payload)
                logger.debug(f"Sent message to LocalPet: {msg.content[:50]}...")

            except Exception as e:
                logger.error(f"Error sending to LocalPet client: {e}")

    async def _handle_client(
        self,
        client: asyncio.WebSocketServerProtocol,
        server: asyncio.Server
    ) -> None:
        """Handle a new WebSocket client connection."""
        async with self._client_lock:
            self._clients.add(client)

        logger.info(f"LocalPet client connected: {client.peer}")

        try:
            async for raw_msg in client:
                try:
                    data = json.loads(raw_msg)

                    msg_type = data.get("type")

                    if msg_type == "message":
                        await self._handle_message(data)
                    elif msg_type == "ping":
                        await client.send_json({"type": "pong"})
                    else:
                        logger.warning(f"Unknown message type: {msg_type}")

                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from client: {raw_msg}")
                except Exception as e:
                    logger.error(f"Error handling client message: {e}")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Client connection error: {e}")
        finally:
            async with self._client_lock:
                self._clients.discard(client)
            logger.info(f"LocalPet client disconnected: {client.peer}")

    async def _handle_message(self, data: dict[str, Any]) -> None:
        """Handle incoming message from desktop client."""
        content = data.get("content", "")
        sender_id = data.get("sender_id", "localpet_user")
        chat_id = data.get("chat_id", "localpet")

        logger.debug(f"LocalPet message: {content[:50]}...")

        # Forward to the message bus
        msg = InboundMessage(
            channel=self.name,
            sender_id=str(sender_id),
            chat_id=str(chat_id),
            content=content,
            media=data.get("media", []),
            metadata=data.get("metadata", {}),
            session_key_override=None,
        )

        await self.bus.publish_inbound(msg)


# Forward reference
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from nanobot.config.schema import LocalPetConfig
