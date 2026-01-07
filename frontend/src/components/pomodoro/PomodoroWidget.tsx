'use client';

import { usePomodoro } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, SkipForward, Coffee, Brain, Battery } from 'lucide-react';
import { PomodoroMode } from '@/types';

const modeConfig: Record<PomodoroMode, { label: string; icon: React.ReactNode; color: string }> = {
    work: { label: 'Focus', icon: <Brain className="h-4 w-4" />, color: 'text-primary' },
    shortBreak: { label: 'Short Break', icon: <Coffee className="h-4 w-4" />, color: 'text-green-500' },
    longBreak: { label: 'Long Break', icon: <Battery className="h-4 w-4" />, color: 'text-blue-500' },
};

export function PomodoroWidget() {
    const {
        mode,
        isRunning,
        formattedTime,
        progress,
        sessionsCompleted,
        start,
        pause,
        reset,
        skip,
        setMode,
    } = usePomodoro();

    const currentMode = modeConfig[mode];
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    🍅 Pomodoro
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Mode tabs */}
                <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                    {(Object.keys(modeConfig) as PomodoroMode[]).map((m) => (
                        <Button
                            key={m}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "flex-1 text-xs gap-1",
                                mode === m && "bg-background shadow-sm"
                            )}
                            onClick={() => setMode(m)}
                        >
                            {modeConfig[m].icon}
                            <span className="hidden sm:inline">{modeConfig[m].label}</span>
                        </Button>
                    ))}
                </div>

                {/* Timer circle */}
                <div className="relative flex items-center justify-center py-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-muted/30"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeLinecap="round"
                            className={cn("transition-all duration-1000", currentMode.color)}
                            style={{
                                strokeDasharray: circumference,
                                strokeDashoffset: strokeDashoffset,
                            }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold font-mono">{formattedTime}</span>
                        <span className={cn("text-xs", currentMode.color)}>{currentMode.label}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={reset}
                        className="h-9 w-9"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>

                    <Button
                        size="lg"
                        onClick={isRunning ? pause : start}
                        className="h-12 w-12 rounded-full"
                    >
                        {isRunning ? (
                            <Pause className="h-5 w-5" />
                        ) : (
                            <Play className="h-5 w-5 ml-0.5" />
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={skip}
                        className="h-9 w-9"
                    >
                        <SkipForward className="h-4 w-4" />
                    </Button>
                </div>

                {/* Session count */}
                <div className="text-center text-sm text-muted-foreground">
                    Sessions completed: <span className="font-medium text-foreground">{sessionsCompleted}</span>
                </div>
            </CardContent>
        </Card>
    );
}
