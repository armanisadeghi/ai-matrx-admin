"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Smartphone, Monitor, ExternalLink, BarChart3, AlertTriangle } from "lucide-react";

export default function Page() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState({ 
    titleWidth: 0, 
    descriptionWidth: 0, 
    titleCharCount: 0, 
    descriptionCharCount: 0, 
    html: "" 
  });

  const calculatePixelWidths = useCallback(() => {
    // Calculate character counts
    const titleCharCount = title.length;
    const descriptionCharCount = description.length;

    if (!title && !description) {
      setResult(prev => ({ 
        ...prev, 
        titleWidth: 0, 
        descriptionWidth: 0, 
        titleCharCount: 0, 
        descriptionCharCount: 0 
      }));
      return;
    }

    // Create a canvas to measure text
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return;

    context.font = "400 20px 'Roboto', Arial, sans-serif";
    const titleWidth = title ? context.measureText(title).width : 0;

    context.font = "400 13px 'Roboto', Arial, sans-serif";
    const descriptionWidth = description ? context.measureText(description).width : 0;

    setResult(prev => ({ 
      ...prev, 
      titleWidth, 
      descriptionWidth, 
      titleCharCount, 
      descriptionCharCount 
    }));
  }, [title, description]);

  // Real-time calculation with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePixelWidths();
    }, 150);

    return () => clearTimeout(timer);
  }, [calculatePixelWidths]);

  const getResultStatus = (width: number, desktopLimit: number, mobileLimit: number) => {
    const isDesktopOk = width <= desktopLimit;
    const isMobileOk = width <= mobileLimit;
    return { isDesktopOk, isMobileOk };
  };

  const getCharacterStatus = (charCount: number, limit: number) => {
    return charCount <= limit;
  };

  // Updated limits based on 2024 research:
  // Desktop: ~580px for titles, ~920px for descriptions
  // Mobile: ~920px for titles (longer on mobile), ~680px for descriptions
  const titleStatus = getResultStatus(result.titleWidth, 580, 920);
  const descriptionStatus = getResultStatus(result.descriptionWidth, 920, 680);
  
  // Character limits for SEO best practices
  const titleCharStatus = getCharacterStatus(result.titleCharCount, 60);
  const descriptionCharStatus = getCharacterStatus(result.descriptionCharCount, 160);

  const handleFetchData = () => {
    console.log("Fetching data from URL:", url);
    // TODO: Implement scraping utility
  };

  const getDisplayUrl = () => {
    if (!url) return "example.com";
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  const getUrlBreadcrumb = () => {
    if (!url) return " › category › page";
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
      
      if (pathSegments.length === 0) {
        return " › category › page";
      }
      
      // Take the last 2-3 segments for a realistic breadcrumb
      const relevantSegments = pathSegments.slice(-3);
      return " › " + relevantSegments.join(" › ");
    } catch {
      return " › category › page";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center py-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" className="flex-shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Meta Pixel Width & Character Calculator
              </CardTitle>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Calculate pixel widths and character counts for Google Search meta titles and descriptions with live preview
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Updated for 2024 - using Google Sans font, current pixel limits (13px descriptions), and SEO character limits (60/160 chars)
            </p>
          </CardHeader>
        </Card>

        {/* Main Content - Three Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Side - Input Form */}
          <div className="xl:col-span-4 space-y-6">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Input Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="url" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Website URL
                    </Label>
                    <Button
                      onClick={handleFetchData}
                      disabled={!url}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Fetch Data
                    </Button>
                  </div>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/category/page-name"
                    className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaTitle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Meta Title
                  </Label>
                  <Input
                    id="metaTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your meta title here..."
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Meta Description
                  </Label>
                  <Textarea
                    id="metaDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter your meta description here..."
                    rows={4}
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {(result.titleWidth > 0 || result.descriptionWidth > 0 || result.titleCharCount > 0 || result.descriptionCharCount > 0) && (
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title Results */}
                  {title && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
                        Meta Title
                        <Badge variant="outline" className="text-xs">
                          {result.titleWidth.toFixed(0)}px
                        </Badge>
                        <Badge variant={titleCharStatus ? "default" : "destructive"} className="text-xs">
                          {result.titleCharCount}/60 chars
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                          <Monitor className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Desktop</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Limit: 580px</div>
                          </div>
                          {titleStatus.isDesktopOk ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                          <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Limit: 920px</div>
                          </div>
                          {titleStatus.isMobileOk ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description Results */}
                  {description && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
                        Meta Description
                        <Badge variant="outline" className="text-xs">
                          {result.descriptionWidth.toFixed(0)}px
                        </Badge>
                        <Badge variant={descriptionCharStatus ? "default" : "destructive"} className="text-xs">
                          {result.descriptionCharCount}/160 chars
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                          <Monitor className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Desktop</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Limit: 920px</div>
                          </div>
                          {descriptionStatus.isDesktopOk ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                          <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Limit: 680px</div>
                          </div>
                          {descriptionStatus.isMobileOk ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Side - Google Search Preview - Much Larger */}
          <div className="xl:col-span-8 space-y-6">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Live Google Search Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Google Search Bar Mockup */}
                <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" className="flex-shrink-0">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <div className="flex-1 bg-white dark:bg-gray-600 rounded-full px-6 py-3 text-base text-gray-600 dark:text-gray-300 max-w-2xl">
                      {title || "Your search query"}
                    </div>
                  </div>
                  
                  <div className="flex gap-6 text-base border-b border-gray-300 dark:border-gray-600 pb-3 mb-6">
                    <span className="text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-3">All</span>
                    <span className="text-gray-600 dark:text-gray-400">Images</span>
                    <span className="text-gray-600 dark:text-gray-400">Videos</span>
                    <span className="text-gray-600 dark:text-gray-400">News</span>
                    <span className="text-gray-600 dark:text-gray-400">Maps</span>
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    About 600,000,000 results (0.54 seconds)
                  </div>
                </div>

                {/* Search Result Preview - Much Larger and More Realistic */}
                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="space-y-3">
                      {/* URL */}
                      <div className="text-sm">
                        <span className="text-green-700 dark:text-green-400">{getDisplayUrl()}</span>
                        <span className="text-gray-500 dark:text-gray-400">{getUrlBreadcrumb()}</span>
                      </div>
                      
                      {/* Title - Larger and more realistic */}
                      <div className="text-blue-600 dark:text-blue-400 text-xl font-medium leading-relaxed hover:underline cursor-pointer max-w-3xl">
                        {title || "Your Meta Title Will Appear Here - This Shows How It Looks in Google Search Results"}
                      </div>
                      
                      {/* Description - More space for realistic wrapping */}
                      <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-w-3xl">
                        {description || "Your meta description will appear here. This is usually taken from the Meta Description tag if relevant. This preview shows you exactly how your content will appear in Google search results, with proper spacing and realistic text wrapping that matches Google's actual display."}
                      </div>
                      
                      {/* Additional elements */}
                      <div className="flex gap-6 text-xs text-gray-600 dark:text-gray-400 mt-3">
                        <span>Rating: ★★★★☆</span>
                        <span>$99 - $199</span>
                        <span>In stock</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual indicators for length */}
                  {(title || description) && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <div className="font-medium mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Pixel & Character Analysis
                        </div>
                        {title && (
                          <div className="mb-2 flex items-center gap-2 flex-wrap">
                            <span className="font-medium">Title:</span>
                            <Badge variant="outline" className="text-xs">{result.titleWidth.toFixed(0)}px</Badge>
                            <Badge variant={titleCharStatus ? "default" : "destructive"} className="text-xs">
                              {result.titleCharCount}/60 chars
                            </Badge>
                            {!titleStatus.isDesktopOk && (
                              <span className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                may truncate on desktop
                              </span>
                            )}
                            {!titleStatus.isMobileOk && (
                              <span className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                may truncate on mobile
                              </span>
                            )}
                            {!titleCharStatus && (
                              <span className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                too long for SEO
                              </span>
                            )}
                            {titleStatus.isDesktopOk && titleStatus.isMobileOk && titleCharStatus && (
                              <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                optimal length
                              </span>
                            )}
                          </div>
                        )}
                        {description && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">Description:</span>
                            <Badge variant="outline" className="text-xs">{result.descriptionWidth.toFixed(0)}px</Badge>
                            <Badge variant={descriptionCharStatus ? "default" : "destructive"} className="text-xs">
                              {result.descriptionCharCount}/160 chars
                            </Badge>
                            {!descriptionStatus.isDesktopOk && (
                              <span className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                may truncate on desktop
                              </span>
                            )}
                            {!descriptionStatus.isMobileOk && (
                              <span className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                may truncate on mobile
                              </span>
                            )}
                            {!descriptionCharStatus && (
                              <span className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                too long for SEO
                              </span>
                            )}
                            {descriptionStatus.isDesktopOk && descriptionStatus.isMobileOk && descriptionCharStatus && (
                              <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                optimal length
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}