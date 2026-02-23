'use client';

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileJson, ClipboardPaste, AlertCircle, CheckCircle2, Loader2, X, Info, Copy } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { eventKeys } from '@/hooks/useEvents';
import { ScheduleImportItem } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ImportScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
}

type ImportStep = 'input' | 'preview' | 'result';

interface ImportResult {
    total_imported: number;
    total_errors: number;
    errors: Array<{ index: number; title?: string; error: string }>;
}

const CATEGORY_EMOJIS: Record<string, string> = {
    work: '💼',
    personal: '👤',
    health: '❤️',
    learning: '📚',
    finance: '💰',
    social: '👥',
};

const PRIORITY_COLORS: Record<string, string> = {
    high: 'bg-red-500/15 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/15 text-green-400 border-green-500/30',
};

const SAMPLE_JSON = `{
  "schedule": [
    {
      "title": "Data Structures - Arrays",
      "description": "Study arrays and linked lists",
      "startDate": "2026-02-24T09:00:00",
      "endDate": "2026-02-24T11:00:00",
      "category": "learning",
      "priority": "high",
      "subtasks": [
        { "title": "Read chapter 3" },
        { "title": "Solve 5 problems" }
      ]
    },
    {
      "title": "Morning Run",
      "startDate": "2026-02-24T06:00:00",
      "endDate": "2026-02-24T07:00:00",
      "category": "health",
      "priority": "medium"
    }
  ]
}`;

export function ImportScheduleModal({
    isOpen,
    onClose,
    onImportSuccess,
}: ImportScheduleModalProps) {
    const [step, setStep] = useState<ImportStep>('input');
    const [jsonText, setJsonText] = useState('');
    const [parsedEvents, setParsedEvents] = useState<ScheduleImportItem[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const resetState = useCallback(() => {
        setStep('input');
        setJsonText('');
        setParsedEvents([]);
        setParseError(null);
        setIsImporting(false);
        setImportResult(null);
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const parseJson = useCallback((text: string): ScheduleImportItem[] | null => {
        try {
            const data = JSON.parse(text);

            // Accept both { schedule: [...] } and plain [...]
            const items = Array.isArray(data) ? data : data?.schedule;

            if (!Array.isArray(items) || items.length === 0) {
                setParseError('JSON must contain a "schedule" array with at least one event, or be a direct array of events.');
                return null;
            }

            // Validate required fields
            const errors: string[] = [];
            items.forEach((item: Record<string, unknown>, idx: number) => {
                if (!item.title) errors.push(`Event ${idx + 1}: missing "title"`);
                if (!item.startDate) errors.push(`Event ${idx + 1}: missing "startDate"`);
                if (!item.endDate) errors.push(`Event ${idx + 1}: missing "endDate"`);
            });

            if (errors.length > 0) {
                setParseError(`Validation errors:\n${errors.join('\n')}`);
                return null;
            }

            setParseError(null);
            return items as ScheduleImportItem[];
        } catch (e) {
            setParseError(`Invalid JSON: ${(e as Error).message}`);
            return null;
        }
    }, []);

    const handlePreview = () => {
        const events = parseJson(jsonText);
        if (events) {
            setParsedEvents(events);
            setStep('preview');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            setParseError('Please upload a .json file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setJsonText(text);
            const events = parseJson(text);
            if (events) {
                setParsedEvents(events);
                setStep('preview');
            }
        };
        reader.onerror = () => {
            console.error('FileReader error:', reader.error);
            setParseError('Failed to read file. Please try again.');
        };
        reader.readAsText(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const payload = {
                schedule: parsedEvents.map(event => ({
                    title: event.title,
                    description: event.description,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    category: event.category || 'work',
                    priority: event.priority || 'medium',
                    isRecurring: event.isRecurring || false,
                    subtasks: event.subtasks || [],
                    timingMode: event.timingMode || 'specific',
                    dailyStartTime: event.dailyStartTime,
                    dailyEndTime: event.dailyEndTime,
                })),
            };

            const result = await apiClient.importSchedule(payload);
            setImportResult({
                total_imported: result.total_imported,
                total_errors: result.total_errors,
                errors: result.errors,
            });
            setStep('result');

            if (result.total_imported > 0) {
                toast.success(`Successfully imported ${result.total_imported} event${result.total_imported > 1 ? 's' : ''}! 🎉`);
                queryClient.invalidateQueries({ queryKey: eventKeys.all });
                onImportSuccess();
            }
            if (result.total_errors > 0) {
                toast.error(`${result.total_errors} event${result.total_errors > 1 ? 's' : ''} failed to import`);
            }
        } catch (error) {
            toast.error(`Import failed: ${(error as Error).message}`);
        } finally {
            setIsImporting(false);
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setJsonText(text);
        } catch (error) {
            console.error('Clipboard access failed:', error);
            toast.error('Could not read clipboard. Please paste manually.');
        }
    };

    const handleCopySample = async () => {
        try {
            await navigator.clipboard.writeText(SAMPLE_JSON);
            toast.success('Sample JSON copied to clipboard!');
        } catch {
            toast.error('Failed to copy to clipboard.');
        }
    };

    const removeEvent = (index: number) => {
        setParsedEvents(prev => prev.filter((_, i) => i !== index));
    };

    const formatDateTime = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'MMM dd, hh:mm a');
        } catch {
            return dateStr;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileJson className="h-5 w-5 text-primary" />
                        {step === 'input' && 'Import Schedule from JSON'}
                        {step === 'preview' && `Preview (${parsedEvents.length} events)`}
                        {step === 'result' && 'Import Results'}
                    </DialogTitle>
                </DialogHeader>

                {/* Step 1: Input */}
                {step === 'input' && (
                    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                        {/* Info banner */}
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">
                                Generate a schedule using any AI tool (ChatGPT, Gemini, etc.) in JSON format, then paste it here or upload a <code className="text-primary">.json</code> file.
                            </p>
                        </div>

                        {/* Upload & Paste buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col gap-1 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-5 w-5 text-muted-foreground" />
                                <span className="text-xs">Upload .json file</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col gap-1 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all"
                                onClick={handlePasteFromClipboard}
                            >
                                <ClipboardPaste className="h-5 w-5 text-muted-foreground" />
                                <span className="text-xs">Paste from clipboard</span>
                            </Button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        {/* JSON text area */}
                        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                            <div className="flex items-center justify-between">
                                <Label>JSON Content</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-muted-foreground hover:text-primary"
                                    onClick={handleCopySample}
                                >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy sample format
                                </Button>
                            </div>
                            <Textarea
                                placeholder='{"schedule": [{"title": "...", "startDate": "...", "endDate": "..."}]}'
                                value={jsonText}
                                onChange={(e) => {
                                    setJsonText(e.target.value);
                                    setParseError(null);
                                }}
                                className="flex-1 min-h-[150px] font-mono text-xs resize-none"
                            />
                        </div>

                        {/* Error display */}
                        {parseError && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                <pre className="text-xs text-destructive whitespace-pre-wrap">{parseError}</pre>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose}>Cancel</Button>
                            <Button onClick={handlePreview} disabled={!jsonText.trim()}>
                                Preview Events
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 2: Preview */}
                {step === 'preview' && (
                    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                        <ScrollArea className="flex-1 max-h-[400px]">
                            <div className="space-y-2 pr-3">
                                {parsedEvents.map((event, idx) => (
                                    <div
                                        key={idx}
                                        className="group relative flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm truncate">{event.title}</span>
                                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[event.priority || 'medium']}`}>
                                                    {event.priority || 'medium'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                <span>{CATEGORY_EMOJIS[event.category || 'work']} {event.category || 'work'}</span>
                                                <span>•</span>
                                                <span>{formatDateTime(event.startDate)} → {formatDateTime(event.endDate)}</span>
                                            </div>
                                            {event.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</p>
                                            )}
                                            {event.subtasks && event.subtasks.length > 0 && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    📋 {event.subtasks.length} subtask{event.subtasks.length > 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                            onClick={() => removeEvent(idx)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        {parsedEvents.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                All events removed. Go back to add more.
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep('input')}>Back</Button>
                            <Button
                                onClick={handleImport}
                                disabled={parsedEvents.length === 0 || isImporting}
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>Import {parsedEvents.length} Event{parsedEvents.length > 1 ? 's' : ''}</>
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 3: Results */}
                {step === 'result' && importResult && (
                    <div className="flex flex-col gap-4 flex-1">
                        {/* Success summary */}
                        {importResult.total_imported > 0 && (
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                <CheckCircle2 className="h-6 w-6 text-green-400" />
                                <div>
                                    <p className="font-medium text-sm">
                                        {importResult.total_imported} event{importResult.total_imported > 1 ? 's' : ''} imported successfully!
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Events are now visible on your calendar.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Errors */}
                        {importResult.total_errors > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-destructive">
                                    {importResult.total_errors} event{importResult.total_errors > 1 ? 's' : ''} failed:
                                </p>
                                <ScrollArea className="max-h-[200px]">
                                    <div className="space-y-1.5">
                                        {importResult.errors.map((err, idx) => (
                                            <div key={idx} className="flex items-start gap-2 p-2 rounded bg-destructive/5 border border-destructive/10">
                                                <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                                                <div className="text-xs">
                                                    <span className="font-medium">{err.title || `Event ${err.index + 1}`}:</span>{' '}
                                                    <span className="text-muted-foreground">{err.error}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose}>Close</Button>
                            <Button onClick={resetState}>Import More</Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
