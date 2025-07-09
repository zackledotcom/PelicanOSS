# Systemic Thinking MCP Integration - PelicanOS

## 🧠 Overview

The **Systemic Thinking MCP (Model Context Protocol)** integration brings advanced sequential reasoning capabilities to PelicanOS. This feature allows users to engage in deep, structured problem-solving through step-by-step thinking processes.

## ✨ Features

### Sequential Thinking Engine
- **Step-by-step reasoning**: Break down complex problems into manageable thought sequences
- **Contextual analysis**: Incorporate background information and constraints
- **Reflective processing**: Each step builds upon previous insights
- **Configurable depth**: Adjust the number of thinking steps (3-10 steps)

### Privacy-First Design
- **100% Local Processing**: All thinking processes happen on your machine
- **No Data Sharing**: Thoughts and reasoning never leave your device
- **Secure Architecture**: Following PelicanOS security principles

### User Interface
- **Intuitive Design**: Clean, modern interface for problem input
- **Real-time Status**: See MCP server status and health
- **Detailed Results**: View each thinking step with reasoning
- **Error Handling**: Graceful error messages and recovery

## 🚀 Getting Started

### Prerequisites
The Sequential Thinking MCP server is automatically installed with PelicanOS. No additional setup required.

### Usage

1. **Open PelicanOS** and navigate to the main interface
2. **Click the "Thinking" tab** (sparkle icon) in the tab navigation
3. **Enter your problem statement** in the main input field
4. **Add context** (optional) to provide additional background
5. **Set thinking steps** (3-10) based on problem complexity
6. **Click "Start Thinking"** to begin the analysis

### Example Use Cases

#### Business Strategy
```
Problem: How should we approach entering the European market?
Context: B2B SaaS company, $2M ARR, 50 employees, strong US presence
Steps: 7
```

#### Technical Architecture
```
Problem: Design a scalable microservices architecture for our e-commerce platform
Context: Expected 100k daily users, current monolith handles 10k users
Steps: 10
```

#### Personal Decision Making
```
Problem: Should I accept the job offer or stay at my current company?
Context: Current role: stable, good team, limited growth. New offer: 30% raise, startup environment, equity
Steps: 5
```

## 🏗️ Technical Architecture

### MCP Service Layer
```typescript
// Located at: src/main/services/mcp/mcpService.ts
class MCPService {
  - startServer(serverName: string)
  - stopServer(serverName: string) 
  - sendThinkingRequest(request: MCPThinkingRequest)
  - getServerStatus(serverName: string)
}
```

### IPC Communication
```typescript
// Secure IPC handlers at: src/main/handlers/mcpHandlers.ts
- mcp-start-server
- mcp-stop-server
- mcp-thinking-request
- mcp-get-server-status
```

### Frontend Integration
```typescript
// React component at: src/renderer/src/components/SystemicThinkingPanel.tsx
- Problem input interface
- Context configuration
- Real-time status monitoring
- Results visualization
```

## 🔧 Configuration

### Server Settings
The MCP server runs with the following default configuration:

```json
{
  "name": "sequential-thinking",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
  "autoStart": true,
  "timeout": 30000
}
```

### Environment Variables
- `DISABLE_THOUGHT_LOGGING`: Set to `true` to disable detailed logging (default: `false`)

## 🛠️ Development

### Adding New MCP Servers

1. **Install the MCP server package**:
```bash
npm install @modelcontextprotocol/server-[name]
```

2. **Add server configuration** in `mcpService.ts`:
```typescript
this.servers.set('server-name', {
  name: 'server-name',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-[name]'],
  isRunning: false
})
```

3. **Add IPC handlers** if needed for server-specific functionality

4. **Create UI components** to interact with the new server

### API Reference

#### Starting MCP Server
```typescript
const result = await window.api.mcpStartServer('sequential-thinking')
// Returns: { success: boolean; error?: string }
```

#### Sending Thinking Request
```typescript
const response = await window.api.mcpThinkingRequest({
  prompt: "Your problem statement",
  context: "Additional context",
  maxSteps: 5
})
// Returns: MCPThinkingResponse with thoughts and final answer
```

#### Checking Server Status
```typescript
const status = await window.api.mcpGetServerStatus('sequential-thinking')
// Returns: { isRunning: boolean; exists: boolean }
```

## 🔒 Security & Privacy

### Data Protection
- **No External Calls**: All processing happens locally
- **Input Validation**: All user inputs are sanitized and validated
- **Rate Limiting**: Prevents abuse of MCP services
- **Error Isolation**: Failures don't compromise the main application

### Process Isolation
- **Separate Processes**: MCP servers run in isolated child processes
- **Secure IPC**: Communication through Electron's contextBridge
- **Resource Limits**: Automatic cleanup and timeout handling

## 📊 Performance

### Optimization Features
- **Lazy Loading**: MCP servers start only when needed
- **Connection Pooling**: Reuse existing server connections
- **Timeout Management**: Prevent hanging requests
- **Memory Cleanup**: Automatic process cleanup on app exit

### Resource Usage
- **Memory**: ~50MB per active MCP server
- **CPU**: Low impact during idle, moderate during thinking
- **Storage**: Minimal (logs and temporary files only)

## 🐛 Troubleshooting

### Common Issues

#### MCP Server Won't Start
```
Error: MCP server failed to start
Solution: Check if npx is available in PATH, restart PelicanOS
```

#### Thinking Request Timeout
```
Error: Request timeout
Solution: Reduce complexity or increase maxSteps, check server status
```

#### Connection Errors
```
Error: Cannot communicate with MCP server
Solution: Restart the MCP server via the UI, check system resources
```

### Debug Mode
Enable detailed logging by setting `DISABLE_THOUGHT_LOGGING=false` in the MCP service configuration.

### Log Files
Check the main process logs for MCP-related messages:
- Server startup/shutdown events
- Request/response cycles
- Error conditions and recovery

## 🔮 Future Enhancements

### Planned Features
- **Multi-Server Support**: Connect multiple MCP servers simultaneously
- **Custom Prompts**: Save and reuse thinking templates
- **Export Results**: Save thinking sessions as markdown/PDF
- **Collaboration**: Share thinking sessions (privacy-preserving)
- **Integration**: Connect thinking results to chat conversations

### Plugin Architecture
- **Custom MCP Servers**: Build domain-specific thinking engines
- **Third-party Integration**: Connect approved external MCP servers
- **Template System**: Pre-configured thinking patterns for common scenarios

## 📚 Resources

### Documentation
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Sequential Thinking MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking)
- [PelicanOS Architecture Guide](./README.md)

### Community
- [PelicanOS Discord](https://discord.gg/pelicanos)
- [MCP Community Forum](https://github.com/modelcontextprotocol/discussions)
- [Feature Requests](https://github.com/pelicanos/pelicanos-ai-assistant/issues)

---

**Built with ❤️ for thoughtful problem-solving**

*Empowering deep thinking while respecting your privacy.*