Gemini CLI - Critical Implementation Review Needed

CURRENT ISSUES:
1. "gemini code analysis is not a function" error - missing handler registration
2. Chat area not visible - UI rendering problems
3. Models not populating - service initialization issues

NEW REQUIREMENTS:
1. Individual AI chat threads in left sidebar for:
   - Claude Desktop Commander 
   - Gemini CLI
   - Each should behave exactly like terminal usage

2. Real-time collaboration canvas:
   - Split screen view
   - When user says "Claude work with Gemini on X"
   - Show live AI-to-AI discussion
   - Real-time streaming of their conversation

3. Persistent chat history for each AI

CURRENT CODEBASE STATUS:
- GeminiCliService created but not properly registered
- CodeAnalysisPanel exists but missing proper integration
- Missing individual chat interfaces
- No canvas collaboration system

TASK:
Please review the updated codebase and provide implementation plan for:
1. Fixing current function errors
2. Creating individual AI chat threads
3. Building real-time collaboration canvas
4. Ensuring each AI behaves like terminal usage

Focus on practical implementation steps to get this working.
