'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Plus, FolderOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useUserProjects } from '@/features/projects';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';
import { useResearchApi } from '../../hooks/useResearchApi';
import { TemplatePicker } from './TemplatePicker';
import { AutonomySelector } from './AutonomySelector';
import type { AutonomyLevel, ResearchTemplate } from '../../types';
import type { ProjectWithRole } from '@/features/projects';

const STEPS = ['Project', 'Topic', 'Template', 'Keywords', 'Settings'] as const;

export default function ResearchInitForm() {
    const router = useRouter();
    const api = useResearchApi();
    const [isPending, startTransition] = useTransition();
    const { projects, loading: projectsLoading, refresh: refreshProjects } = useUserProjects();
    const [createProjectOpen, setCreateProjectOpen] = useState(false);

    const [step, setStep] = useState(0);
    const [selectedProject, setSelectedProject] = useState<ProjectWithRole | null>(null);
    const [topicName, setTopicName] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<ResearchTemplate | null>(null);
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
    const [customKeyword, setCustomKeyword] = useState('');
    const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>('semi');
    const [error, setError] = useState<string | null>(null);

    const handleTemplateSelect = (template: ResearchTemplate | null) => {
        setSelectedTemplate(template);
        if (template?.keyword_templates?.length) {
            setSelectedKeywords(prev => {
                const merged = new Set([...prev, ...template.keyword_templates!]);
                return Array.from(merged);
            });
        }
    };

    const handleNext = () => {
        setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const handleBack = () => setStep(s => Math.max(s - 1, 0));

    const toggleKeyword = (kw: string) => {
        setSelectedKeywords(prev =>
            prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw],
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
        if (!selectedProject || selectedKeywords.length < 1) {
            setError('Missing required fields');
            return;
        }
        setError(null);

        startTransition(async () => {
            try {
                const response = await api.createTopic(selectedProject.id, {
                    name: topicName.trim(),
                    autonomy_level: autonomyLevel,
                    template_id: selectedTemplate?.id ?? null,
                    subject_name: subjectName.trim() || null,
                });
                const topic = await response.json();

                await api.addKeywords(topic.id, { keywords: selectedKeywords });

                if (autonomyLevel === 'auto') {
                    api.runPipeline(topic.id).catch(() => {});
                }

                router.push(`/p/research/topics/${topic.id}`);
            } catch (err) {
                setError((err as Error).message);
            }
        });
    };

    const canProceed = step === 0 ? !!selectedProject
        : step === 1 ? topicName.trim().length > 0
        : step === 2 ? true
        : step === 3 ? selectedKeywords.length >= 1
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
                            <div className={cn('h-px w-6 sm:w-10', i < step ? 'bg-primary/40' : 'bg-border')} />
                        )}
                    </div>
                ))}
            </div>

            <div className="w-full max-w-2xl">
                {/* Step 0: Select Project */}
                {step === 0 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">Select a Project</h1>
                            <p className="mt-2 text-muted-foreground">Research topics belong to a project. Pick one or create a new one.</p>
                        </div>

                        {projectsLoading ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Loading projects...
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {projects.map(project => (
                                    <button
                                        key={project.id}
                                        onClick={() => setSelectedProject(project)}
                                        className={cn(
                                            'w-full flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors min-h-[44px]',
                                            selectedProject?.id === project.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/30',
                                        )}
                                    >
                                        <div className={cn(
                                            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                                            selectedProject?.id === project.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                                        )}>
                                            {selectedProject?.id === project.id ? <Check className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-sm truncate">{project.name}</div>
                                            {project.description && (
                                                <div className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</div>
                                            )}
                                        </div>
                                        {project.isPersonal && (
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">Personal</span>
                                        )}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCreateProjectOpen(true)}
                                    className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 text-left transition-colors hover:border-primary/30 min-h-[44px]"
                                >
                                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">Create New Project</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 1: Topic Details */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">Name Your Research Topic</h1>
                            <p className="mt-2 text-muted-foreground">
                                Project: <span className="font-semibold text-foreground">{selectedProject?.name}</span>
                            </p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium">Topic Name</label>
                            <Input
                                value={topicName}
                                onChange={e => setTopicName(e.target.value)}
                                placeholder="e.g., All Green Brand Profile, ITAD Industry Trends..."
                                className="text-base h-12"
                                style={{ fontSize: '16px' }}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium">Subject Name (optional)</label>
                            <p className="text-xs text-muted-foreground">The entity being researched. Used for AI context and template substitution.</p>
                            <Input
                                value={subjectName}
                                onChange={e => setSubjectName(e.target.value)}
                                placeholder="e.g., All Green Electronics, Cardiac Surgery..."
                                className="text-base"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Template */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">Choose a Template</h1>
                            <p className="mt-2 text-muted-foreground">Templates pre-fill keywords and wire up specialized AI agents. Optional.</p>
                        </div>
                        <TemplatePicker
                            selected={selectedTemplate}
                            onSelect={handleTemplateSelect}
                        />
                    </div>
                )}

                {/* Step 3: Keywords */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold">Add Keywords</h1>
                            <p className="mt-2 text-muted-foreground">Keywords drive the search and analysis pipeline. Add at least one.</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <Input
                                    value={customKeyword}
                                    onChange={e => setCustomKeyword(e.target.value)}
                                    placeholder="Type a keyword and press Enter..."
                                    className="text-base flex-1"
                                    style={{ fontSize: '16px' }}
                                    autoFocus
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
                                            <button onClick={() => toggleKeyword(kw)} className="hover:text-destructive min-w-[28px] min-h-[28px] flex items-center justify-center">
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {selectedKeywords.length === 0 && (
                                <p className="text-xs text-muted-foreground italic pt-1">No keywords yet. Add at least one to continue.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Settings */}
                {step === 4 && (
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
                            disabled={!canProceed}
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
                            {autonomyLevel === 'auto' ? 'Start Research' : 'Create Topic'}
                        </Button>
                    )}
                </div>
            </div>

            <CreateProjectModal
                isOpen={createProjectOpen}
                onClose={() => setCreateProjectOpen(false)}
                onSuccess={() => {
                    refreshProjects();
                    setCreateProjectOpen(false);
                }}
            />
        </div>
    );
}
