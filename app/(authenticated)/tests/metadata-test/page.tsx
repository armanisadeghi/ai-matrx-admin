"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Smartphone, Monitor } from "lucide-react";

export default function MetaCalculator() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState({ titleWidth: 0, descriptionWidth: 0, html: "" });

  const calculatePixelWidths = () => {
    // Create a canvas to measure text
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return;

    // Measure title width (Arial, 18px, bold for titles)
    context.font = "bold 18px Arial";
    const titleWidth = context.measureText(title).width;

    // Measure description width (Arial, 14px, regular for descriptions)
    context.font = "14px Arial";
    const descriptionWidth = context.measureText(description).width;

    // Define Google pixel limits
    const titleLimitDesktop = 600;
    const titleLimitMobile = 805;
    const descriptionLimitDesktop = 920;
    const descriptionLimitMobile = 680;

    setResult(prev => ({ ...prev, titleWidth, descriptionWidth }));

    // Prepare result for display
    const resultText = `
      <strong>Meta Title:</strong> ${titleWidth.toFixed(2)} pixels<br>
      - Desktop: ${titleWidth <= titleLimitDesktop ? "OK" : "Too long"} (Limit: ${titleLimitDesktop}px)<br>
      - Mobile: ${titleWidth <= titleLimitMobile ? "OK" : "Too long"} (Limit: ${titleLimitMobile}px)<br><br>
      <strong>Meta Description:</strong> ${descriptionWidth.toFixed(2)} pixels<br>
      - Desktop: ${descriptionWidth <= descriptionLimitDesktop ? "OK" : "Too long"} (Limit: ${descriptionLimitDesktop}px)<br>
      - Mobile: ${descriptionWidth <= descriptionLimitMobile ? "OK" : "Too long"} (Limit: ${descriptionLimitMobile}px)
    `;
    setResult((prev) => ({ ...prev, html: resultText }));
  };

  const getResultStatus = (width: number, desktopLimit: number, mobileLimit: number) => {
    const isDesktopOk = width <= desktopLimit;
    const isMobileOk = width <= mobileLimit;
    return { isDesktopOk, isMobileOk };
  };

  const titleStatus = getResultStatus(result.titleWidth, 600, 805);
  const descriptionStatus = getResultStatus(result.descriptionWidth, 920, 680);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header with Google Logo */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              {/* Google Logo SVG */}
              <svg width="32" height="32" viewBox="0 0 24 24" className="flex-shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Meta Pixel Width Calculator
              </CardTitle>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Calculate pixel widths for Google Search meta titles and descriptions
            </p>
          </CardHeader>
        </Card>

        {/* Input Form */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="space-y-6 pt-6">
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

            <Button
              onClick={calculatePixelWidths}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
              disabled={!title && !description}
            >
              Calculate Pixel Widths
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {(result.titleWidth > 0 || result.descriptionWidth > 0) && (
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title Results */}
              {title && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    Meta Title
                    <Badge variant="outline" className="text-xs">
                      {result.titleWidth.toFixed(0)}px
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                      <Monitor className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Desktop</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Limit: 600px</div>
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
                        <div className="text-xs text-gray-500 dark:text-gray-400">Limit: 805px</div>
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
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    Meta Description
                    <Badge variant="outline" className="text-xs">
                      {result.descriptionWidth.toFixed(0)}px
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}