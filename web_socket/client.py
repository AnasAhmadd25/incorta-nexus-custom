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
        self.tool_usage_cache = {}  # Track which tools were used recently

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
            
        # Add user message to conversation history
        user_message = {"role": "user", "content": query}
        self.conversation_history.append(user_message)
        
        # Add system instruction to avoid unnecessary tool calls
        system_context = ""
        if len(self.conversation_history) > 2:
            # Check for recently used tools
            recent_tools = []
            current_time = asyncio.get_event_loop().time()
            for tool_name, usage_info in self.tool_usage_cache.items():
                # Consider tools used in the last 5 minutes as recent
                if current_time - usage_info["timestamp"] < 300:  
                    recent_tools.append(tool_name)
            
            if self.current_model == "gemini":
                # Gemini-specific context to emphasize conversation awareness
                system_context = """You are continuing a conversation with a user. IMPORTANT: Review the conversation history carefully before responding. 
                
Use information from previous messages when possible. Only call tools if you need NEW or UPDATED information that wasn't already provided in this conversation.
                
If the user asks about something that was already discussed or shown in previous messages, refer to that information instead of making new tool calls.
                
Pay special attention to:
- Schema information that was already retrieved
- Data that was already queried or displayed
- Questions that were already answered
- Context from previous user messages and your responses"""
                
                if recent_tools:
                    system_context += f"\n\nRecently used tools in this conversation: {', '.join(recent_tools)}. Check if their results are already available in the conversation history before calling them again."
                    
            else:
                # Claude-specific context (more specific about tool usage)
                system_context = """You are continuing a conversation. Use information from previous responses when possible. 

IMPORTANT: Only call tools if you need NEW or UPDATED information that wasn't already provided in this conversation.

Before calling any tool, check if:
- Schema information was already retrieved (look for messages about "schemas retrieved" or "schema information")
- Table data was already queried
- The same or similar information was already obtained

If you see that schemas, tables, or other data were already retrieved in this conversation, refer to that previous information instead of calling the same tools again.

Only use tools when you need genuinely new information that wasn't provided in the recent conversation history."""
                
                if recent_tools:
                    system_context += f"\n\nRecently used tools in this conversation: {', '.join(recent_tools)}. Their results should be available in the conversation history - avoid calling them again unless you need updated information."
        
        # Prepare messages with system context if needed
        messages = []
        if system_context:
            messages.append({"role": "system", "content": system_context})
        messages.extend(self.conversation_history.copy())

        # Debug: Log what we're sending to the model
        logger.info(f"Sending {len(messages)} messages to {self.current_model}")
        for i, msg in enumerate(messages):
            content_preview = msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"]
            logger.info(f"Message {i}: {msg['role']} - {content_preview}")

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
            logger.info(f"Conversation history length: {len(self.conversation_history)}")
            
            # Stream the agent response
            async for chunk in self.agent.astream({"messages": messages}):
                logger.info(f"Received chunk keys: {list(chunk.keys())}")
                logger.info(f"Full chunk content: {chunk}")
                
                if "agent" in chunk:
                    agent_message = chunk["agent"]["messages"][0]
                    logger.info(f"Agent message type: {type(agent_message)}")
                    logger.info(f"Agent message content: {agent_message.content}")
                    logger.info(f"Agent message dict: {agent_message.__dict__ if hasattr(agent_message, '__dict__') else 'no dict'}")
                    
                    # Special handling for Gemini models
                    if self.current_model == "gemini":
                        logger.info("GEMINI: Checking for tool calls")
                        if hasattr(agent_message, 'tool_calls'):
                            logger.info(f"GEMINI: tool_calls found: {len(agent_message.tool_calls)}")
                    
                    
                    # Check if this message has tool calls directly
                    has_tool_calls = hasattr(agent_message, 'tool_calls') and agent_message.tool_calls
                    sent_contextual_message = False
                    
                    if has_tool_calls:
                        logger.info(f"Found tool_calls: {agent_message.tool_calls}")
                        
                        # For Gemini, if content is empty but we have tool calls, send a contextual message
                        if (self.current_model == "gemini" and 
                            (not agent_message.content or agent_message.content == "")):
                            tool_names = [tool_call.get("name", "unknown") if isinstance(tool_call, dict) 
                                        else getattr(tool_call, 'name', 'unknown') 
                                        for tool_call in agent_message.tool_calls]
                            contextual_message = f"I'll help you with that. Let me use the {', '.join(tool_names)} tool{'s' if len(tool_names) > 1 else ''} to get the information you need."
                            
                            await self.send_message("assistant_message", {
                                "content": contextual_message,
                                "role": "assistant", 
                                "type": "text",
                                "model": self.current_model
                            })
                            sent_contextual_message = True
                            # dont set response_content here - wait for actual content
                            # response_content = contextual_message
                        
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
                    
                    # Also check for invalid_tool_calls
                    if hasattr(agent_message, 'invalid_tool_calls') and agent_message.invalid_tool_calls:
                        logger.warning(f"GEMINI WARNING: Found invalid tool calls: {agent_message.invalid_tool_calls}")
                        for invalid_call in agent_message.invalid_tool_calls:
                            logger.warning(f"Invalid tool call details: {invalid_call}")
                    
                    # process content regardless of whether we sent a contextual message
                    # We need to capture the actual response content for conversation history
                    if isinstance(agent_message.content, str):
                        # send full content each time
                        content = agent_message.content
                        # Only send if content is not empty and not just whitespace
                        if content and content.strip():
                            response_content = content
                            
                            logger.info(f"Sending assistant message with content: {content[:100]}...")
                            
                            # only send to UI if we haven't already sent a contextual message
                            if not sent_contextual_message:
                                await self.send_message("assistant_message", {
                                    "content": content,
                                    "role": "assistant",
                                    "type": "text",
                                    "model": self.current_model
                                })
                        else:
                            logger.info(f"Skipping empty string content for {self.current_model}")
                        
                    elif isinstance(agent_message.content, list):
                        logger.info(f"Processing content list with {len(agent_message.content)} parts")
                        text_parts = []
                        
                        for i, part in enumerate(agent_message.content):
                            logger.info(f"Processing content part {i}: {part}")
                            
                            if isinstance(part, dict):
                                if "text" in part and part["text"] and part["text"].strip():
                                    #  non-empty text
                                    text_parts.append(part["text"].strip())
                                    
                                elif "name" in part and part["name"]:
                                    # Skip tool_use parts - they're handled by tool_calls attribute
                                    logger.info(f"Skipping tool_use part in content - handled by tool_calls")
                                    
                            elif hasattr(part, '__dict__'):
                                # Handle object format
                                logger.info(f"Processing part object: {part.__dict__}")
                                if hasattr(part, 'text') and part.text and part.text.strip():
                                    text_parts.append(part.text.strip())
                        
                        # Send combined text if any non-empty text parts found
                        if text_parts:
                            content = "\n".join(text_parts)
                            response_content = content
                            
                            logger.info(f"Sending combined assistant message: {content[:100]}...")
                            
                            # only send to UI if we haven't already sent a contextual message
                            if not sent_contextual_message:
                                await self.send_message("assistant_message", {
                                    "content": content,
                                    "role": "assistant",
                                    "type": "text",
                                    "model": self.current_model
                                })
                        else:
                            logger.info(f"No non-empty text parts found in content list for {self.current_model}")
                    else:
                        logger.info(f"Content processing completed - contextual message was sent for {self.current_model}")
                
                elif "tools" in chunk:
                    logger.info(f"Processing tools chunk: {chunk['tools']}")
                    tool_message = chunk["tools"]["messages"][0]
                    tool_result = tool_message.content
                    
                    logger.info(f"Tool result received - tool_name: {current_tool_name}, tool_id: {current_tool_id}")
                    
                    # Add tool result to conversation history for context
                    if current_tool_name and tool_result:
                        # Track tool usage for context
                        self.tool_usage_cache[current_tool_name] = {
                            "timestamp": asyncio.get_event_loop().time(),
                            "result_size": len(str(tool_result)) if tool_result else 0
                        }
                        
                        # create a structured tool result message for conversation history
                        tool_result_summary = f"Tool '{current_tool_name}' executed successfully."
                        
                        # add a concise summary for common tools to avoid huge conversation history
                        if "schema" in current_tool_name.lower():
                            if isinstance(tool_result, list) and len(tool_result) > 0:
                                tool_result_summary += f" Retrieved {len(tool_result)} schemas."
                                # add specific schema names for better context
                                if len(tool_result) <= 10:  # only if not too many
                                    try:
                                        schema_names = [item.get('schemaName', 'Unknown') for item in tool_result if isinstance(item, dict)]
                                        if schema_names:
                                            tool_result_summary += f" Schemas: {', '.join(schema_names[:5])}"
                                            if len(schema_names) > 5:
                                                tool_result_summary += f" and {len(schema_names) - 5} more."
                                    except:
                                        pass
                            elif isinstance(tool_result, str) and "schema" in tool_result.lower():
                                tool_result_summary += " Schema information retrieved."
                            else:
                                tool_result_summary += " Schema data available."
                        elif "table" in current_tool_name.lower():
                            tool_result_summary += " Table information retrieved."
                        elif "query" in current_tool_name.lower():
                            tool_result_summary += " Query executed successfully."
                        else:
                            # for other tools, add a brief description
                            tool_result_summary += f" Data retrieved."
                        
                        # add to conversation history (assistant message with tool context)
                        tool_context_message = {"role": "assistant", "content": tool_result_summary}
                        self.conversation_history.append(tool_context_message)
                        logger.info(f"Added tool result to conversation history: {tool_result_summary}")
                    
                    await self.send_message("tool_result", {
                        "tool_name": current_tool_name or "unknown",
                        "tool_id": current_tool_id or "",
                        "result": tool_result
                    })

            await self.send_message("completed", {
                "final_response": response_content,
                "model": self.current_model
            })
            
            # Add assistant response to conversation history
            if response_content:
                assistant_message = {"role": "assistant", "content": response_content}
                self.conversation_history.append(assistant_message)
                logger.info(f"Added assistant response to history. Total messages: {len(self.conversation_history)}")
                logger.info(f"Assistant response content preview: {response_content[:200]}...")
            else:
                logger.warning(f"No response content to add to conversation history for {self.current_model}")
            
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
        self.tool_usage_cache = {}  # Also clear tool usage cache
        logger.info("Conversation history and tool cache cleared")
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
                            
                            # Automatically analyze the uploaded files
                            analysis_query = f"Please analyze the following {len(files)} uploaded file(s), where user uploaded them to you to see the data or what he want to consider in his chat and provide a summary of their content:\n\n{all_file_content}"
                            await self.process_query(analysis_query)
                    
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
            self.tool_usage_cache = {}  # Clear tool cache on new authentication
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