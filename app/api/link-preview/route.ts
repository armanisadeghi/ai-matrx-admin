import { NextRequest, NextResponse } from "next/server";
import ogs from 'open-graph-scraper';
import type { SuccessResult } from 'open-graph-scraper/types';

export const runtime = 'nodejs';

interface MetaData {
  title?: string;
  description?: string;
  image?: string;
  url: string;
}

interface OGResult {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: { url: string } | { url: string }[];
  ogUrl?: string;
  success: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
    
    const { error, result } = await ogs({ 
      url,
      timeout: 5000,
      fetchOptions: { 
        headers: { 'user-agent': userAgent }
      }
    }) as { error: boolean; result: OGResult };

    if (error || !result.success) {
      throw new Error(error ? 'Failed to fetch metadata' : 'Invalid URL');
    }

    const metaData: MetaData = {
      title: result.ogTitle,
      description: result.ogDescription,
      image: Array.isArray(result.ogImage) ? result.ogImage[0]?.url : result.ogImage?.url,
      url: result.ogUrl || url,
    };

    return NextResponse.json(metaData, { status: 200 });
  } catch (err) {
    console.error("Error fetching metadata:", err);
    return NextResponse.json({ 
      error: "Failed to fetch metadata", 
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}