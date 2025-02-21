import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Send } from 'lucide-react';

const AppPreview = ({ selectedFeatures }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-2xl font-bold text-gray-900">Live Preview</h1>
        <p className="text-gray-500 mb-6">See your applet in action</p>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          {/* Phone Device Mock */}
          <div className="mx-auto max-w-xs bg-gray-800 rounded-3xl p-2 shadow-xl">
            <div className="bg-white rounded-2xl h-96 overflow-hidden flex flex-col">
              {/* App Header */}
              <div className="bg-indigo-500 text-white p-4">
                <h3 className="font-bold">Language Assistant</h3>
              </div>
              
              {/* App Content */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* User Message */}
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                    <p className="text-sm text-gray-800">I need to analyze this customer feedback</p>
                    <p className="text-xs text-gray-500 mt-1">User - 2:34 PM</p>
                  </div>
                </div>
                
                {/* Show AI Response if NLP is selected */}
                {selectedFeatures.nlp && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-100 rounded-lg p-3 max-w-xs">
                      <p className="text-sm text-indigo-900">
                        I've analyzed the text. The sentiment is positive.
                      </p>
                      <p className="text-sm text-indigo-900 mt-1">
                        Key topics: product quality, customer service
                      </p>
                      <p className="text-sm text-indigo-900 mt-1">
                        Recommended action: share with the team
                      </p>
                      <p className="text-xs text-indigo-500 mt-1">AI Assistant - 2:35 PM</p>
                    </div>
                  </div>
                )}
                
                {/* Show Image Recognition Response if selected */}
                {selectedFeatures.imageRecognition && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-100 rounded-lg p-3 max-w-xs">
                      <p className="text-sm text-indigo-900">
                        I can analyze product images for you.
                      </p>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <div className="h-10 bg-gray-300 rounded"></div>
                        <div className="h-10 bg-gray-300 rounded"></div>
                      </div>
                      <p className="text-xs text-indigo-500 mt-1">AI Assistant - 2:35 PM</p>
                    </div>
                  </div>
                )}
                
                {/* Show Sentiment Analysis Response if selected */}
                {selectedFeatures.sentimentAnalysis && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-100 rounded-lg p-3 max-w-xs">
                      <p className="text-sm text-indigo-900">
                        Sentiment analysis: 😊 85% positive
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div className="bg-green-500 h-2 rounded-full w-4/5"></div>
                      </div>
                      <p className="text-xs text-indigo-500 mt-1">AI Assistant - 2:35 PM</p>
                    </div>
                  </div>
                )}
                
                {/* Show Data Prediction Response if selected */}
                {selectedFeatures.dataPrediction && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-100 rounded-lg p-3 max-w-xs">
                      <p className="text-sm text-indigo-900">
                        Based on historical data, I predict:
                      </p>
                      <p className="text-sm text-indigo-900 mt-1">
                        - 24% increase in Q4 sales
                      </p>
                      <p className="text-sm text-indigo-900">
                        - 15% reduction in support tickets
                      </p>
                      <p className="text-xs text-indigo-500 mt-1">AI Assistant - 2:35 PM</p>
                    </div>
                  </div>
                )}
                
                {/* Show Automated Responses if selected */}
                {selectedFeatures.automatedResponses && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-100 rounded-lg p-3 max-w-xs">
                      <p className="text-sm text-indigo-900">
                        I've prepared some response templates:
                      </p>
                      <div className="mt-2 space-y-1">
                        <div className="bg-white text-xs p-1 rounded border border-indigo-200">
                          Thank you for your feedback!
                        </div>
                        <div className="bg-white text-xs p-1 rounded border border-indigo-200">
                          We'll look into this right away.
                        </div>
                      </div>
                      <p className="text-xs text-indigo-500 mt-1">AI Assistant - 2:35 PM</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Input Area */}
              <div className="p-3 border-t">
                <div className="flex items-center bg-gray-50 rounded-full px-3 py-1">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent text-sm border-0 focus:ring-0 outline-none"
                  />
                  <button className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppPreview;