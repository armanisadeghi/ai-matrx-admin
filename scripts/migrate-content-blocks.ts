#!/usr/bin/env tsx

/**
 * Migration script to push existing content blocks to Supabase database
 * Run with: npx tsx scripts/migrate-content-blocks.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { contentBlocks, categoryConfigs } from '../features/rich-text-editor/config/contentBlocks';
import { getAdminSupabaseClient } from '../utils/supabase/getScriptClient';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

console.log('🔍 Environment check:');
console.log('   Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('   Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing');

// Get admin client for migration operations
const supabase = getAdminSupabaseClient();

// Helper function to extract icon name from icon component
function getIconName(iconComponent: any): string {
    if (typeof iconComponent === 'function') {
        return iconComponent.name || 'FileText'; // Default fallback
    }
    return 'FileText';
}

async function migrateCategoryConfigs() {
    console.log('🏗️  Migrating category configurations...');
    
    const categoryData = categoryConfigs.map((config, index) => ({
        category_id: config.id,
        label: config.label,
        icon_name: getIconName(config.icon),
        color: config.color,
        sort_order: index,
        is_active: true
    }));

    const { data, error } = await supabase
        .from('category_configs')
        .upsert(categoryData, { 
            onConflict: 'category_id',
            ignoreDuplicates: false 
        });

    if (error) {
        console.error('❌ Error migrating category configs:', error);
        throw error;
    }

    console.log(`✅ Migrated ${categoryData.length} category configurations`);
    return data;
}

async function migrateSubcategoryConfigs() {
    console.log('🔗 Migrating subcategory configurations...');
    
    const subcategoryData: any[] = [];
    
    categoryConfigs.forEach(category => {
        if (category.subcategories) {
            category.subcategories.forEach((subcat, index) => {
                subcategoryData.push({
                    category_id: category.id,
                    subcategory_id: subcat.id,
                    label: subcat.label,
                    icon_name: getIconName(subcat.icon),
                    sort_order: index,
                    is_active: true
                });
            });
        }
    });

    if (subcategoryData.length === 0) {
        console.log('ℹ️  No subcategories to migrate');
        return;
    }

    const { data, error } = await supabase
        .from('subcategory_configs')
        .upsert(subcategoryData, { 
            onConflict: 'category_id,subcategory_id',
            ignoreDuplicates: false 
        });

    if (error) {
        console.error('❌ Error migrating subcategory configs:', error);
        throw error;
    }

    console.log(`✅ Migrated ${subcategoryData.length} subcategory configurations`);
    return data;
}

async function migrateContentBlocks() {
    console.log('📝 Migrating content blocks...');
    
    const blockData = contentBlocks.map((block, index) => ({
        block_id: block.id,
        label: block.label,
        description: block.description,
        icon_name: getIconName(block.icon),
        category: block.category,
        subcategory: block.subcategory || null,
        template: block.template,
        sort_order: index,
        is_active: true
    }));

    // Split into chunks to avoid potential payload size limits
    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < blockData.length; i += chunkSize) {
        chunks.push(blockData.slice(i, i + chunkSize));
    }

    let totalMigrated = 0;
    for (const chunk of chunks) {
        const { data, error } = await supabase
            .from('content_blocks')
            .upsert(chunk, { 
                onConflict: 'block_id',
                ignoreDuplicates: false 
            });

        if (error) {
            console.error('❌ Error migrating content blocks chunk:', error);
            throw error;
        }

        totalMigrated += chunk.length;
        console.log(`📦 Migrated chunk: ${chunk.length} blocks (${totalMigrated}/${blockData.length} total)`);
    }

    console.log(`✅ Successfully migrated ${totalMigrated} content blocks`);
    return totalMigrated;
}

async function verifyMigration() {
    console.log('🔍 Verifying migration...');
    
    // Check category configs
    const { data: categories, error: catError } = await supabase
        .from('category_configs')
        .select('*')
        .eq('is_active', true);
        
    if (catError) {
        console.error('❌ Error verifying categories:', catError);
        return false;
    }

    // Check subcategory configs
    const { data: subcategories, error: subError } = await supabase
        .from('subcategory_configs')
        .select('*')
        .eq('is_active', true);
        
    if (subError) {
        console.error('❌ Error verifying subcategories:', subError);
        return false;
    }

    // Check content blocks
    const { data: blocks, error: blockError } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('is_active', true);
        
    if (blockError) {
        console.error('❌ Error verifying content blocks:', blockError);
        return false;
    }

    console.log(`📊 Migration verification:`);
    console.log(`   Categories: ${categories?.length || 0}`);
    console.log(`   Subcategories: ${subcategories?.length || 0}`);
    console.log(`   Content blocks: ${blocks?.length || 0}`);
    
    // Verify specific subcategories exist
    const thinkingBlocks = blocks?.filter(b => b.subcategory === 'thinking') || [];
    const timelineBlocks = blocks?.filter(b => b.subcategory === 'timeline') || [];
    
    console.log(`   Thinking blocks: ${thinkingBlocks.length}`);
    console.log(`   Timeline blocks: ${timelineBlocks.length}`);
    
    return true;
}

async function main() {
    try {
        console.log('🚀 Starting content blocks migration to Supabase...\n');
        
        // Test connection
        console.log('🔌 Testing Supabase connection...');
        const { data: testData, error: testError } = await supabase
            .from('content_blocks')
            .select('id')
            .limit(1);
            
        if (testError) {
            console.error('❌ Failed to connect to Supabase:', testError);
            process.exit(1);
        }
        console.log('✅ Supabase connection successful\n');

        // Run migrations in order
        await migrateCategoryConfigs();
        await migrateSubcategoryConfigs();
        await migrateContentBlocks();
        
        // Verify everything worked
        await verifyMigration();
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('You can now update your application to use database-driven content blocks.');
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
if (require.main === module) {
    main();
}

export { main as migrateContentBlocks };
