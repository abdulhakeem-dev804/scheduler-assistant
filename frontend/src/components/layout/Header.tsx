'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Search,
    X,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarView } from '@/types';

interface HeaderProps {
    currentDate: Date;
    currentView: CalendarView;
    onPrevious: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (view: CalendarView) => void;
    onAddEvent: () => void;
    onSearch?: (query: string) => void;
}

export function Header({
    currentDate,
    currentView,
    onPrevious,
    onNext,
    onToday,
    onViewChange,
    onAddEvent,
    onSearch,
}: HeaderProps) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const getTitle = () => {
        switch (currentView) {
            case 'month':
                return format(currentDate, 'MMMM yyyy');
            case 'week':
                return `Week of ${format(currentDate, 'MMM d, yyyy')}`;
            case 'day':
                return format(currentDate, 'EEEE, MMMM d, yyyy');
            case 'agenda':
                return 'Agenda';
            default:
                return format(currentDate, 'MMMM yyyy');
        }
    };

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        onSearch?.(value);
    };

    return (
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6 pl-16 lg:pl-6">
                {/* Left: Navigation */}
                <div className="flex items-center gap-2 lg:gap-4">
                    {/* Navigation controls */}
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={onPrevious} className="h-9 w-9">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onNext} className="h-9 w-9">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onToday}
                            className="hidden sm:inline-flex ml-1"
                        >
                            Today
                        </Button>
                    </div>

                    {/* Title */}
                    <h1 className="text-lg lg:text-xl font-semibold truncate">
                        {getTitle()}
                    </h1>
                </div>

                {/* Center: View Tabs (hidden on mobile) */}
                <Tabs
                    value={currentView}
                    onValueChange={(v) => onViewChange(v as CalendarView)}
                    className="hidden md:block"
                >
                    <TabsList className="bg-muted/50">
                        <TabsTrigger value="month" className="text-xs lg:text-sm">Month</TabsTrigger>
                        <TabsTrigger value="week" className="text-xs lg:text-sm">Week</TabsTrigger>
                        <TabsTrigger value="day" className="text-xs lg:text-sm">Day</TabsTrigger>
                        <TabsTrigger value="agenda" className="text-xs lg:text-sm">Agenda</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className={cn(
                        "flex items-center transition-all duration-200",
                        isSearchOpen ? "w-48 lg:w-64" : "w-9"
                    )}>
                        {isSearchOpen ? (
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search events..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-9 pr-8 h-9"
                                    autoFocus
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-9 w-9"
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchQuery('');
                                        onSearch?.('');
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => setIsSearchOpen(true)}
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Add Event Button */}
                    <Button onClick={onAddEvent} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">New Event</span>
                    </Button>
                </div>
            </div>

            {/* Mobile View Tabs */}
            <div className="md:hidden px-4 pb-3">
                <Tabs
                    value={currentView}
                    onValueChange={(v) => onViewChange(v as CalendarView)}
                    className="w-full"
                >
                    <TabsList className="w-full bg-muted/50">
                        <TabsTrigger value="month" className="flex-1 text-xs">Month</TabsTrigger>
                        <TabsTrigger value="week" className="flex-1 text-xs">Week</TabsTrigger>
                        <TabsTrigger value="day" className="flex-1 text-xs">Day</TabsTrigger>
                        <TabsTrigger value="agenda" className="flex-1 text-xs">Agenda</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </header>
    );
}
