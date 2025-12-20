'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BasicInput } from '@/components/ui/input';
import { Loader2, Upload, X, FileText, Clock, Database, AlertCircle, CheckCircle2, Info, Hash, Image as ImageIcon } from 'lucide-react';
import { TEST_ADMIN_TOKEN } from '../sample-prompt';
import { extractTextFromPdf } from '@/utils/pdf/pdf-extractor';
import { countTokens } from '@/utils/token-counter';

// Supported file types
const ACCEPTED_FILE_TYPES = {
  pdf: 'application/pdf',
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
};

const ACCEPT_STRING = `${ACCEPTED_FILE_TYPES.pdf},image/*`;

const isValidFileType = (file: File): boolean => {
  if (file.type === ACCEPTED_FILE_TYPES.pdf) return true;
  if (file.type.startsWith('image/')) return true;
  return false;
};

const isPdfFile = (file: File): boolean => file.type === ACCEPTED_FILE_TYPES.pdf;
const isImageFile = (file: File): boolean => file.type.startsWith('image/');

type ServerType = 'local' | 'production';

interface ExtractResult {
  success: boolean;
  text?: string;
  error?: string;
  rawResponse?: any;
  debugInfo?: {
    responseKeys: string[];
    textFieldUsed?: string;
    warnings: string[];
  };
  metadata?: {
    pageCount?: number;
    fileSize?: number;
    processingTime?: number;
  };
  tokens?: number;
  isCountingTokens?: boolean;
}

interface RequestMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  requestSize: number;
  responseSize?: number;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  inputMode?: InputMode;
  inputSource?: string; // filename or URL
  downloadTime?: number; // Time to download PDF from URL
  uploadTime?: number; // Time to upload to API
}

type InputMode = 'upload' | 'url';

export default function PdfExtractTestPage() {
  const [serverType, setServerType] = useState<ServerType>('production');
  const [authToken, setAuthToken] = useState<string>(TEST_ADMIN_TOKEN);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [metrics, setMetrics] = useState<RequestMetrics | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getBaseUrl = () => {
    if (serverType === 'local') {
      return process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || 'http://localhost:8000';
    }
    return process.env.NEXT_PUBLIC_PRODUCTION_SOCKET_URL || 'https://server.app.matrxserver.com';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isValidFileType(file)) {
        // Using console.error instead of alert per UI guidelines
        console.error('Invalid file type:', file.type);
        setResult({
          success: false,
          error: `Invalid file type: ${file.type}. Please select a PDF or image file (JPEG, PNG, GIF, WebP, HEIC).`,
        });
        return;
      }
      setSelectedFile(file);
      setResult(null);
      setMetrics(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResult(null);
    setMetrics(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearUrl = () => {
    setPdfUrl('');
    setResult(null);
    setMetrics(null);
  };

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setSelectedFile(null);
    setPdfUrl('');
    setResult(null);
    setMetrics(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtract = async () => {
    if (inputMode === 'upload' && !selectedFile) return;
    if (inputMode === 'url' && !pdfUrl.trim()) return;

    const startTime = Date.now();
    setIsProcessing(true);
    setProcessingStatus('Initializing...');
    setResult(null);

    try {
      let fileToUpload: File;
      let requestSize: number;
      let downloadTime: number | undefined;

      if (inputMode === 'upload' && selectedFile) {
        // Direct file upload
        setProcessingStatus('Preparing upload...');
        fileToUpload = selectedFile;
        requestSize = selectedFile.size;
      } else {
        // URL mode - download the file first
        setProcessingStatus('Downloading file from URL...');
        const downloadStart = Date.now();
        
        try {
          const pdfResponse = await fetch(pdfUrl.trim());
          
          if (!pdfResponse.ok) {
            throw new Error(`Failed to download PDF: HTTP ${pdfResponse.status}`);
          }

          const contentType = pdfResponse.headers.get('content-type') || '';
          const isPdf = contentType.includes('pdf');
          const isImage = contentType.startsWith('image/');
          
          if (contentType && !isPdf && !isImage) {
            throw new Error(`URL does not point to a PDF or image file (Content-Type: ${contentType})`);
          }

          const blob = await pdfResponse.blob();
          downloadTime = Date.now() - downloadStart;
          
          setProcessingStatus('File downloaded, preparing upload...');
          
          // Extract filename from URL or use default
          const urlPath = new URL(pdfUrl.trim()).pathname;
          const urlFilename = urlPath.split('/').pop();
          const defaultExt = isPdf ? '.pdf' : (contentType.split('/')[1] || 'jpg');
          const filename = urlFilename || `downloaded.${defaultExt}`;
          
          // Convert blob to File with correct type
          const mimeType = isPdf ? 'application/pdf' : (contentType || 'image/jpeg');
          fileToUpload = new File([blob], filename, { type: mimeType });
          requestSize = fileToUpload.size;
          
        } catch (error) {
          setResult({
            success: false,
            error: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          setIsProcessing(false);
          setProcessingStatus('');
          return;
        }
      }

      const requestMetrics: RequestMetrics = {
        startTime,
        requestSize,
        endpoint: '/api/pdf/extract-text',
        method: 'POST',
        inputMode,
        inputSource: inputMode === 'upload' && selectedFile ? selectedFile.name : pdfUrl.trim(),
        downloadTime,
      };
      
      setMetrics(requestMetrics);

      // Use the PDF extraction utility
      setProcessingStatus('Uploading to API and extracting text...');
      const uploadStart = Date.now();
      
      const extractionResult = await extractTextFromPdf(fileToUpload, {
        authToken,
        serverUrl: getBaseUrl(),
        includeRawResponse: true, // Get raw response for admin debugging
      });
      
      const uploadTime = Date.now() - uploadStart;
      setProcessingStatus('Processing response...');

      const endTime = Date.now();
      
      // Calculate response size if we have raw response
      const responseSize = extractionResult.rawResponse 
        ? new Blob([JSON.stringify(extractionResult.rawResponse)]).size 
        : 0;

      requestMetrics.endTime = endTime;
      requestMetrics.duration = endTime - startTime;
      requestMetrics.responseSize = responseSize;
      requestMetrics.statusCode = extractionResult.statusCode;
      requestMetrics.uploadTime = uploadTime;
      setMetrics({ ...requestMetrics });

      if (!extractionResult.success) {
        setResult({
          success: false,
          error: extractionResult.error || 'Extraction failed',
        });
        return;
      }

      // Build debug info from extraction result
      const warnings: string[] = [];
      const responseKeys = extractionResult.rawResponse ? Object.keys(extractionResult.rawResponse) : [];
      
      if (!extractionResult.textFieldUsed) {
        warnings.push('Text field detection may have failed');
      }
      
      const finalExtractedText = extractionResult.text;
      
      setResult({
        success: true,
        text: finalExtractedText,
        rawResponse: extractionResult.rawResponse,
        debugInfo: {
          responseKeys,
          textFieldUsed: extractionResult.textFieldUsed,
          warnings,
        },
        metadata: {
          pageCount: extractionResult.pageCount,
          fileSize: requestMetrics.requestSize,
          processingTime: requestMetrics.duration,
        },
        isCountingTokens: true,
      });

      // Count tokens (local, instant)
      if (finalExtractedText) {
        try {
          const tokenResult = countTokens(finalExtractedText);
          setResult(prev => prev ? {
            ...prev,
            tokens: tokenResult.tokens,
            isCountingTokens: false,
          } : null);
        } catch (err) {
          console.error('Error counting tokens:', err);
          setResult(prev => prev ? {
            ...prev,
            isCountingTokens: false,
          } : null);
        }
      }

    } catch (error) {
      const endTime = Date.now();
      setMetrics(prev => prev ? { ...prev, endTime, duration: endTime - prev.startTime } : null);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTokenCount = (tokens: number): string => {
    return tokens.toLocaleString();
  };

  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-3 pb-48">
        <div className="w-full space-y-2">
          <div>
            <h1 className="text-lg font-bold">Document Text Extraction Test</h1>
            <p className="text-xs text-muted-foreground">Test endpoint: /api/pdf/extract-text (supports PDF and images)</p>
          </div>

          {/* Server Selection */}
          <div className="flex items-center gap-3 py-1.5 border-b">
            <span className="text-xs font-semibold w-24">Server:</span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={serverType === 'local' ? 'default' : 'outline'}
                onClick={() => setServerType('local')}
                className="h-7 text-xs px-2"
              >
                Localhost
              </Button>
              <Button
                size="sm"
                variant={serverType === 'production' ? 'default' : 'outline'}
                onClick={() => setServerType('production')}
                className="h-7 text-xs px-2"
              >
                Production
              </Button>
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              {getBaseUrl()}
            </span>
          </div>

          {/* Auth Token */}
          <div className="flex items-center gap-3 py-1.5 border-b">
            <span className="text-xs font-semibold w-24">Auth Token:</span>
            <BasicInput
              type="text"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Enter auth token"
              className="h-7 text-xs flex-1"
            />
          </div>

          {/* Input Mode Selection */}
          <div className="flex items-center gap-3 py-1.5 border-b">
            <span className="text-xs font-semibold w-24">Input Mode:</span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={inputMode === 'upload' ? 'default' : 'outline'}
                onClick={() => handleModeChange('upload')}
                className="h-7 text-xs px-2"
              >
                Upload File
              </Button>
              <Button
                size="sm"
                variant={inputMode === 'url' ? 'default' : 'outline'}
                onClick={() => handleModeChange('url')}
                className="h-7 text-xs px-2"
              >
                URL
              </Button>
            </div>
          </div>

          {/* File Upload */}
          {inputMode === 'upload' && (
            <div className="py-1.5 border-b">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold w-24">File:</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_STRING}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs px-2"
                >
                  <Upload className="mr-1 h-3 w-3" />
                  Select File
                </Button>
                <span className="text-xs text-muted-foreground">PDF or Image</span>
                
                {selectedFile && (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs">
                      {isPdfFile(selectedFile) ? (
                        <FileText className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="font-mono">{selectedFile.name}</span>
                      <span className="text-muted-foreground">({formatBytes(selectedFile.size)})</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRemoveFile}
                        className="h-4 w-4 p-0 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* URL Input */}
          {inputMode === 'url' && (
            <div className="py-1.5 border-b">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-semibold w-24">File URL:</span>
                <div className="flex-1 flex gap-2">
                  <BasicInput
                    type="url"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://example.com/document.pdf or image.jpg"
                    className="h-7 text-xs flex-1"
                  />
                  {pdfUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearUrl}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="ml-28 space-y-1">
                <div className="text-xs text-muted-foreground">
                  Enter a publicly accessible URL to a PDF or image file
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1.5">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>File will be downloaded in your browser, then sent to the API (current workaround until API supports URLs)</span>
                </div>
              </div>
            </div>
          )}

          {/* Extract Button */}
          <div className="flex items-center gap-3 py-1.5 border-b">
            <span className="text-xs font-semibold w-24">Action:</span>
            <Button
              size="sm"
              onClick={handleExtract}
              disabled={
                isProcessing ||
                (inputMode === 'upload' && !selectedFile) ||
                (inputMode === 'url' && !pdfUrl.trim())
              }
              className="h-7 text-xs px-2"
            >
              {isProcessing && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {isProcessing ? 'Processing...' : 'Extract Text'}
            </Button>
            
            {/* Processing Status */}
            {processingStatus && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {processingStatus}
                </div>
              </div>
            )}
            
            {/* Show URL preview when not processing */}
            {!isProcessing && inputMode === 'url' && pdfUrl && (
              <span className="text-xs text-muted-foreground">
                URL: <span className="font-mono">{pdfUrl.length > 60 ? `${pdfUrl.substring(0, 60)}...` : pdfUrl}</span>
              </span>
            )}
          </div>

          {/* Request & Metrics Info */}
          {metrics && (
            <div className="py-1.5 border-b">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold w-24">Request Info:</span>
              </div>
              <div className="ml-28 space-y-2">
                {/* Request Details */}
                <div className="p-2 bg-muted/50 border rounded text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Input Type:</span>
                    <span className="font-semibold capitalize">{metrics.inputMode}</span>
                    {metrics.inputMode === 'url' && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">(downloaded client-side)</span>
                    )}
                  </div>
                  {metrics.inputSource && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20">Source:</span>
                      <span className="font-mono text-xs truncate max-w-md" title={metrics.inputSource}>
                        {metrics.inputSource}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Method:</span>
                    <span className="font-mono font-semibold">{metrics.method}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Endpoint:</span>
                    <span className="font-mono text-xs">{metrics.endpoint}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-20">Full URL:</span>
                    <span className="font-mono text-xs">{getBaseUrl()}{metrics.endpoint}</span>
                  </div>
                  {metrics.statusCode && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20">Status:</span>
                      <span className={`font-mono font-semibold ${metrics.statusCode >= 200 && metrics.statusCode < 300 ? 'text-green-600' : 'text-destructive'}`}>
                        {metrics.statusCode}
                      </span>
                    </div>
                  )}
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="p-2 bg-muted/50 border rounded">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      <span>Total Duration</span>
                    </div>
                    <div className="font-mono font-semibold text-sm">
                      {metrics.duration ? formatDuration(metrics.duration) : '...'}
                    </div>
                  </div>
                  <div className="p-2 bg-muted/50 border rounded">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Database className="h-3 w-3" />
                      <span>File Size</span>
                    </div>
                    <div className="font-mono font-semibold text-sm">{formatBytes(metrics.requestSize)}</div>
                  </div>
                  {metrics.responseSize && (
                    <div className="p-2 bg-muted/50 border rounded">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Database className="h-3 w-3" />
                        <span>Response Size</span>
                      </div>
                      <div className="font-mono font-semibold text-sm">{formatBytes(metrics.responseSize)}</div>
                    </div>
                  )}
                  {result?.text && (
                    <div className="p-2 bg-muted/50 border rounded">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <FileText className="h-3 w-3" />
                        <span>Characters</span>
                      </div>
                      <div className="font-mono font-semibold text-sm">{result.text.length.toLocaleString()}</div>
                    </div>
                  )}
                  {result?.tokens !== undefined && (
                    <div className="p-2 bg-muted/50 border rounded">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Hash className="h-3 w-3" />
                        <span>Tokens (o200k)</span>
                      </div>
                      <div className="font-mono font-semibold text-sm">{formatTokenCount(result.tokens)}</div>
                    </div>
                  )}
                  {result?.isCountingTokens && !result?.tokens && (
                    <div className="p-2 bg-muted/50 border rounded">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Hash className="h-3 w-3" />
                        <span>Tokens (o200k)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Counting...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timing Breakdown for URL mode */}
                {metrics.inputMode === 'url' && (metrics.downloadTime || metrics.uploadTime) && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {metrics.downloadTime && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                        <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 mb-1">
                          <Clock className="h-3 w-3" />
                          <span>Download Time</span>
                        </div>
                        <div className="font-mono font-semibold text-sm text-blue-900 dark:text-blue-100">
                          {formatDuration(metrics.downloadTime)}
                        </div>
                      </div>
                    )}
                    {metrics.uploadTime && (
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
                        <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-300 mb-1">
                          <Clock className="h-3 w-3" />
                          <span>API Processing</span>
                        </div>
                        <div className="font-mono font-semibold text-sm text-green-900 dark:text-green-100">
                          {formatDuration(metrics.uploadTime)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="py-1.5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold w-24">Result:</span>
                <span className={`text-xs font-semibold ${result.success ? 'text-green-600' : 'text-destructive'}`}>
                  {result.success ? '✓ Success' : '✗ Failed'}
                </span>
                {result.metadata?.pageCount && (
                  <span className="text-xs text-muted-foreground">
                    ({result.metadata.pageCount} pages)
                  </span>
                )}
              </div>

              {/* Admin Debug Info */}
              {result.debugInfo && (
                <div className="ml-28 mb-3 space-y-2">
                  {/* Response Structure */}
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                    <div className="flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">API Response Structure</div>
                        <div className="space-y-1">
                          <div className="text-blue-800 dark:text-blue-200">
                            <span className="font-medium">Available keys:</span> {result.debugInfo.responseKeys.join(', ') || 'none'}
                          </div>
                          {result.debugInfo.textFieldUsed && (
                            <div className="text-blue-800 dark:text-blue-200">
                              <span className="font-medium">Text extracted from:</span> <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">{result.debugInfo.textFieldUsed}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {result.debugInfo.warnings.length > 0 && (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Warnings</div>
                          <ul className="space-y-0.5 text-amber-800 dark:text-amber-200">
                            {result.debugInfo.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Indicator */}
                  {result.success && result.debugInfo.textFieldUsed && result.debugInfo.warnings.length === 0 && (
                    <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="text-green-800 dark:text-green-200">Text successfully extracted from standard field</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {result.error && (
                <div className="ml-28 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                  {result.error}
                </div>
              )}
              
              {result.text && (
                <div className="ml-28 space-y-3">
                  {/* Extracted Text Content */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Extracted Text Content</span>
                        {result.debugInfo?.textFieldUsed && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-mono">
                            {result.debugInfo.textFieldUsed}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(result.text || '')}
                        className="h-6 text-xs px-2"
                      >
                        Copy Text
                      </Button>
                    </div>
                    <div className="p-6 bg-background border-2 rounded-lg overflow-y-auto max-h-[600px]">
                      <div className="text-sm leading-7 text-foreground whitespace-pre-wrap break-words">
                        {result.text}
                      </div>
                    </div>
                  </div>

                  {/* Raw API Response */}
                  {result.rawResponse && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-muted-foreground">Raw API Response (Admin)</div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(result.rawResponse, null, 2))}
                          className="h-5 text-xs px-2"
                        >
                          Copy JSON
                        </Button>
                      </div>
                      <details className="group">
                        <summary className="cursor-pointer list-none">
                          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1">
                            <span className="group-open:rotate-90 transition-transform">▶</span>
                            <span>Show/Hide Full JSON Response</span>
                          </div>
                        </summary>
                        <div className="mt-2 p-3 bg-muted/50 border rounded text-xs font-mono overflow-auto max-h-96">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(result.rawResponse, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

