'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useResearchApi } from '../../hooks/useResearchApi';
import { AUTONOMY_CONFIG } from '../../constants';
import { TemplatePicker } from './TemplatePicker';
import { AutonomySelector } from './AutonomySelector';
import type { AutonomyLevel, SuggestResponse, ResearchTemplate } from '../../types';

interface ResearchInitFormProps {
    projectId: string;
}

const STEPS = ['Subject', 'Template', 'Keywords', 'Settings'] as const;

export default function ResearchInitForm({ projectId }: ResearchInitFormProps) {
    const router = useRouter();
    const api = useResearchApi();
    const [isPending, startTransition] = useTransition();

    const [step, setStep] = useState(0);
    const [subjectName, setSubjectName] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<ResearchTemplate | null>(null);
    const [suggestions, setSuggestions] = useState<SuggestResponse | null>(null);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
    const [customKeyword, setCustomKeyword] = useState('');
    const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>('semi');
    const [error, setError] = useState<string | null>(null);

    const fetchSuggestions = async () => {
        if (!subjectName.trim()) return;
        setSuggestLoading(true);
        setError(null);
        try {
            const response = await api.suggest(projectId, { subject_name: subjectName.trim() });
            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(errBody || `Suggest failed (${response.status})`);
            }
            const data: SuggestResponse = await response.json();
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response from suggest endpoint');
            }
            setSuggestions(data);
            setTitle(data.title ?? '');
            setDescription(data.description ?? '');
            setSelectedKeywords(Array.isArray(data.keywords) ? data.keywords.slice(0, 2) : []);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSuggestLoading(false);
        }
    };

    const handleNext = () => {
        if (step === 0 && subjectName.trim()) {
            fetchSuggestions();
        }
        setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const handleBack = () => setStep(s => Math.max(s - 1, 0));

    const toggleKeyword = (kw: string) => {
        setSelectedKeywords(prev =>
            prev.includes(kw)
                ? prev.filter(k => k !== kw)
                : [...prev, kw],
        );
    };

    const addCustomKeyword = () => {
        const kw = customKeyword.trim();
        if (kw && !selectedKeywords.includes(kw)) {
            setSelectedKeywords(prev => [...prev, kw]);
            setCustomKeyword('');
        }
    };

    const handleSubmit = () => {
        if (selectedKeywords.length < 1) {
            setError('Select at least one keyword');
            return;
        }
        setError(null);

        startTransition(async () => {
            try {
                await api.initResearch({
                    project_id: projectId,
                    autonomy_level: autonomyLevel,
                    template_id: selectedTemplate?.id ?? null,
                    subject_name: subjectName.trim() || null,
                    default_search_provider: 'brave',
                    default_search_params: {},
                    good_scrape_threshold: 1000,
                    scrapes_per_keyword: 5,
                });

                await api.addKeywords(projectId, {
                    keywords: selectedKeywords,
                });

                if (autonomyLevel === 'auto') {
                    api.runPipeline(projectId).catch(() => {});
                }

                router.push(`/p/research/${projectId}`);
            } catch (err) {
                setError((err as Error).message);
            }
        });
    };

    const canProceed = step === 0 ? subjectName.trim().length > 0
        : step === 1 ? true
        : step === 2 ? selectedKeywords.length >= 1
        : true;

    return (
        <div className="flex flex-col items-center justify-start min-h-full py-8 px-4 sm:px-6">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={cn(
                            'flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold transition-colors',
                            i === step
                                ? 'bg-primary text-primary-foreground'
                                : i < step
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted text-muted-foreground',
                        )}>
                            {i + 1}
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={cn('h-px w-8 sm:w-12', i < step ? 'bg-primary/40' : 'bg-border')} />
                        )}
                    </div>
                ))}
            </div>

            <div className="w-full max-w-2xl">
                {/* Step 0: Subject */}
                {step === 0 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">What do you want to research?</h1>
                            <p className="mt-2 text-muted-foreground">Enter any topic — a company, person, scientific subject, product, or anything else.</p>
                        </div>
                        <Input
                            value={subjectName}
                            onChange={e => setSubjectName(e.target.value)}
                            placeholder="e.g., All Green Electronics, Cardiac Surgery advances..."
                            className="text-base h-12"
                            style={{ fontSize: '16px' }}
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
                        />
                    </div>
                )}

                {/* Step 1: Template */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">Choose a Template</h1>
                            <p className="mt-2 text-muted-foreground">Templates pre-fill keywords and wire up specialized AI agents. Optional.</p>
                        </div>
                        <TemplatePicker
                            selected={selectedTemplate}
                            onSelect={setSelectedTemplate}
                        />
                    </div>
                )}

                {/* Step 2: Keywords */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">Review & Pick Keywords</h1>
                            <p className="mt-2 text-muted-foreground">Select at least one keyword for your research.</p>
                        </div>

                        {suggestLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>AI is generating suggestions...</span>
                            </div>
                        )}

                        {suggestions && !suggestLoading && (
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Suggested Title</label>
                                    <Input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="text-base"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Description</label>
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={3}
                                        className="text-base resize-none"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        Suggested Keywords
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {(suggestions.keywords ?? []).map(kw => (
                                            <button
                                                key={kw}
                                                onClick={() => toggleKeyword(kw)}
                                                className={cn(
                                                    'rounded-full px-4 py-2 text-sm font-medium border transition-colors min-h-[44px]',
                                                    selectedKeywords.includes(kw)
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-card border-border hover:border-primary/50 text-foreground',
                                                )}
                                            >
                                                {kw}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!suggestLoading && (
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Add Custom Keyword</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={customKeyword}
                                        onChange={e => setCustomKeyword(e.target.value)}
                                        placeholder="Type a keyword..."
                                        className="text-base flex-1"
                                        style={{ fontSize: '16px' }}
                                        onKeyDown={e => e.key === 'Enter' && addCustomKeyword()}
                                    />
                                    <Button variant="outline" onClick={addCustomKeyword} disabled={!customKeyword.trim()} className="min-h-[44px]">
                                        Add
                                    </Button>
                                </div>
                                {selectedKeywords.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {selectedKeywords.map(kw => (
                                            <span key={kw} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm font-medium">
                                                {kw}
                                                <button onClick={() => toggleKeyword(kw)} className="hover:text-destructive">
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Settings */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">How Much Automation?</h1>
                            <p className="mt-2 text-muted-foreground">Choose how much the system does automatically.</p>
                        </div>
                        <AutonomySelector value={autonomyLevel} onChange={setAutonomyLevel} />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={step === 0}
                        className="gap-2 min-h-[44px]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    {step < STEPS.length - 1 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed || suggestLoading}
                            className="gap-2 min-h-[44px]"
                        >
                            Next
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending || !canProceed}
                            className="gap-2 min-h-[44px]"
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {autonomyLevel === 'auto' ? 'Start Research' : 'Create Project'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
