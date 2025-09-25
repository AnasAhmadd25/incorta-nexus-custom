import asyncio
import json
import websockets
import base64
import tempfile
import os
from typing import Optional
from contextlib import AsyncExitStack
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models import BaseChatModel
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from .logger import logger
from dotenv import load_dotenv
import asyncio
import json
import websockets
import tempfile
import base64
import os
import sys
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from upload_files import FileHandlerFactory

load_dotenv()

class IncortaMCPClient:
    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.mcp_client = None
        self.agent = None
        self.llm = None
        self.current_model = "claude"  # Default model
        self.websocket = None
        self.current_credentials = None
        self.conversation_history = []

    def create_llm(self, provider: str, **kwargs) -> BaseChatModel:
        """Factory function to create different LLM instances"""
        
        if provider.lower() == "anthropic" or provider.lower() == "claude":
            api_key = kwargs.get("api_key", os.getenv("ANTHROPIC_API_KEY"))
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
            
            return ChatAnthropic(
                model=kwargs.get("model", "claude-3-7-sonnet-20250219"),
                api_key=api_key,
                temperature=kwargs.get("temperature", 0.7)
            )
        
        elif provider.lower() == "google" or provider.lower() == "gemini":
            api_key = kwargs.get("api_key", os.getenv("GEMINI_API_KEY"))
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable is not set")
                
            logger.info(f"Creating Gemini with API key: {api_key[:10]}...")
            
            return ChatGoogleGenerativeAI(
                model=kwargs.get("model", "gemini-2.5-flash-lite"),
                google_api_key=api_key,
                temperature=kwargs.get("temperature", 0.7)
            )
        
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def initialize_agent(self, model_name: str = "claude"):
        """Initialize the langchain agent with specified model"""
        try:
            logger.info(f"Initializing agent with model: {model_name}")
            
            # Create LLM based on model choice
            if model_name.lower() in ["claude", "anthropic"]:
                logger.info("Creating Anthropic Claude LLM")
                try:
                    self.llm = self.create_llm("anthropic")
                    self.current_model = "claude"
                except Exception as e:
                    logger.error(f"Failed to create Claude LLM: {e}")
                    raise ValueError(f"Failed to create Claude LLM: {e}")
            elif model_name.lower() in ["gemini", "google"]:
                logger.info("Creating Google Gemini LLM")
                try:
                    self.llm = self.create_llm("google")
                    self.current_model = "gemini"
                except Exception as e:
                    logger.error(f"Failed to create Gemini LLM: {e}")
                    raise ValueError(f"Failed to create Gemini LLM: {e}")
            else:
                raise ValueError(f"Unsupported model: {model_name}")
                
            logger.info(f"LLM created successfully: {type(self.llm)}")
                
            # Initialize MCP client if not already done
            if not self.mcp_client and self.current_credentials:
                logger.info("Initializing MCP client")
                self.mcp_client = MultiServerMCPClient({
                    "Incorta MCP Server": {
                        "url": "https://incorta-mcp.incortaops.com/mcp/",
                        "headers": {
                            "env-url": self.current_credentials.get("envUrl"),
                            "tenant": self.current_credentials.get("tenant"),
                            "incorta-username": self.current_credentials.get("incortaUsername"),
                            "access-token": self.current_credentials.get("accessToken"),
                            "sqlx-host": self.current_credentials.get("sqlxHost"),
                        },
                        "transport": "streamable_http",
                    }
                })
                
                # Get tools from MCP server
                tools = await self.mcp_client.get_tools()
                logger.info(f"Available tools: {[tool.name for tool in tools]}")
                
                # Create agent with LLM and tools
                self.agent = create_react_agent(model=self.llm, tools=tools)
                
            elif self.mcp_client:
                # Just recreate agent with new LLM if MCP client exists
                logger.info("Recreating agent with new LLM")
                tools = await self.mcp_client.get_tools()
                self.agent = create_react_agent(model=self.llm, tools=tools)
                
            logger.info(f"Agent initialized with model: {self.current_model}")
            
        except Exception as e:
            logger.error(f"Error initializing agent: {e}")
            raise

    def _make_serializable(self, obj):
        """Convert objects to JSON serializable format"""
        if hasattr(obj, 'text'):
            return obj.text
        elif hasattr(obj, '__dict__'):
            return {k: self._make_serializable(v) for k, v in obj.__dict__.items()}
        elif isinstance(obj, list):
            return [self._make_serializable(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: self._make_serializable(v) for k, v in obj.items()}
        else:
            return str(obj) if not isinstance(obj, (str, int, float, bool, type(None))) else obj

    async def send_message(self, message_type: str, data: dict):
        """Send message to WebSocket client if connected"""
        if self.websocket:
            try:
                if message_type == "tool_result" and "result" in data:
                    result = data["result"]
                    if isinstance(result, list) and len(result) > 0:
                        if hasattr(result[0], 'text'):
                            data["result"] = [item.text for item in result]
                        elif hasattr(result[0], '__dict__'):
                            data["result"] = [self._make_serializable(item) for item in result]
                
                serializable_data = self._make_serializable(data)
                
                message = json.dumps({
                    "type": message_type,
                    "data": serializable_data,
                    "timestamp": asyncio.get_event_loop().time()
                })
                await self.websocket.send(message)
            except Exception as e:
                logger.error(f"Failed to send WebSocket message: {e}")

    async def clear_conversation(self):
        """Clear the conversation history"""
        self.conversation_history = []
        logger.info("Conversation history cleared")
        await self.send_message("conversation_cleared", {"status": "success"})

    def _make_serializable(self, obj):
        """Convert objects to JSON serializable format"""
        if hasattr(obj, 'text'):
            return obj.text
        elif hasattr(obj, '__dict__'):
            return {k: self._make_serializable(v) for k, v in obj.__dict__.items()}
        elif isinstance(obj, list):
            return [self._make_serializable(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: self._make_serializable(v) for k, v in obj.items()}
        else:
            return str(obj) if not isinstance(obj, (str, int, float, bool, type(None))) else obj

    async def send_message(self, message_type: str, data: dict):
        """Send message to WebSocket client if connected"""
        if self.websocket:
            try:
                if message_type == "tool_result" and "result" in data:
                    result = data["result"]
                    if isinstance(result, list) and len(result) > 0:
                        if hasattr(result[0], 'text'):
                            data["result"] = [item.text for item in result]
                        elif hasattr(result[0], '__dict__'):
                            data["result"] = [self._make_serializable(item) for item in result]
                
                serializable_data = self._make_serializable(data)
                
                message = json.dumps({
                    "type": message_type,
                    "data": serializable_data,
                    "timestamp": asyncio.get_event_loop().time()
                })
                await self.websocket.send(message)
            except Exception as e:
                logger.error(f"Failed to send WebSocket message: {e}")

    async def process_query(self, query: str) -> str:
        """Process a query using langchain agent with WebSocket streaming"""
        if not self.agent:
            await self.send_message("error", {"message": "Agent not initialized. Please authenticate first."})
            return "Agent not initialized"
            
        # Add to conversation history
        messages = [{"role": "user", "content": query}]

        await self.send_message("user_message", {
            "content": query,
            "role": "user"
        })

        try:
            await self.send_message("thinking", {
                "message": f"Processing request with {self.current_model}..."
            })

            response_content = ""
            current_tool_name = None
            current_tool_id = None
            
            logger.info(f"Starting agent stream with model: {self.current_model}")
            
            # Stream the agent response
            async for chunk in self.agent.astream({"messages": messages}):
                logger.info(f"Received chunk keys: {list(chunk.keys())}")
                logger.info(f"Full chunk content: {chunk}")
                
                if "agent" in chunk:
                    agent_message = chunk["agent"]["messages"][0]
                    logger.info(f"Agent message type: {type(agent_message)}")
                    logger.info(f"Agent message content: {agent_message.content}")
                    logger.info(f"Agent message dict: {agent_message.__dict__ if hasattr(agent_message, '__dict__') else 'no dict'}")
                    
                    # Check if this message has tool calls directly
                    if hasattr(agent_message, 'tool_calls') and agent_message.tool_calls:
                        logger.info(f"Found tool_calls: {agent_message.tool_calls}")
                        for tool_call in agent_message.tool_calls:
                            # Handle both dictionary and object formats
                            if isinstance(tool_call, dict):
                                current_tool_name = tool_call.get("name", tool_call.get("function", {}).get("name", "unknown"))
                                current_tool_id = tool_call.get("id", f"tool_{current_tool_name}_{int(asyncio.get_event_loop().time())}")
                                tool_args = tool_call.get("args", tool_call.get("function", {}).get("arguments", {}))
                            else:
                                # Handle object format
                                current_tool_name = getattr(tool_call, 'name', getattr(tool_call, 'function', {}).get('name', 'unknown'))
                                current_tool_id = getattr(tool_call, 'id', f"tool_{current_tool_name}_{int(asyncio.get_event_loop().time())}")
                                tool_args = getattr(tool_call, 'args', getattr(tool_call, 'function', {}).get('arguments', {}))
                            
                            logger.info(f"Tool call detected via tool_calls - name: {current_tool_name}, id: {current_tool_id}")
                            
                            await self.send_message("tool_call", {
                                "tool_name": current_tool_name,
                                "tool_args": tool_args,
                                "tool_id": current_tool_id
                            })
                    
                    if isinstance(agent_message.content, str):
                        # Handle string content - send full content each time
                        content = agent_message.content
                        response_content = content
                        
                        await self.send_message("assistant_message", {
                            "content": content,
                            "role": "assistant",
                            "type": "text",
                            "model": self.current_model
                        })
                        
                    elif isinstance(agent_message.content, list):
                        logger.info(f"Processing content list with {len(agent_message.content)} parts")
                        for i, part in enumerate(agent_message.content):
                            logger.info(f"Processing content part {i}: {part}")
                            
                            if isinstance(part, dict):
                                if "text" in part and part["text"]:
                                    # Handle text part - send full content each time
                                    content = part["text"]
                                    response_content = content
                                    
                                    await self.send_message("assistant_message", {
                                        "content": content,
                                        "role": "assistant",
                                        "type": "text",
                                        "model": self.current_model
                                    })
                                    
                                elif "name" in part and part["name"]:
                                    current_tool_name = part["name"]
                                    current_tool_id = part.get("id", f"tool_{current_tool_name}_{int(asyncio.get_event_loop().time())}")
                                    logger.info(f"Tool call detected via content part - name: {current_tool_name}, id: {current_tool_id}")
                                    
                                    await self.send_message("tool_call", {
                                        "tool_name": current_tool_name,
                                        "tool_args": part.get("input", part.get("arguments", {})),
                                        "tool_id": current_tool_id
                                    })
                            elif hasattr(part, '__dict__'):
                                # Handle object format
                                logger.info(f"Processing part object: {part.__dict__}")
                                if hasattr(part, 'name') and part.name:
                                    current_tool_name = part.name
                                    current_tool_id = getattr(part, 'id', f"tool_{current_tool_name}_{int(asyncio.get_event_loop().time())}")
                                    tool_args = getattr(part, 'input', getattr(part, 'arguments', {}))
                                    logger.info(f"Tool call detected via part object - name: {current_tool_name}, id: {current_tool_id}")
                                    
                                    await self.send_message("tool_call", {
                                        "tool_name": current_tool_name,
                                        "tool_args": tool_args,
                                        "tool_id": current_tool_id
                                    })
                
                elif "tools" in chunk:
                    logger.info(f"Processing tools chunk: {chunk['tools']}")
                    tool_message = chunk["tools"]["messages"][0]
                    tool_result = tool_message.content
                    
                    logger.info(f"Tool result received - tool_name: {current_tool_name}, tool_id: {current_tool_id}")
                    
                    await self.send_message("tool_result", {
                        "tool_name": current_tool_name or "unknown",
                        "tool_id": current_tool_id or "",
                        "result": tool_result
                    })

            await self.send_message("completed", {
                "final_response": response_content,
                "model": self.current_model
            })
            
            return response_content

        except Exception as e:
            logger.error(f"Error in process_query: {e}")
            await self.send_message("error", {
                "message": f"Error processing query: {str(e)}",
                "model": self.current_model
            })
            return f"Error: {str(e)}"

    async def clear_conversation(self):
        """Clear the conversation history"""
        self.conversation_history = []
        logger.info("Conversation history cleared")
        await self.send_message("conversation_cleared", {"status": "success"})

    def process_uploaded_file(self, file_data: dict) -> str:
        """Process uploaded file and extract text content"""
        try:
            # Decode base64 
            file_content = base64.b64decode(file_data['content'])
            file_name = file_data['name']
            file_size = file_data['size']
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_name)[1]) as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            try:
                # Use FileHandlerFactory to process the file
                handler = FileHandlerFactory.create_handler(temp_path)
                extracted_text = handler.get_text()
                processed_text = handler.add_text(extracted_text)
                
                # Add file metadata
                file_info = f"\n\n--- FILE: {file_name} ({file_size} bytes) ---\n"
                file_info += f"File Type: {handler.file_type}\n"
                file_info += f"Content:\n{processed_text}\n"
                file_info += f"--- END OF FILE: {file_name} ---\n\n"
                
                return file_info
                
            finally:
                # clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            logger.error(f"Error processing file {file_data.get('name', 'unknown')}: {e}")
            return f"\n\n--- FILE PROCESSING ERROR: {file_data.get('name', 'unknown')} ---\n" \
                   f"Error: {str(e)}\n" \
                   f"--- END OF FILE ERROR ---\n\n"


    async def start_websocket_server(self, host="0.0.0.0", port=9201):
        """Start WebSocket server"""
        logger.info(f"Starting WebSocket server on {host}:{port}")
        async with websockets.serve(self.handle_websocket, host, port):
            await asyncio.Future() 

    async def handle_websocket(self, websocket):
        """Handle WebSocket connections"""
        self.websocket = websocket
        logger.info(f"WebSocket: {websocket}")

        try:
            await self.send_message("connected", {"status": "ready"})
            
            logger.info("WebSocket client connected")
            async for message in websocket:
                try:
                    data = json.loads(message)
                    logger.info(f"Received WebSocket message: {data}")

                    if data.get("type") == "authenticate":
                        credentials = data.get("credentials")
                        logger.info(f"Received authentication request: {credentials}")
                        await self.authenticate_user(credentials)
                        
                    elif data.get("type") == "set_model":
                        if not self.current_credentials:
                            await self.send_message("error", {"message": "Please authenticate first"})
                            continue
                            
                        model_name = data.get("model", "claude")
                        logger.info(f"Received set_model request: {model_name}")
                        try:
                            await self.initialize_agent(model_name)
                            await self.send_message("model_switched", {
                                "model": self.current_model,
                                "message": f"Successfully switched to {self.current_model}"
                            })
                            logger.info(f"Model switched to: {self.current_model}")
                        except Exception as e:
                            error_msg = f"Failed to switch to {model_name}: {str(e)}"
                            await self.send_message("model_switch_failed", {
                                "error": error_msg,
                                "message": error_msg
                            })
                            logger.error(f"Model switch failed: {e}")
                            import traceback
                            logger.error(f"Traceback: {traceback.format_exc()}")
                        
                    elif data.get("type") == "query":
                        if not self.current_credentials:
                            await self.send_message("error", {"message": "Please authenticate first"})
                            continue
                            
                        query = data.get("query", "")
                        files = data.get("files", [])
                        
                        # Handle file processing if files are provided
                        file_contents = []
                        if files:
                            file_info = []
                            for file in files:
                                try:
                                    # Send file processing status
                                    await self.send_message("file_processed", {
                                        "file_name": file.get('name'),
                                        "file_size": file.get('size'),
                                        "file_type": file.get('type'),
                                        "status": "processing"
                                    })
                                    
                                    # Process file and extract text
                                    file_text = self.process_uploaded_file(file)
                                    file_contents.append(file_text)
                                    file_info.append(f"{file.get('name')} ({file.get('size')} bytes)")
                                    
                                    # Send successful processing status
                                    await self.send_message("file_processed", {
                                        "file_name": file.get('name'),
                                        "file_size": file.get('size'),
                                        "file_type": file.get('type'),
                                        "status": "completed"
                                    })
                                    
                                except Exception as e:
                                    logger.error(f"Error processing file {file.get('name')}: {e}")
                                    await self.send_message("file_error", {
                                        "file_name": file.get('name'),
                                        "error": str(e)
                                    })
                                    file_info.append(f"{file.get('name')} (processing failed)")
                            
                            # Send files uploaded confirmation
                            await self.send_message("files_uploaded", {
                                "message": f"Successfully processed {len(files)} file(s): {', '.join(file_info)}"
                            })
                            
                            # Combine all file contents
                            all_file_content = "".join(file_contents)
                            
                            # Modify query to include file context
                            if query:
                                query = f"{query}\n\nUploaded files content:\n{all_file_content}"
                            else:
                                query = f"I have uploaded {len(files)} file(s). Please analyze their content:\n{all_file_content}"
                        
                        await self.process_query(query)
                    
                    elif data.get("type") == "upload_files":
                        if not self.current_credentials:
                            await self.send_message("error", {"message": "Please authenticate first"})
                            continue
                            
                        files = data.get("files", [])
                        if files:
                            file_info = []
                            file_contents = []
                            
                            for file in files:
                                try:
                                    # Send file processing status
                                    await self.send_message("file_processed", {
                                        "file_name": file.get('name'),
                                        "file_size": file.get('size'),
                                        "file_type": file.get('type'),
                                        "status": "processing"
                                    })
                                    
                                    # Process file and extract text
                                    file_text = self.process_uploaded_file(file)
                                    file_contents.append(file_text)
                                    file_info.append(f"{file.get('name')} ({file.get('size')} bytes)")
                                    
                                    # Send successful processing status
                                    await self.send_message("file_processed", {
                                        "file_name": file.get('name'),
                                        "file_size": file.get('size'),
                                        "file_type": file.get('type'),
                                        "status": "completed"
                                    })
                                    
                                except Exception as e:
                                    logger.error(f"Error processing file {file.get('name')}: {e}")
                                    await self.send_message("file_error", {
                                        "file_name": file.get('name'),
                                        "error": str(e)
                                    })
                                    file_info.append(f"{file.get('name')} (processing failed)")
                            
                            # send files uploaded confirmation with summary
                            all_file_content = "".join(file_contents)
                            await self.send_message("files_uploaded", {
                                "message": f"Successfully processed {len(files)} file(s): {', '.join(file_info)}",
                                "content_preview": all_file_content[:500] + "..." if len(all_file_content) > 500 else all_file_content
                            })
                    
                    elif data.get("type") == "clear_conversation":
                        await self.clear_conversation()
                        
                except json.JSONDecodeError:
                    await self.send_message("error", {"message": "Invalid JSON format"})
                except Exception as e:
                    await self.send_message("error", {"message": str(e)})
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket client disconnected")
        finally:
            self.websocket = None

    async def authenticate_user(self, credentials):
        """Authenticate user with provided credentials"""
        try:
            self.conversation_history = []
            self.current_credentials = credentials
            
            # Initialize agent with default model (claude)
            await self.initialize_agent("claude")
            
            await self.send_message("authenticated", {
                "status": "success",
                "model": self.current_model
            })
            logger.info(f"User authenticated: {credentials.get('incortaUsername')} with model: {self.current_model}")
            
        except Exception as e:
            await self.send_message("authentication_failed", {"message": str(e)})
            logger.error(f"Authentication failed: {e}")

    async def cleanup(self):
        """Clean up resources"""
        await self.exit_stack.aclose()


async def main():
    client = IncortaMCPClient()
    try:
        await client.start_websocket_server()
    finally:
        await client.cleanup()

if __name__ == "__main__":
    asyncio.run(main())