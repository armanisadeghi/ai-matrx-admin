-- Seed script for System Prompts Database V2
-- This script populates the system_prompt_categories and system_prompt_functionality_configs tables
-- with the initial data based on existing hardcoded SYSTEM_FUNCTIONALITIES

-- ============================================================================
-- STEP 1: Insert Categories
-- ============================================================================

INSERT INTO system_prompt_categories (id, name, description, icon_name, color, sort_order, is_active)
VALUES
  (
    gen_random_uuid(),
    'Text Operations',
    'AI tools for explaining, summarizing, translating, and improving text',
    'FileText',
    'blue',
    1,
    true
  ),
  (
    gen_random_uuid(),
    'Code Operations',
    'AI tools for analyzing, fixing, and refactoring code',
    'Code',
    'purple',
    2,
    true
  ),
  (
    gen_random_uuid(),
    'Content Generation',
    'AI tools for generating new content, flashcards, and quizzes',
    'Sparkles',
    'green',
    3,
    true
  ),
  (
    gen_random_uuid(),
    'Utilities',
    'AI tools for searching, brainstorming, and general assistance',
    'Wrench',
    'orange',
    4,
    true
  ),
  (
    gen_random_uuid(),
    'Content Cards',
    'Interactive cards for expanding and exploring content',
    'LayoutGrid',
    'indigo',
    5,
    true
  );

-- ============================================================================
-- STEP 2: Insert Functionality Configs
-- ============================================================================

-- Get category IDs for reference
DO $$
DECLARE
  cat_text UUID;
  cat_code UUID;
  cat_content UUID;
  cat_utils UUID;
  cat_cards UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO cat_text FROM system_prompt_categories WHERE name = 'Text Operations';
  SELECT id INTO cat_code FROM system_prompt_categories WHERE name = 'Code Operations';
  SELECT id INTO cat_content FROM system_prompt_categories WHERE name = 'Content Generation';
  SELECT id INTO cat_utils FROM system_prompt_categories WHERE name = 'Utilities';
  SELECT id INTO cat_cards FROM system_prompt_categories WHERE name = 'Content Cards';

  -- ===== CONTENT CARDS =====
  INSERT INTO system_prompt_functionality_configs (functionality_id, category_id, label, description, icon_name, sort_order, is_active)
  VALUES
    (
      'content-expander-card',
      cat_cards,
      'Content Expander Card',
      'Cards that expand on educational content with title, description, and full context',
      'LayoutGrid',
      1,
      true
    );

  -- ===== TEXT OPERATIONS =====
  INSERT INTO system_prompt_functionality_configs (functionality_id, category_id, label, description, icon_name, sort_order, is_active)
  VALUES
    (
      'explain-text',
      cat_text,
      'Explain Text',
      'Explain selected text or concept in simple terms',
      'MessageCircleQuestion',
      1,
      true
    ),
    (
      'update-text',
      cat_text,
      'Update Text',
      'Update selected text based on feedback',
      'RefreshCw',
      2,
      true
    ),
    (
      'summarize-text',
      cat_text,
      'Summarize Text',
      'Create a concise summary of text',
      'FileText',
      3,
      true
    ),
    (
      'translate-text',
      cat_text,
      'Translate Text',
      'Translate selected or provided text to another language',
      'Languages',
      4,
      true
    ),
    (
      'translate-to-persian',
      cat_text,
      'Translate to Persian',
      'Translate selected or provided text to Persian',
      'Languages',
      5,
      true
    ),
    (
      'improve-writing',
      cat_text,
      'Improve Writing',
      'Improve the quality and clarity of writing',
      'PenLine',
      6,
      true
    ),
    (
      'extract-key-points',
      cat_text,
      'Extract Key Points',
      'Extract the main points from text',
      'List',
      7,
      true
    );

  -- ===== CODE OPERATIONS =====
  INSERT INTO system_prompt_functionality_configs (functionality_id, category_id, label, description, icon_name, sort_order, is_active)
  VALUES
    (
      'analyze-code',
      cat_code,
      'Analyze Code',
      'Analyze code for improvements, bugs, or explanations',
      'Search',
      1,
      true
    ),
    (
      'fix-code',
      cat_code,
      'Fix Code',
      'Fix issues in code',
      'Wrench',
      2,
      true
    ),
    (
      'refactor-code',
      cat_code,
      'Refactor Code',
      'Refactor code for better quality',
      'Code',
      3,
      true
    );

  -- ===== CONTENT GENERATION =====
  INSERT INTO system_prompt_functionality_configs (functionality_id, category_id, label, description, icon_name, sort_order, is_active)
  VALUES
    (
      'generate-content',
      cat_content,
      'Generate Content',
      'Generate new content based on a topic',
      'Sparkles',
      1,
      true
    ),
    (
      'create-flashcards',
      cat_content,
      'Create Flashcards',
      'Generate flashcards from content',
      'CreditCard',
      2,
      true
    ),
    (
      'create-quiz',
      cat_content,
      'Create Quiz',
      'Generate quiz questions from content',
      'HelpCircle',
      3,
      true
    );

  -- ===== UTILITIES =====
  INSERT INTO system_prompt_functionality_configs (functionality_id, category_id, label, description, icon_name, sort_order, is_active)
  VALUES
    (
      'search-web',
      cat_utils,
      'Search Web',
      'Search the web for information',
      'Globe',
      1,
      true
    ),
    (
      'get-ideas',
      cat_utils,
      'Get Ideas',
      'Generate ideas related to a topic',
      'Lightbulb',
      2,
      true
    );

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify categories
SELECT 
  id,
  name,
  icon_name,
  color,
  sort_order,
  is_active
FROM system_prompt_categories
ORDER BY sort_order;

-- Verify functionality configs
SELECT 
  fc.functionality_id,
  fc.label,
  c.name as category_name,
  fc.icon_name,
  fc.sort_order,
  fc.is_active
FROM system_prompt_functionality_configs fc
LEFT JOIN system_prompt_categories c ON fc.category_id = c.id
ORDER BY c.sort_order, fc.sort_order;

-- Count by category
SELECT 
  c.name as category,
  COUNT(fc.id) as functionality_count
FROM system_prompt_categories c
LEFT JOIN system_prompt_functionality_configs fc ON c.id = fc.category_id
GROUP BY c.id, c.name
ORDER BY c.sort_order;

