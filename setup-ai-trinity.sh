#!/bin/bash

# Quick Trinity Setup for PelicanOS
# Downloads and configures the 3 specialized AI models

echo "🎯 Setting up AI Trinity for PelicanOS..."

# Download the trinity
ollama pull deepseek-coder:1.3b-instruct  # Coder AI
ollama pull qwen2.5:3b-instruct           # Everyday AI  
ollama pull phi3.5:mini                   # Detective AI

echo "✅ AI Trinity installed! Total: ~6.4GB"
echo ""
echo "🎭 Model Selection Guide:"
echo "========================"
echo "👨‍💻 deepseek-coder:1.3b-instruct - For coding tasks"
echo "🧠 qwen2.5:3b-instruct - For research & brainstorming"
echo "🕵️ phi3.5:mini - For investigation & analysis"
echo ""
echo "💡 Switch models in PelicanOS based on task type!"
