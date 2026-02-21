"use client";
import React, { useState, useMemo } from 'react';
import {
  Calendar, Clock, CheckCircle2, Circle,
  ArrowRight, Play, Pause, RotateCcw,
  ChevronDown, ChevronRight, Flag, CheckSquare
} from 'lucide-react';
import ImportTasksModal from '@/features/tasks/components/ImportTasksModal';
import { convertTimelineToTasks } from '@/features/tasks/utils/importConverters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BlockHeaderWrapper from '@/components/mardown-display/blocks/common/BlockHeaderWrapper';
import IconButton from '@/components/official/IconButton';
import type { MenuItem } from '@/components/official/AdvancedMenu';

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
  taskId?: string;
}

const TimelineBlock: React.FC<TimelineBlockProps> = ({ timeline: initialTimeline, taskId }) => {
  const [timeline, setTimeline] = useState<TimelineData>(initialTimeline);
  const [completedEvents, setCompletedEvents] = useState<Set<string>>(new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [collapsedPeriods, setCollapsedPeriods] = useState<Set<string>>(
    new Set(initialTimeline.periods.map(period => period.period))
  );

  // Convert timeline to tasks format
  const convertedTasks = useMemo(() => {
    return convertTimelineToTasks(timeline.title, timeline.periods);
  }, [timeline]);

  // Build checkbox state from completed events
  const checkboxState = useMemo(() => {
    const state: Record<string, boolean> = {};
    convertedTasks.forEach(section => {
      if (section.children) {
        section.children.forEach(task => {
          state[task.id] = task.checked || false;
          if (task.children) {
            task.children.forEach(subtask => {
              state[subtask.id] = subtask.checked || false;
            });
          }
        });
      }
    });
    return state;
  }, [convertedTasks]);

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
    return timeline.periods
      .map(period => ({
        ...period,
        events: period.events.filter(event => event.category === selectedCategory),
      }))
      .filter(period => period.events.length > 0);
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

  const togglePeriodCollapse = (periodName: string) => {
    const newCollapsed = new Set(collapsedPeriods);
    if (newCollapsed.has(periodName)) {
      newCollapsed.delete(periodName);
    } else {
      newCollapsed.add(periodName);
    }
    setCollapsedPeriods(newCollapsed);
  };

  const isPeriodCompleted = (period: TimelinePeriod) => {
    if (period.events.length === 0) return false;
    return period.events.every(event => completedEvents.has(event.id));
  };

  const getStatusIcon = (event: TimelineEvent) => {
    if (completedEvents.has(event.id)) {
      return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    switch (event.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'in-progress':
        return <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'pending':
        return <Pause className="h-4 w-4 text-gray-400 dark:text-gray-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400 dark:text-gray-600" />;
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
        return 'border-gray-200 dark:border-gray-700 bg-textured';
    }
  };

  const handleDataImport = (data: unknown) => {
    const parsed = data as Partial<TimelineData>;
    if (
      typeof parsed?.title === 'string' &&
      Array.isArray(parsed?.periods)
    ) {
      setTimeline(parsed as TimelineData);
      setCompletedEvents(new Set());
      setCollapsedPeriods(new Set((parsed as TimelineData).periods.map(p => p.period)));
      setSelectedCategory('all');
    } else {
      console.error('TimelineBlock: imported JSON does not match expected timeline structure');
    }
  };

  // Controls slot: progress bar + category filter + reset
  const headerControls = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{completedCount}/{totalEvents} events</span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {categories.length > 1 && (
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger size="sm" className="w-auto min-w-[7rem] gap-1.5">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat === 'all' ? 'All Categories' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {completedCount > 0 && (
          <button
            onClick={resetProgress}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium transition-all"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <BlockHeaderWrapper
        icon={Calendar}
        title={timeline.title}
        description={timeline.description}
        controls={headerControls}
        canvasType="timeline"
        canvasData={timeline}
        canvasMetadata={{ title: timeline.title }}
        taskId={taskId}
        exportData={timeline}
        exportFilename={timeline.title.replace(/\s+/g, '-').toLowerCase() || 'timeline'}
        onDataImport={handleDataImport}
        extraActions={
          <IconButton
            icon={CheckSquare}
            tooltip="Import into Task Manager"
            onClick={() => setIsImportModalOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 hover:shadow-md transform hover:scale-105 transition-all"
          />
        }
        extraMenuItems={[
          {
            key: 'import-tasks',
            icon: CheckSquare,
            iconColor: 'text-primary',
            label: 'Import into Task Manager',
            action: () => setIsImportModalOpen(true),
            showToast: false,
          } satisfies MenuItem,
        ]}
      >
        {/* Timeline periods */}
        <div className="space-y-6">
          {filteredPeriods.map((period, periodIndex) => {
            const isCollapsed = collapsedPeriods.has(period.period);
            const isCompleted = isPeriodCompleted(period);

            return (
              <div key={periodIndex} className="relative">
                {/* Period header */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => togglePeriodCollapse(period.period)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm transition-all hover:shadow-md ${
                      isCompleted
                        ? 'bg-green-500 dark:bg-green-600 text-white'
                        : 'bg-indigo-500 dark:bg-indigo-600 text-white'
                    }`}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {isCompleted ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Flag className="h-3 w-3" />
                    )}
                    <span className="font-semibold text-xs">{period.period}</span>
                    {isCompleted && (
                      <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                        Complete
                      </span>
                    )}
                  </button>
                  <div className="flex-1 h-px bg-gradient-to-r from-indigo-300 to-transparent dark:from-indigo-700" />
                </div>

                {/* Events */}
                {!isCollapsed && (
                  <div className="space-y-3 ml-6 transition-all duration-300">
                    {period.events.map((event, eventIndex) => (
                      <div
                        key={event.id}
                        className={`relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${getStatusColor(event)}`}
                        onClick={() => toggleEventCompletion(event.id)}
                      >
                        {/* Timeline connector dots */}
                        <div className="absolute -left-5 top-4 w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-600 border border-white dark:border-gray-900" />
                        {eventIndex < period.events.length - 1 && (
                          <div className="absolute -left-5 top-6 w-1 h-6 bg-indigo-200 dark:bg-indigo-800" />
                        )}

                        <div className="flex-shrink-0">{getStatusIcon(event)}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className={`font-semibold text-sm text-gray-900 dark:text-gray-100 ${
                                completedEvents.has(event.id) ? 'line-through opacity-75' : ''
                              }`}
                            >
                              {event.title}
                            </h3>
                            {event.category && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                {event.category}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                            <Clock className="h-3 w-3" />
                            <span>{event.date}</span>
                          </div>

                          <p
                            className={`text-xs text-gray-700 dark:text-gray-300 leading-relaxed ${
                              completedEvents.has(event.id) ? 'line-through opacity-75' : ''
                            }`}
                          >
                            {event.description}
                          </p>
                        </div>

                        <ArrowRight className="h-3 w-3 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Completion message */}
        {progressPercentage === 100 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-300 dark:border-green-700 shadow-md">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-green-500 dark:bg-green-600 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-1">
                  Timeline Complete!
                </h3>
                <p className="text-xs text-green-700 dark:text-green-300">
                  All events in {timeline.title} have been completed!
                </p>
              </div>
              <button
                onClick={resetProgress}
                className="mt-1 px-3 py-1.5 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg font-medium text-xs shadow-sm hover:shadow-md transform hover:scale-105 transition-all"
              >
                Start Again
              </button>
            </div>
          </div>
        )}
      </BlockHeaderWrapper>

      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        tasks={convertedTasks}
        checkboxState={checkboxState}
      />
    </>
  );
};

export default TimelineBlock;
