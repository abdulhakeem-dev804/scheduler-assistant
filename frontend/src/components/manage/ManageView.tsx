'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Upload, Loader2, AlertTriangle, FileJson, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { eventKeys, useEvents } from '@/hooks/useEvents';
import { toast } from 'sonner';
import { ImportScheduleModal } from '@/components/events/ImportScheduleModal';

interface ManageViewProps {
    onImportSuccess?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    work: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    personal: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    health: 'bg-green-500/20 text-green-300 border-green-500/30',
    learning: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    finance: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    social: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

const CATEGORY_EMOJIS: Record<string, string> = {
    work: '💼',
    personal: '👤',
    health: '❤️',
    learning: '📚',
    finance: '💰',
    social: '👥',
};

export function ManageView({ onImportSuccess }: ManageViewProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [deleteResult, setDeleteResult] = useState<{ deleted: number } | null>(null);
    const queryClient = useQueryClient();
    const { data: events = [] } = useEvents();

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await apiClient.bulkDeleteEvents();
            setDeleteResult(result);
            toast.success(`Successfully deleted ${result.deleted} events! 🗑️`);
            queryClient.invalidateQueries({ queryKey: eventKeys.all });
        } catch (error) {
            toast.error(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // Get category breakdown
    const categoryBreakdown = events.reduce((acc: Record<string, number>, event) => {
        const cat = event.category || 'work';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});



    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold">Manage Events</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Import, export, and manage your schedule events
                </p>
            </div>

            {/* Stats Overview */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-primary">{events.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">Total Events</p>
                        </div>
                        <div className="h-12 w-px bg-border/50" />
                        <div className="flex gap-2 flex-wrap">
                            {Object.entries(categoryBreakdown).map(([cat, count]) => (
                                <Badge
                                    key={cat}
                                    variant="outline"
                                    className={`${CATEGORY_COLORS[cat] || ''} gap-1.5 px-2.5 py-1`}
                                >
                                    <span>{CATEGORY_EMOJIS[cat] || '📌'}</span>
                                    <span className="capitalize">{cat}</span>
                                    <span className="font-bold">{count}</span>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Import Card */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors group">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <FileJson className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Import Schedule</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Import events from a JSON file
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Upload a .json file or paste JSON content to bulk import events into your schedule.
                        </p>
                        <Button
                            onClick={() => {
                                setDeleteResult(null);
                                setIsImportOpen(true);
                            }}
                            className="w-full gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            Import from JSON
                        </Button>
                    </CardContent>
                </Card>

                {/* Bulk Delete Card */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-destructive/30 transition-colors group">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                                <Trash2 className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Delete All Events</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Remove all events from your schedule
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Permanently delete all {events.length} events. This action cannot be undone.
                        </p>
                        <Button
                            variant="destructive"
                            className="w-full gap-2"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={events.length === 0}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete All Events ({events.length})
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Result */}
            {deleteResult && (
                <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent className="flex items-center gap-3 py-4">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                        <p className="text-sm">
                            Successfully deleted <strong>{deleteResult.deleted}</strong> events.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete All Events?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{events.length}</strong> events from your schedule.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Yes, Delete All
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Import Modal */}
            <ImportScheduleModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onImportSuccess={() => {
                    onImportSuccess?.();
                }}
            />
        </div>
    );
}


