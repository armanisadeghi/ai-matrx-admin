import { NextRequest, NextResponse } from 'next/server';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@/utils/supabase/server';
import { adminIds } from '@/components/layout';

interface TypeScriptError {
  file: string | null;
  line: number | null;
  column: number | null;
  message: string;
  code: number;
}

async function regenerateTypeScriptErrors(): Promise<TypeScriptError[]> {
  const configPath = path.join(process.cwd(), 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    process.cwd()
  );

  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
  });

  const diagnostics = ts.getPreEmitDiagnostics(program);

  const errors: TypeScriptError[] = diagnostics.map(diagnostic => ({
    file: diagnostic.file ? diagnostic.file.fileName : null,
    line: diagnostic.file 
      ? ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!).line + 1 
      : null,
    column: diagnostic.file 
      ? ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!).character + 1 
      : null,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    code: diagnostic.code,
  }));

  // Write to public directory
  const outputPath = path.join(process.cwd(), 'public', 'type_errors.json');
  fs.writeFileSync(outputPath, JSON.stringify(errors, null, 2));

  console.log(`✓ TypeScript errors regenerated: ${errors.length} errors written to ${outputPath}`);

  return errors;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin status
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin using the adminIds list
    const isAdmin = adminIds.includes(user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Regenerate TypeScript errors
    const errors = await regenerateTypeScriptErrors();

    return NextResponse.json({
      success: true,
      count: errors.length,
      errors,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error regenerating TypeScript errors:', error);
    return NextResponse.json(
      { 
        error: 'Failed to regenerate TypeScript errors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

