'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Calendar,
    LayoutList,
    BarChart3,
    Settings,
    Sun,
    Moon,
    Menu,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    Heart,
    BookOpen,
    Users,
} from 'lucide-react';

interface SidebarProps {
    onViewChange?: (view: string) => void;
    currentView?: string;
}

const mainNavItems = [
    { icon: Calendar, label: 'Month', view: 'month', href: '/' },
    { icon: Calendar, label: 'Week', view: 'week', href: '/?view=week' },
    { icon: Calendar, label: 'Day', view: 'day', href: '/?view=day' },
    { icon: LayoutList, label: 'Agenda', view: 'agenda', href: '/?view=agenda' },
    { icon: BarChart3, label: 'Statistics', view: 'stats', href: '/stats' },
];

const categoryItems = [
    { icon: Briefcase, label: 'Work', color: 'text-indigo-400' },
    { icon: Heart, label: 'Health', color: 'text-green-400' },
    { icon: BookOpen, label: 'Learning', color: 'text-purple-400' },
    { icon: Users, label: 'Social', color: 'text-cyan-400' },
];

function SidebarContent({
    isCollapsed,
    onToggleCollapse,
    currentView,
    onViewChange,
}: {
    isCollapsed: boolean;
    onToggleCollapse?: () => void;
    currentView?: string;
    onViewChange?: (view: string) => void;
}) {
    const pathname = usePathname();
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className={cn(
                "flex items-center gap-3 px-4 py-5 border-b border-border/50",
                isCollapsed && "justify-center px-2"
            )}>
                <div className="text-2xl">📅</div>
                {!isCollapsed && (
                    <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
                        Scheduler
                    </span>
                )}
                {onToggleCollapse && !isCollapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-8 w-8"
                        onClick={onToggleCollapse}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Main Navigation */}
            <ScrollArea className="flex-1 px-3 py-4">
                <div className="space-y-1">
                    <p className={cn(
                        "px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2",
                        isCollapsed && "sr-only"
                    )}>
                        Views
                    </p>
                    {mainNavItems.map((item) => {
                        const isActive = currentView === item.view ||
                            (pathname === item.href && !currentView);
                        return (
                            <Button
                                key={item.view}
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start gap-3 h-10",
                                    isCollapsed && "justify-center px-0",
                                    isActive && "bg-primary/10 text-primary"
                                )}
                                onClick={() => onViewChange?.(item.view)}
                            >
                                <item.icon className="h-4 w-4 shrink-0" />
                                {!isCollapsed && <span>{item.label}</span>}
                            </Button>
                        );
                    })}
                </div>

                <Separator className="my-4" />

                {/* Categories */}
                <div className="space-y-1">
                    <p className={cn(
                        "px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2",
                        isCollapsed && "sr-only"
                    )}>
                        Categories
                    </p>
                    {categoryItems.map((item) => (
                        <Button
                            key={item.label}
                            variant="ghost"
                            className={cn(
                                "w-full justify-start gap-3 h-10",
                                isCollapsed && "justify-center px-0"
                            )}
                        >
                            <item.icon className={cn("h-4 w-4 shrink-0", item.color)} />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Button>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-border/50 space-y-1">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-3 h-10",
                        isCollapsed && "justify-center px-0"
                    )}
                    onClick={toggleTheme}
                >
                    {theme === 'light' ? (
                        <Moon className="h-4 w-4 shrink-0" />
                    ) : (
                        <Sun className="h-4 w-4 shrink-0" />
                    )}
                    {!isCollapsed && <span>Toggle Theme</span>}
                </Button>
                <Link href="/settings">
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start gap-3 h-10",
                            isCollapsed && "justify-center px-0"
                        )}
                    >
                        <Settings className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>Settings</span>}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

export function Sidebar({ onViewChange, currentView }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className={cn(
                "hidden lg:flex flex-col h-screen sticky top-0 bg-card/80 backdrop-blur-xl border-r border-border/50 transition-all duration-300",
                isCollapsed ? "w-[72px]" : "w-[280px]"
            )}>
                <SidebarContent
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    currentView={currentView}
                    onViewChange={onViewChange}
                />
                {isCollapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-background shadow-md"
                        onClick={() => setIsCollapsed(false)}
                    >
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                )}
            </aside>

            {/* Mobile Sidebar (Sheet) */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                {/* Only show hamburger when sheet is closed */}
                {!isSheetOpen && (
                    <SheetTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="lg:hidden fixed top-3 left-3 z-[60] h-10 w-10 bg-background/80 backdrop-blur-sm border shadow-md"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                )}
                <SheetContent side="left" className="w-[280px] p-0">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <SidebarContent
                        isCollapsed={false}
                        currentView={currentView}
                        onViewChange={(view) => {
                            onViewChange?.(view);
                            setIsSheetOpen(false); // Close sheet when view changes
                        }}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}
