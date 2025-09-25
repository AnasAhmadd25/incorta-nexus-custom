#!/bin/bash

# Incorta MCP Client Setup and Test Script

echo "🚀 Starting Incorta MCP Client Test Setup"
echo "========================================"

echo ""
echo "📋 Prerequisites:"
echo "  ✅ Python environment with required packages"
echo "  ✅ Node.js/npm for React frontend"
echo "  ✅ Anthropic API key set in .env file"

echo ""
echo "🔧 Setup Steps:"
echo ""

echo "1️⃣  Start the WebSocket server:"
echo "   cd /path/to/project"
echo "   python main_websocket.py"
echo ""

echo "2️⃣  Start the React frontend (in another terminal):"
echo "   cd Frontend"
echo "   npm run dev"
echo ""

echo "3️⃣  Open browser and navigate to:"
echo "   http://localhost:5173 (or whatever port Vite shows)"
echo ""

echo "🎯  Testing Flow:"
echo "  1. Frontend will auto-connect to ws://localhost:8765"
echo "  2. Click 'Authenticate' (form is pre-filled with test credentials)"
echo "  3. Start chatting! Try: 'What schemas are available in the system?'"
echo ""

echo "🔍  What to look for:"
echo "  • Real-time connection status updates"
echo "  • Authentication success message"
echo "  • Tool execution indicators (🔧 icons)"
echo "  • Thinking states (🤔 Processing...)"
echo "  • Tool results with formatted data"
echo ""

echo "❓  Troubleshooting:"
echo "  • Check console logs in browser DevTools"
echo "  • Verify WebSocket server logs for errors"
echo "  • Ensure Anthropic API key is valid in .env"
echo ""

echo "✅ Ready to test!"