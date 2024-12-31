import React from 'react';
import { SimpleTooltip, AdvancedTooltip } from '@/components/matrx/Tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Info, AlertCircle, CheckCircle, HelpCircle, Settings, ArrowRight, Coffee } from 'lucide-react';

const TooltipDemo = () => {
  return (
    <div className="container mx-auto p-8 space-y-8 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Tooltip Components</h1>
        <p className="text-muted-foreground text-lg">
          Showcase of SimpleTooltip and AdvancedTooltip components
        </p>
      </div>

      <Tabs defaultValue="simple" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple">Simple Tooltip</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Tooltip</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SimpleTooltip</CardTitle>
              <CardDescription>
                A lightweight tooltip component for basic use cases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Basic Usage */}
              <div className="flex items-center justify-center gap-4">
                <SimpleTooltip text="This is a basic tooltip">
                  <Button variant="outline">Hover me</Button>
                </SimpleTooltip>

                <SimpleTooltip text="Info tooltip">
                  <Info className="w-5 h-5 text-blue-500 cursor-help" />
                </SimpleTooltip>

                <SimpleTooltip text="Click for settings">
                  <Settings className="w-5 h-5 cursor-pointer" />
                </SimpleTooltip>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6 space-y-6">
          {/* Positions Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Positions</CardTitle>
              <CardDescription>
                Tooltips can be positioned on any side of the element
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <AdvancedTooltip text="Top tooltip" side="top">
                  <Button variant="outline" className="w-full">Top</Button>
                </AdvancedTooltip>
                
                <AdvancedTooltip text="Right tooltip" side="right">
                  <Button variant="outline" className="w-full">Right</Button>
                </AdvancedTooltip>
                
                <AdvancedTooltip text="Bottom tooltip" side="bottom">
                  <Button variant="outline" className="w-full">Bottom</Button>
                </AdvancedTooltip>
                
                <AdvancedTooltip text="Left tooltip" side="left">
                  <Button variant="outline" className="w-full">Left</Button>
                </AdvancedTooltip>
              </div>
            </CardContent>
          </Card>

          {/* Variants Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>
                Different styles for different contexts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-4">
                <AdvancedTooltip 
                  text="Default tooltip" 
                  variant="default"
                >
                  <HelpCircle className="w-5 h-5 cursor-help" />
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="Success message" 
                  variant="success"
                >
                  <CheckCircle className="w-5 h-5 cursor-help text-green-500" />
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="Warning: This action has consequences" 
                  variant="warning"
                >
                  <AlertCircle className="w-5 h-5 cursor-help text-yellow-500" />
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="Error: Something went wrong" 
                  variant="error"
                >
                  <AlertCircle className="w-5 h-5 cursor-help text-red-500" />
                </AdvancedTooltip>
              </div>
            </CardContent>
          </Card>

          {/* Alignment Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Alignment</CardTitle>
              <CardDescription>
                Control how the tooltip aligns with its trigger
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-4">
                <AdvancedTooltip 
                  text="Start aligned" 
                  align="start"
                  side="bottom"
                >
                  <Button variant="outline">Start</Button>
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="Center aligned" 
                  align="center"
                  side="bottom"
                >
                  <Button variant="outline">Center</Button>
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="End aligned" 
                  align="end"
                  side="bottom"
                >
                  <Button variant="outline">End</Button>
                </AdvancedTooltip>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Features Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Features</CardTitle>
              <CardDescription>
                Additional features like custom delays and styling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-4">
                <AdvancedTooltip 
                  text="Instant tooltip"
                  delayDuration={0}
                >
                  <Button variant="outline">No Delay</Button>
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="Multi\nline\ntooltip"
                  contentClassName="max-w-xs"
                >
                  <Button variant="outline">Multiline</Button>
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="Custom offset tooltip"
                  sideOffset={12}
                >
                  <Button variant="outline">Offset</Button>
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="This tooltip is disabled"
                  disabled={true}
                >
                  <Button variant="outline">Disabled</Button>
                </AdvancedTooltip>
              </div>
            </CardContent>
          </Card>

          {/* Real World Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Real World Examples</CardTitle>
              <CardDescription>
                Common use cases for tooltips in applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-center gap-6">
                <AdvancedTooltip 
                  text="Take a coffee break"
                  variant="default"
                  side="bottom"
                >
                  <Coffee className="w-6 h-6 cursor-pointer text-muted-foreground hover:text-foreground transition-colors" />
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="Premium feature\nUpgrade to access"
                  variant="warning"
                  contentClassName="max-w-xs"
                >
                  <Button className="gap-2">
                    Pro Feature <ArrowRight className="w-4 h-4" />
                  </Button>
                </AdvancedTooltip>

                <AdvancedTooltip 
                  text="Changes saved successfully"
                  variant="success"
                  delayDuration={0}
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Saved
                  </div>
                </AdvancedTooltip>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TooltipDemo;