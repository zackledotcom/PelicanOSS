# 🕊️ PelicanOS AI Assistant

A powerful, privacy-focused desktop AI assistant built with Electron, Vue.js, Ollama, and ChromaDB. Experience the future of local AI computing with full control over your data.

![PelicanOS AI Assistant](https://img.shields.io/badge/PelicanOS-AI%20Assistant-blue?style=for-the-badge&logo=electron)
![Ollama](https://img.shields.io/badge/Powered%20by-Ollama-green?style=for-the-badge)
![ChromaDB](https://img.shields.io/badge/Memory-ChromaDB-orange?style=for-the-badge)

## ✨ Features

### 🤖 **Local AI Processing**
- **Privacy First**: All AI processing happens locally on your machine
- **Multiple Models**: Support for various Ollama models (Llama2, CodeLlama, Mistral, etc.)
- **No Internet Required**: Works offline after initial setup

### 🧠 **Intelligent Memory**
- **RAG Integration**: Uses ChromaDB for context-aware conversations
- **Persistent Memory**: Remembers context across sessions
- **Smart Context**: Automatically retrieves relevant conversation history

### 🎨 **Beautiful Interface**
- **Modern Design**: Glassmorphism UI with smooth animations
- **Real-time Status**: Live service monitoring and health checks
- **Responsive Layout**: Adapts to different screen sizes

### ⚡ **Service Management**
- **Auto-Detection**: Automatically detects and manages Ollama/ChromaDB
- **One-Click Setup**: Start services directly from the interface
- **Health Monitoring**: Real-time status indicators

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd PelicanOS
   npm install
   ```

2. **Install Prerequisites**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Install ChromaDB
   pip install chromadb
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Follow Setup Guide**
   - See [SETUP.md](./SETUP.md) for detailed instructions
   - Use in-app service management to start Ollama/ChromaDB
   - Pull your first AI model (recommended: llama2)

## 🏗️ Architecture

### Frontend
- **Framework**: Vue.js 3 with Composition API
- **Build Tool**: Vite for fast development
- **Styling**: CSS with modern gradients and animations
- **State Management**: Reactive state with Vue 3

### Backend
- **Runtime**: Electron main process
- **AI Engine**: Ollama for local LLM inference
- **Vector Database**: ChromaDB for conversation memory
- **IPC**: Secure communication between renderer and main

### Data Flow
```
User Input → Vue.js Interface → Electron IPC → Ollama API
                ↓
ChromaDB Storage ← Context Retrieval ← AI Response
```

## 📦 Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Desktop App** | Electron + Vue.js | Cross-platform desktop interface |
| **AI Engine** | Ollama | Local language model inference |
| **Memory** | ChromaDB | Vector database for RAG |
| **Build System** | electron-vite | Fast development and building |
| **Language** | TypeScript | Type-safe development |

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start built application
npm run typecheck    # Type checking
npm run lint         # Code linting
```

### Project Structure
```
PelicanOS/
├── src/
│   ├── main/           # Electron main process
│   │   └── index.ts    # IPC handlers, service management
│   ├── preload/        # Secure IPC bridge
│   │   ├── index.ts    # API exposure
│   │   └── index.d.ts  # Type definitions
│   └── renderer/       # Vue.js frontend
│       └── src/
│           ├── App.vue
│           └── components/
│               └── AIAssistant.vue
├── build/              # Build artifacts
├── out/                # Distribution files
└── resources/          # App resources
```

## 🎯 Features in Detail

### Service Management
- **Automatic Detection**: Checks Ollama and ChromaDB status on startup
- **Guided Setup**: Step-by-step service initialization
- **Health Monitoring**: Real-time service status indicators
- **Error Handling**: Helpful error messages and troubleshooting

### AI Chat Interface
- **Model Selection**: Switch between different AI models
- **Conversation History**: Persistent chat history with timestamps
- **Context Awareness**: Uses ChromaDB for relevant context retrieval
- **Export Functionality**: Save conversations as JSON files

### Vector Database Integration
- **Automatic Storage**: All conversations stored in ChromaDB
- **Semantic Search**: Find relevant past conversations
- **RAG Enhancement**: Context-aware responses using stored knowledge
- **Privacy Preserving**: All data stored locally

## 🛡️ Privacy & Security

- **100% Local Processing**: No data sent to external servers
- **Offline Capable**: Full functionality without internet
- **Data Ownership**: All conversations and models stored locally
- **Secure IPC**: Context isolation between processes

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 8GB (16GB recommended for larger models)
- **Storage**: 10GB free space (for models and data)
- **Network**: Internet for initial model download

### Recommended Setup
- **CPU**: Multi-core processor (Intel i5/AMD Ryzen 5+)
- **RAM**: 16GB+ for optimal performance
- **Storage**: SSD for faster model loading
- **GPU**: Optional, for GPU-accelerated inference

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama Team** for making local AI accessible
- **ChromaDB** for excellent vector database technology
- **Electron** for cross-platform desktop development
- **Vue.js** for reactive UI framework

---

**Built with ❤️ for the local AI community**

*Experience the power of AI without compromising your privacy.*
