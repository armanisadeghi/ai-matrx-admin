"use client";
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, CheckCircle2, Circle, 
  Maximize2, Minimize2, MapPin, Flag, 
  ArrowRight, Play, Pause, RotateCcw
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  status?: 'completed' | 'in-progress' | 'pending';
  category?: string;
}

interface TimelinePeriod {
  period: string;
  events: TimelineEvent[];
}

interface TimelineData {
  title: string;
  description?: string;
  periods: TimelinePeriod[];
}

interface TimelineBlockProps {
  timeline: TimelineData;
}

const TimelineBlock: React.FC<TimelineBlockProps> = ({ timeline }) => {
  const [completedEvents, setCompletedEvents] = useState<Set<string>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    timeline.periods.forEach(period => {
      period.events.forEach(event => {
        if (event.category) cats.add(event.category);
      });
    });
    return ['all', ...Array.from(cats)];
  }, [timeline.periods]);

  // Filter events by category
  const filteredPeriods = useMemo(() => {
    if (selectedCategory === 'all') return timeline.periods;
    
    return timeline.periods.map(period => ({
      ...period,
      events: period.events.filter(event => event.category === selectedCategory)
    })).filter(period => period.events.length > 0);
  }, [timeline.periods, selectedCategory]);

  // Calculate progress
  const totalEvents = timeline.periods.reduce((sum, period) => sum + period.events.length, 0);
  const completedCount = completedEvents.size;
  const progressPercentage = totalEvents > 0 ? Math.round((completedCount / totalEvents) * 100) : 0;

  const toggleEventCompletion = (eventId: string) => {
    const newCompleted = new Set(completedEvents);
    if (newCompleted.has(eventId)) {
      newCompleted.delete(eventId);
    } else {
      newCompleted.add(eventId);
    }
    setCompletedEvents(newCompleted);
  };

  const resetProgress = () => {
    setCompletedEvents(new Set());
  };

  const getStatusIcon = (event: TimelineEvent) => {
    if (completedEvents.has(event.id)) {
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    }
    
    switch (event.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'in-progress':
        return <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'pending':
        return <Pause className="h-5 w-5 text-gray-400 dark:text-gray-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400 dark:text-gray-600" />;
    }
  };

  const getStatusColor = (event: TimelineEvent) => {
    if (completedEvents.has(event.id)) {
      return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30';
    }
    
    switch (event.status) {
      case 'completed':
        return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30';
      case 'in-progress':
        return 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30';
      case 'pending':
        return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50';
      default:
        return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
    }
  };

  return (
    <>
      {/* Fullscreen Backdrop */}
      {isFullScreen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsFullScreen(false)}
        />
      )}

      <div className={`w-full ${isFullScreen ? 'fixed inset-0 z-50 flex items-center justify-center p-4' : 'py-6'}`}>
        <div className={`max-w-6xl mx-auto ${isFullScreen ? 'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl h-full max-h-[95vh] w-full flex flex-col overflow-hidden' : ''}`}>
          
          {/* Fullscreen Header */}
          {isFullScreen && (
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Timeline View</h3>
              </div>
              <button
                onClick={() => setIsFullScreen(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-all shadow-sm"
              >
                <Minimize2 className="h-4 w-4" />
                <span>Exit</span>
              </button>
            </div>
          )}

          {/* Scrollable Content */}
          <div className={isFullScreen ? 'flex-1 overflow-y-auto' : ''}>
            <div className="p-6 space-y-6">

              {/* Header Section */}
              <div className="bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 rounded-2xl p-6 shadow-lg border-2 border-blue-200 dark:border-blue-800/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-xl shadow-md">
                      <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {timeline.title}
                      </h1>
                      {timeline.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {timeline.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isFullScreen && (
                    <button
                      onClick={() => setIsFullScreen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 dark:bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-600 dark:hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                      <Maximize2 className="h-4 w-4" />
                      <span>Timeline View</span>
                    </button>
                  )}
                </div>

                {/* Progress and Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{completedCount}/{totalEvents} events</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 transition-all duration-300 rounded-full"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Category Filter */}
                  {categories.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Filter:</span>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {completedCount > 0 && (
                    <button
                      onClick={resetProgress}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium transition-all"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Timeline Content */}
              <div className="space-y-8">
                {filteredPeriods.map((period, periodIndex) => (
                  <div key={periodIndex} className="relative">
                    {/* Period Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500 dark:bg-indigo-600 text-white rounded-full shadow-md">
                        <Flag className="h-4 w-4" />
                        <span className="font-semibold text-sm">{period.period}</span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-indigo-300 to-transparent dark:from-indigo-700"></div>
                    </div>

                    {/* Events */}
                    <div className="space-y-4 ml-8">
                      {period.events.map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${getStatusColor(event)}`}
                          onClick={() => toggleEventCompletion(event.id)}
                        >
                          {/* Timeline Line */}
                          <div className="absolute -left-6 top-6 w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-600 border-2 border-white dark:border-gray-900"></div>
                          {eventIndex < period.events.length - 1 && (
                            <div className="absolute -left-5 top-8 w-px h-8 bg-indigo-200 dark:bg-indigo-800"></div>
                          )}

                          {/* Event Content */}
                          <div className="flex-shrink-0">
                            {getStatusIcon(event)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${
                                completedEvents.has(event.id) ? 'line-through opacity-75' : ''
                              }`}>
                                {event.title}
                              </h3>
                              {event.category && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                  {event.category}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                              <Clock className="h-3 w-3" />
                              <span>{event.date}</span>
                            </div>
                            
                            <p className={`text-sm text-gray-700 dark:text-gray-300 ${
                              completedEvents.has(event.id) ? 'line-through opacity-75' : ''
                            }`}>
                              {event.description}
                            </p>
                          </div>

                          <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Completion Message */}
              {progressPercentage === 100 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-6 border-2 border-green-300 dark:border-green-700 shadow-lg">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-3 bg-green-500 dark:bg-green-600 rounded-full">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-1">
                        Timeline Complete!
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        All events in {timeline.title} have been completed!
                      </p>
                    </div>
                    <button
                      onClick={resetProgress}
                      className="mt-2 px-4 py-2 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                      Start Again
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TimelineBlock;
