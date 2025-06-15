// Construtor dinâmico de prompts baseado em contexto
function buildAdvancedPrompt(intention, userProfile, conversationContext) {
  const basePrompt = getBasePrompt(intention, userProfile.industry);
  const contextualInserts = buildContextualInserts(conversationContext);
  const personalizedElements = buildPersonalization(userProfile);
  
  return combinePromptElements(basePrompt, contextualInserts, personalizedElements);
}