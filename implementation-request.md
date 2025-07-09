Gemini CLI Implementation Request for PelicanOS Multi-AI Integration

We've decided to proceed with Gemini CLI integration (not API) specifically because of your file system capabilities. You can directly read, analyze, and modify codebases - which is perfect for PelicanOS as a development-focused AI application.

IMPLEMENTATION TASK:
Create the GeminiCliService for PelicanOS with these priorities:

1. File system integration using --all_files and --checkpointing
2. Safe code modification capabilities  
3. Project-wide analysis and refactoring
4. Integration with existing PelicanOS architecture (Electron + React + TypeScript)

CURRENT PELICANOS ARCHITECTURE:
- Electron main process with IPC handlers
- React frontend with TypeScript
- Existing Ollama integration for local AI
- ChromaDB for conversation memory
- Secure preload bridge for renderer communication

SPECIFIC IMPLEMENTATION NEEDS:
1. GeminiCliService class that spawns gemini processes safely
2. IPC handlers for file operations and code analysis
3. Error handling for CLI-specific issues
4. Request queuing to prevent process conflicts
5. Security safeguards for file modifications

QUESTIONS:
1. What's the optimal way to structure CLI commands for large codebases?
2. How should we handle the --checkpointing feature for safety?
3. Best practices for managing multiple concurrent CLI operations?
4. How to integrate with PelicanOS's existing IPC architecture?

Please provide implementation guidance and code examples for integrating your CLI capabilities into PelicanOS.
