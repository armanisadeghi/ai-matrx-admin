// app/api/admin/tools/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const active_only = searchParams.get('active_only');

    let query = supabase
      .from('tools')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tools:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tools', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tools: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    const { name, description, parameters, function_path } = body;
    if (!name || !description || !parameters || !function_path) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, parameters, function_path' },
        { status: 400 }
      );
    }

    // Validate JSON fields
    if (typeof parameters !== 'object') {
      return NextResponse.json(
        { error: 'Parameters must be a valid JSON object' },
        { status: 400 }
      );
    }

    const toolData = {
      name: body.name,
      description: body.description,
      parameters: body.parameters,
      output_schema: body.output_schema || null,
      annotations: body.annotations || [],
      function_path: body.function_path,
      category: body.category || null,
      tags: body.tags || [],
      icon: body.icon || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      version: body.version || '1.0.0'
    };

    const { data, error } = await supabase
      .from('tools')
      .insert([toolData])
      .select()
      .single();

    if (error) {
      console.error('Error creating tool:', error);
      return NextResponse.json(
        { error: 'Failed to create tool', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Tool created successfully',
      tool: data
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
