'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Event } from '@/types';
import { Calendar, CheckCircle2, Clock, ListTodo, XCircle, RefreshCw } from 'lucide-react';
import { format, isSameWeek, parseISO } from 'date-fns';

interface StatisticsViewProps {
    events: Event[];
}

export function StatisticsView({ events = [] }: StatisticsViewProps) {
    // Core calculations
    const totalEvents = events.length;
    const completedEvents = events.filter(e => e.isCompleted || e.resolution === 'completed').length;
    const completionRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

    const now = new Date();
    const eventsThisWeek = events.filter(e => isSameWeek(parseISO(e.startDate), now)).length;

    // Smart Planner metrics
    const missedEvents = events.filter(e => e.resolution === 'missed').length;
    const rescheduledEvents = events.filter(e => e.resolution === 'rescheduled').length;
    const pendingEvents = totalEvents - completedEvents - missedEvents;

    // Get next 5 upcoming uncompleted events
    const upcomingEvents = events
        .filter(e => !e.isCompleted && new Date(e.startDate) >= now)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 5);

    return (
        <div className="flex-1 p-6 overflow-auto bg-background/50">
            <h2 className="text-3xl font-bold mb-6 tracking-tight">Dashboard</h2>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEvents}</div>
                        <p className="text-xs text-muted-foreground">All events</p>
                    </CardContent>
                </Card>

                <Card className="border-green-500/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-500">Completed</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{completedEvents}</div>
                        <p className="text-xs text-muted-foreground">{completionRate}% success</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingEvents}</div>
                        <p className="text-xs text-muted-foreground">To be done</p>
                    </CardContent>
                </Card>

                <Card className="border-red-500/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-500">Missed</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{missedEvents}</div>
                        <p className="text-xs text-muted-foreground">Keep improving!</p>
                    </CardContent>
                </Card>

                <Card className="border-yellow-500/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-500">Rescheduled</CardTitle>
                        <RefreshCw className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-500">{rescheduledEvents}</div>
                        <p className="text-xs text-muted-foreground">Moved forward</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Week</CardTitle>
                        <ListTodo className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{eventsThisWeek}</div>
                        <p className="text-xs text-muted-foreground">Scheduled</p>
                    </CardContent>
                </Card>
            </div>

            {/* Upcoming List */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Upcoming Priorities</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {upcomingEvents.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No upcoming events scheduled.</p>
                        ) : (
                            upcomingEvents.map(event => (
                                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50 hover:bg-card transition-colors">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold">{event.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(parseISO(event.startDate), 'PPP p')}
                                        </span>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs capitalize border ${event.priority === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        event.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                            'bg-green-500/10 text-green-500 border-green-500/20'
                                        }`}>
                                        {event.priority}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
