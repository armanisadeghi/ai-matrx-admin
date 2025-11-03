/**
 * Audio Transcription API Route
 * 
 * Secure server-side proxy for Groq Whisper transcription
 * Uses whisper-large-v3-turbo for optimal speed and multilingual support
 */

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Initialize Groq client with API key from environment
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Get the form data with the audio file
    const formData = await request.formData();
    const audioFile = formData.get('file') as File | null;
    const language = formData.get('language') as string | null;
    const prompt = formData.get('prompt') as string | null;

    // Validate audio file
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file size (25MB for free tier, 100MB for dev tier)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'audio/flac',
      'audio/mp3',
      'audio/mp4',
      'audio/mpeg',
      'audio/mpga',
      'audio/m4a',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
    ];

    if (!allowedTypes.some(type => audioFile.type.includes(type.split('/')[1]))) {
      return NextResponse.json(
        { error: 'Invalid audio file type. Supported: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm' },
        { status: 400 }
      );
    }

    // Build transcription options
    const transcriptionOptions: any = {
      file: audioFile,
      model: 'whisper-large-v3-turbo', // Fastest model with best price/performance
      response_format: 'verbose_json', // Get detailed metadata
      temperature: 0.0, // Most accurate transcription
    };

    // Add optional parameters
    if (language) {
      transcriptionOptions.language = language;
    }

    if (prompt) {
      transcriptionOptions.prompt = prompt;
    }

    // Call Groq transcription API
    const transcription = await groq.audio.transcriptions.create(transcriptionOptions);

    // Return the transcription result
    // Note: When using verbose_json, we get additional metadata
    const response: any = transcription;
    
    return NextResponse.json({
      success: true,
      text: transcription.text,
      language: response.language || null,
      duration: response.duration || null,
      // Optional: Include segments for more detailed analysis
      segments: response.segments || [],
    });

  } catch (error: any) {
    console.error('Transcription error:', error);

    // Handle specific Groq API errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'API authentication failed' },
        { status: 500 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Transcription failed',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    service: 'audio-transcription',
    model: 'whisper-large-v3-turbo',
  });
}

