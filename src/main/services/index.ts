// Barrel file for services
// Export all necessary functions and classes from service files

// From ollama.ts
export { summarizeMessages, enrichPromptWithMemory } from './ollama'

// From memoryEnrichment.ts
export { withMemoryEnrichment, createContextDebugInfo, filterRelevantContext } from './memoryEnrichment'

// From agents.ts
export {
  loadAgentRegistry,
  createAgent,
  updateAgent,
  deleteAgent,
  cloneAgent,
  setActiveAgent,
  getActiveAgent,
  getAllAgents,
  getAvailableTools,
  validateToolKey
} from './agents'
