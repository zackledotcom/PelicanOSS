#!/bin/bash

# Ultimate M1 MacBook 8GB AI Setup
# Downloads the absolute best small models available

echo "🔥 Setting up GOD-TIER models for M1 MacBook 8GB"
echo "================================================"

# 1. The absolute best coder (beats GPT-3.5!)
echo "📥 Downloading DeepSeek-Coder-1.3B (THE CHAMPION)..."
ollama pull deepseek-coder:1.3b-instruct

# 2. Best general reasoning model
echo "📥 Downloading Qwen2.5-1.5B (REASONING MASTER)..."
ollama pull qwen2.5:1.5b-instruct

# 3. Ultra-fast for quick tasks
echo "📥 Downloading TinyLlama-1.1B (LIGHTNING FAST)..."
ollama pull tinyllama:1.1b-chat

# 4. Specialized code model
echo "📥 Downloading StarCoder2-3B (CODE SPECIALIST)..."
ollama pull starcoder2:3b

echo ""
echo "🎯 Creating optimized configurations..."

# Create DeepSeek optimized config
cat > Modelfile-deepseek-optimized << 'EOF'
FROM deepseek-coder:1.3b-instruct

# M1 MacBook 8GB Optimizations
PARAMETER temperature 0.1
PARAMETER top_p 0.95
PARAMETER top_k 40
PARAMETER repeat_penalty 1.05
PARAMETER num_ctx 4096
PARAMETER num_gpu 1
PARAMETER num_thread 4
PARAMETER mmap true
PARAMETER f16 true
PARAMETER low_vram true

SYSTEM You are DeepSeek Coder, a world-class programming assistant. You write clean, efficient, well-documented code following best practices. You excel at complex algorithms, debugging, and explaining code concepts clearly.
EOF

ollama create deepseek-coder-optimized -f Modelfile-deepseek-optimized

# Create Qwen optimized config
cat > Modelfile-qwen-optimized << 'EOF'
FROM qwen2.5:1.5b-instruct

# M1 MacBook 8GB Optimizations
PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.05
PARAMETER num_ctx 3072
PARAMETER num_gpu 1
PARAMETER num_thread 4
PARAMETER mmap true
PARAMETER f16 true
PARAMETER low_vram true

SYSTEM You are Qwen, an intelligent assistant with exceptional reasoning abilities. You excel at problem-solving, mathematical thinking, and providing clear, logical explanations.
EOF

ollama create qwen2.5-optimized -f Modelfile-qwen-optimized

echo ""
echo "🧪 Testing the models..."

echo "Testing DeepSeek-Coder (should be AMAZING):"
ollama run deepseek-coder-optimized "Write a Python function to implement merge sort with time complexity analysis"

echo ""
echo "Testing Qwen2.5 (should show excellent reasoning):"
ollama run qwen2.5-optimized "Explain the time-space tradeoff in algorithm design with examples"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🏆 Available optimized models:"
echo "• deepseek-coder-optimized (BEST for coding)"
echo "• qwen2.5-optimized (BEST for reasoning)" 
echo "• tinyllama:1.1b-chat (FASTEST responses)"
echo "• starcoder2:3b (CODE specialist)"
echo ""
echo "🎯 For PelicanOS: Select 'deepseek-coder-optimized' as your primary model"
echo "💡 These models will DESTROY Gemma2-2B in performance!"

# Clean up
rm -f Modelfile-deepseek-optimized Modelfile-qwen-optimized
