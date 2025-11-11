-- Seed System Prompts Placeholders
-- Run this directly in Supabase SQL Editor

-- ===== CONTEXT MENU: STANDALONE =====
INSERT INTO system_prompts (
  system_prompt_id, name, description, placement_type, functionality_id, 
  category, sort_order, placement_settings, display_config, prompt_snapshot, 
  status, is_active, version
) VALUES
('explain-standalone', 'Explain', 'Explain the selected text in simple terms', 
  'context-menu', 'explain-text', 'standalone', 10, 
  '{"requiresSelection": false}'::jsonb, '{"icon": "MessageSquare"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1),
  
('summarize-standalone', 'Summarize', 'Create a concise summary', 
  'context-menu', 'summarize-text', 'standalone', 20, 
  '{"requiresSelection": false, "minSelectionLength": 50}'::jsonb, 
  '{"icon": "FileText"}'::jsonb, '{"placeholder": true, "messages": []}'::jsonb, 
  'draft', false, 1),
  
('extract-key-points-standalone', 'Extract Key Points', 'Extract the main points from text', 
  'context-menu', 'extract-key-points', 'standalone', 30, 
  '{"requiresSelection": false, "minSelectionLength": 50}'::jsonb, 
  '{"icon": "ListChecks"}'::jsonb, '{"placeholder": true, "messages": []}'::jsonb, 
  'draft', false, 1),
  
('improve-standalone', 'Improve', 'Improve the writing quality', 
  'context-menu', 'improve-writing', 'standalone', 40, 
  '{"requiresSelection": false, "minSelectionLength": 10}'::jsonb, 
  '{"icon": "Sparkles"}'::jsonb, '{"placeholder": true, "messages": []}'::jsonb, 
  'draft', false, 1),
  
('get-ideas-standalone', 'Get Ideas', 'Generate ideas related to the topic', 
  'context-menu', 'get-ideas', 'standalone', 50, 
  '{}'::jsonb, '{"icon": "Lightbulb"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1),
  
('search-web-standalone', 'Search Web', 'Search the web for this topic', 
  'context-menu', 'search-web', 'standalone', 60, 
  '{}'::jsonb, '{"icon": "Search"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1)

ON CONFLICT (system_prompt_id) DO NOTHING;

-- ===== CONTEXT MENU: MATRX CREATE =====
INSERT INTO system_prompts (
  system_prompt_id, name, description, placement_type, functionality_id, 
  category, subcategory, sort_order, placement_settings, display_config, 
  prompt_snapshot, status, is_active, version
) VALUES
('create-flashcards', 'Create Flashcards', 'Generate flashcards from content', 
  'context-menu', 'create-flashcards', 'matrx-create', 'study-tools', 10, 
  '{}'::jsonb, '{"icon": "Layers"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1),
  
('create-quiz', 'Create Quiz', 'Generate quiz questions', 
  'context-menu', 'create-quiz', 'matrx-create', 'study-tools', 20, 
  '{}'::jsonb, '{"icon": "HelpCircle"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1)

ON CONFLICT (system_prompt_id) DO NOTHING;

-- ===== CONTEXT MENU: TRANSLATION =====
INSERT INTO system_prompts (
  system_prompt_id, name, description, placement_type, functionality_id, 
  category, sort_order, placement_settings, display_config, prompt_snapshot, 
  status, is_active, version
) VALUES
('translate-spanish', 'Translate to Spanish', 'Translate selected text to Spanish', 
  'context-menu', 'translate-text', 'translation', 10, 
  '{"requiresSelection": true, "minSelectionLength": 1}'::jsonb, 
  '{"icon": "Languages"}'::jsonb, '{"placeholder": true, "messages": []}'::jsonb, 
  'draft', false, 1),
  
('translate-french', 'Translate to French', 'Translate selected text to French', 
  'context-menu', 'translate-text', 'translation', 20, 
  '{"requiresSelection": true, "minSelectionLength": 1}'::jsonb, 
  '{"icon": "Languages"}'::jsonb, '{"placeholder": true, "messages": []}'::jsonb, 
  'draft', false, 1),
  
('translate-german', 'Translate to German', 'Translate selected text to German', 
  'context-menu', 'translate-text', 'translation', 30, 
  '{"requiresSelection": true, "minSelectionLength": 1}'::jsonb, 
  '{"icon": "Languages"}'::jsonb, '{"placeholder": true, "messages": []}'::jsonb, 
  'draft', false, 1),
  
('translate-persian', 'Translate to Persian', 'Translate selected text to Persian', 
  'context-menu', 'translate-text', 'translation', 40, 
  '{"requiresSelection": true, "minSelectionLength": 1}'::jsonb, 
  '{"icon": "Languages"}'::jsonb, '{"placeholder": true, "messages": []}'::jsonb, 
  'draft', false, 1)

ON CONFLICT (system_prompt_id) DO NOTHING;

-- ===== CONTEXT MENU: TEXT FORMATTING =====
INSERT INTO system_prompts (
  system_prompt_id, name, description, placement_type, functionality_id, 
  category, subcategory, sort_order, placement_settings, display_config, 
  prompt_snapshot, status, is_active, version
) VALUES
('make-shorter', 'Make Shorter', 'Condense text while keeping meaning', 
  'context-menu', 'custom', 'formatting', 'length', 10, 
  '{"requiresSelection": true}'::jsonb, '{"icon": "Minimize2"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1),
  
('make-longer', 'Make Longer', 'Expand text with more detail', 
  'context-menu', 'custom', 'formatting', 'length', 20, 
  '{"requiresSelection": true}'::jsonb, '{"icon": "Maximize2"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1),
  
('simplify-language', 'Simplify Language', 'Make text easier to understand', 
  'context-menu', 'custom', 'formatting', 'style', 30, 
  '{"requiresSelection": true}'::jsonb, '{"icon": "Type"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1)

ON CONFLICT (system_prompt_id) DO NOTHING;

-- ===== CONTEXT MENU: CODE TOOLS =====
INSERT INTO system_prompts (
  system_prompt_id, name, description, placement_type, functionality_id, 
  category, sort_order, placement_settings, display_config, prompt_snapshot, 
  status, is_active, version
) VALUES
('analyze-code-menu', 'Analyze Code', 'Analyze code for improvements', 
  'context-menu', 'analyze-code', 'code-tools', 10, 
  '{"requiresSelection": false}'::jsonb, '{"icon": "Code2"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1),
  
('fix-code-menu', 'Fix Code', 'Fix issues in code', 
  'context-menu', 'fix-code', 'code-tools', 20, 
  '{"requiresSelection": false}'::jsonb, '{"icon": "Wrench"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1),
  
('refactor-code-menu', 'Refactor Code', 'Improve code structure', 
  'context-menu', 'refactor-code', 'code-tools', 30, 
  '{}'::jsonb, '{"icon": "RefreshCw"}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1)

ON CONFLICT (system_prompt_id) DO NOTHING;

-- ===== CARDS =====
INSERT INTO system_prompts (
  system_prompt_id, name, description, placement_type, functionality_id, 
  category, sort_order, placement_settings, display_config, prompt_snapshot, 
  status, is_active, version
) VALUES
('content-expander-educational', 'Educational Content Expander', 
  'Expand on educational concepts with full context', 
  'card', 'content-expander-card', 'educational', 10, 
  '{"allowChat": true, "allowInitialMessage": false}'::jsonb, 
  '{"icon": "BookOpen"}'::jsonb, '{"placeholder": true, "messages": []}'::jsonb, 
  'draft', false, 1)

ON CONFLICT (system_prompt_id) DO NOTHING;

-- ===== BUTTONS =====
INSERT INTO system_prompts (
  system_prompt_id, name, description, placement_type, functionality_id, 
  category, sort_order, placement_settings, display_config, prompt_snapshot, 
  status, is_active, version
) VALUES
('quick-summarize-button', 'Quick Summarize', 'Quickly summarize content', 
  'button', 'summarize-text', 'quick-actions', 10, 
  '{"variant": "outline", "size": "sm"}'::jsonb, 
  '{"icon": "FileText", "showIcon": true}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1),
  
('quick-explain-button', 'Quick Explain', 'Quickly explain content', 
  'button', 'explain-text', 'quick-actions', 20, 
  '{"variant": "outline", "size": "sm"}'::jsonb, 
  '{"icon": "MessageSquare", "showIcon": true}'::jsonb, 
  '{"placeholder": true, "messages": []}'::jsonb, 'draft', false, 1)

ON CONFLICT (system_prompt_id) DO NOTHING;

-- View results
SELECT 
  system_prompt_id, 
  name, 
  placement_type,
  category,
  subcategory,
  functionality_id,
  is_active,
  status
FROM system_prompts
ORDER BY placement_type, category, sort_order;

