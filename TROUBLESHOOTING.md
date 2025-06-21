# 🔧 Service Status & Troubleshooting

## Current Status ✅

### Ollama
- **Status**: ✅ Running on http://localhost:11434
- **Models Available**: 
  - openchat:latest (7B)
  - tinydolphin:latest (1B)
  - phi4-mini-reasoning:latest (3.8B)
  - deepseek-coder:1.3b (1B)

### ChromaDB
- **Status**: ✅ Running on http://localhost:8000
- **API Version**: v2 (updated)
- **Data Directory**: `/Users/jibbr/Desktop/Wonder/PelicanOS/chroma-data`

## 🚀 How to Use

1. **Open the PelicanOS app** - it should now detect both services as connected
2. **Select a model** from the dropdown (recommend starting with `tinydolphin:latest` for speed)
3. **Start chatting!** - the AI will respond using your local models

## 🐛 If Services Don't Connect

### Restart Ollama
```bash
pkill -f "ollama serve"
ollama serve &
```

### Restart ChromaDB
```bash
pkill -f "chroma run"
cd /Users/jibbr/Desktop/Wonder/PelicanOS/chroma-data
/Users/jibbr/.local/bin/chroma run --port 8000 &
```

### Check Service Status
```bash
# Check Ollama
curl http://localhost:11434/api/tags

# Check ChromaDB  
curl http://localhost:8000/api/v2/heartbeat
```

## ⚡ Quick Start Commands

### Terminal 1: Start Services (if needed)
```bash
# Start Ollama
ollama serve &

# Start ChromaDB
cd /Users/jibbr/Desktop/Wonder/PelicanOS/chroma-data
/Users/jibbr/.local/bin/chroma run --port 8000 &
```

### Terminal 2: Start PelicanOS
```bash
cd /Users/jibbr/Desktop/Wonder/PelicanOS
npm run dev
```

## 🎯 Testing Chat

Try these test messages:
- "Hello, can you tell me about yourself?"
- "Write a simple Python function to calculate fibonacci numbers"
- "What's the weather like?" (should explain it can't access real-time data)

## 🔍 Debugging

### If Ollama Models Don't Show
```bash
ollama list  # Check installed models
ollama pull llama2  # Pull a new model if needed
```

### If ChromaDB Won't Start
- Check port 8000 isn't used: `lsof -i :8000`
- Ensure write permissions to chroma-data directory
- Try running manually to see error messages

### App Console Logs
- Open DevTools in the Electron app (F12)
- Check Console tab for any errors
- Main process logs will show in your terminal

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Green status dots for both Ollama and ChromaDB in the app
- ✅ Model dropdown shows your available models
- ✅ Chat messages get responses from the AI
- ✅ No error messages in console

**Both services are currently running and ready to use!**
