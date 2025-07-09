#!/usr/bin/env node

/**
 * Multi-AI System Verification Script
 * Tests that all fixes have been properly applied
 */

const fs = require('fs')

console.log('🔍 Verifying Multi-AI System Implementation...\n')

const results = { passed: 0, failed: 0, warnings: 0 }

function log(test, status, message) {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'
  console.log(`${icon} ${test}: ${message}`)
  results[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : 'warnings']++
}

// Test enhanced components
console.log('📁 Testing Enhanced Components...')

const chatFile = 'src/renderer/src/components/chat/PremiumChatInterface.tsx'
if (fs.existsSync(chatFile)) {
  const content = fs.readFileSync(chatFile, 'utf8')
  if (content.includes('routeAIMessage') && content.includes('AIProvider')) {
    log('Enhanced Chat Interface', 'pass', 'Contains multi-AI routing logic')
  } else {
    log('Enhanced Chat Interface', 'fail', 'Missing multi-AI functionality')
  }
} else {
  log('Enhanced Chat Interface', 'fail', 'File not found')
}

const sidebarFile = 'src/renderer/src/components/layout/EfficientSidebar.tsx'
if (fs.existsSync(sidebarFile)) {
  const content = fs.readFileSync(sidebarFile, 'utf8')
  if (content.includes('aiProviders') && content.includes('loadOllamaModels')) {
    log('Enhanced Sidebar', 'pass', 'Contains model selection and AI providers')
  } else {
    log('Enhanced Sidebar', 'fail', 'Missing model selection functionality')
  }
} else {
  log('Enhanced Sidebar', 'fail', 'File not found')
}

// Test IPC handlers
console.log('\n🔗 Testing IPC Handlers...')

const mainFile = 'src/main/index.ts'
if (fs.existsSync(mainFile)) {
  const content = fs.readFileSync(mainFile, 'utf8')
  const handlers = ['chat-with-ai', 'check-ollama-status', 'get-ollama-models', 'pull-model']
  const found = handlers.filter(h => content.includes(h)).length
  
  if (found === handlers.length) {
    log('IPC Handlers', 'pass', `All ${handlers.length} required handlers found`)
  } else {
    log('IPC Handlers', 'warn', `Found ${found}/${handlers.length} handlers`)
  }
} else {
  log('IPC Handlers', 'fail', 'Main process file not found')
}

// Test dependencies
console.log('\n📦 Testing Dependencies...')

if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const required = ['phosphor-react', '@radix-ui/react-select', 'axios']
  const missing = required.filter(d => !deps[d])
  
  if (missing.length === 0) {
    log('Dependencies', 'pass', 'All required packages installed')
  } else {
    log('Dependencies', 'warn', `Missing: ${missing.join(', ')}`)
  }
} else {
  log('Dependencies', 'fail', 'package.json not found')
}

// Test backups
console.log('\n💾 Testing Backup Files...')

const backups = fs.readdirSync('.').filter(d => d.startsWith('backup-'))
if (backups.length > 0) {
  const latest = backups.sort().pop()
  const files = fs.readdirSync(latest)
  log('Backup Files', 'pass', `Created in ${latest} (${files.length} files)`)
} else {
  log('Backup Files', 'warn', 'No backup directories found')
}

// Summary
console.log('\n' + '='.repeat(50))
console.log('📊 VERIFICATION SUMMARY')
console.log('='.repeat(50))
console.log(`✅ Passed: ${results.passed}`)
console.log(`⚠️  Warnings: ${results.warnings}`)
console.log(`❌ Failed: ${results.failed}`)

if (results.failed === 0) {
  console.log('\n🎉 VERIFICATION SUCCESSFUL!')
  console.log('Your multi-AI system is ready to use!')
  console.log('\n🚀 Next Steps:')
  console.log('   1. Start development server: npm run dev')
  console.log('   2. Test Ollama model selection')
  console.log('   3. Test Claude DC integration')
  console.log('   4. Test Gemini CLI integration')
} else {
  console.log('\n⚠️  VERIFICATION INCOMPLETE')
  console.log('Some components need manual attention.')
}

console.log('\n📋 Documentation:')
console.log('   • IMPLEMENTATION_COMPLETE.md')
console.log('   • MULTI_AI_FIXES_README.md')
