'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Subtask } from '@/types';
import { Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SubtaskListProps {
    subtasks: Subtask[];
    onChange: (subtasks: Subtask[]) => void;
    disabled?: boolean;
}

export function SubtaskList({ subtasks, onChange, disabled = false }: SubtaskListProps) {
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const handleAddSubtask = () => {
        if (!newSubtaskTitle.trim()) return;

        const newSubtask: Subtask = {
            id: uuidv4(),
            title: newSubtaskTitle.trim(),
            completed: false,
        };

        onChange([...subtasks, newSubtask]);
        setNewSubtaskTitle('');
    };

    const handleToggleSubtask = (id: string) => {
        onChange(
            subtasks.map((st) =>
                st.id === id ? { ...st, completed: !st.completed } : st
            )
        );
    };

    const handleRemoveSubtask = (id: string) => {
        onChange(subtasks.filter((st) => st.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSubtask();
        }
    };

    const completedCount = subtasks.filter((st) => st.completed).length;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                    Subtasks {subtasks.length > 0 && `(${completedCount}/${subtasks.length})`}
                </label>
            </div>

            {/* Existing Subtasks */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
                {subtasks.map((subtask) => (
                    <div
                        key={subtask.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group"
                    >
                        <Checkbox
                            checked={subtask.completed}
                            onCheckedChange={() => handleToggleSubtask(subtask.id)}
                            disabled={disabled}
                        />
                        <span
                            className={`flex-1 text-sm ${subtask.completed ? 'line-through text-muted-foreground' : ''
                                }`}
                        >
                            {subtask.title}
                        </span>
                        {!disabled && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveSubtask(subtask.id)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add New Subtask */}
            {!disabled && (
                <div className="flex gap-2">
                    <Input
                        placeholder="Add a subtask..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-9"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskTitle.trim()}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
