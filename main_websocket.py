from web_socket.client import IncortaMCPClient
import asyncio

async def main():
    client = IncortaMCPClient()
    try:
        # Start WebSocket server on port 5999 for Docker deployment
        # Authentication and MCP connection will be handled when user authenticates via frontend
        await client.start_websocket_server(host="0.0.0.0", port=5999)
    finally:
        await client.cleanup()

if __name__ == "__main__":
    asyncio.run(main())