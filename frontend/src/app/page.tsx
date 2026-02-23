'use client';

import { useState, useCallback } from 'react';
import { Sidebar, Header } from '@/components/layout';
import { CalendarContainer } from '@/components/calendar';
import { EventModal, ResolutionModal, ImportScheduleModal } from '@/components/events';
import { SessionEndedPopup } from '@/components/events/SessionEndedPopup';
import { StatisticsView } from '@/components/dashboard/StatisticsView';
import { FocusView } from '@/components/focus/FocusView';
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useToggleEventCompletion,
  useCalendar,
  useSocketSync
} from '@/hooks';
import { useSessionNotifications } from '@/hooks/useSessionNotifications';
import { Event, CreateEventInput, CalendarView, Resolution } from '@/types';
import { Toaster, toast } from 'sonner';

export default function Home() {
  // Enable real-time sync across devices
  const { emitEventCreated, emitEventUpdated, emitEventDeleted } = useSocketSync();

  const { data: events = [] } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const toggleCompletion = useToggleEventCompletion();

  const {
    currentDate,
    view,
    setView,
    previous,
    next,
    goToToday,
  } = useCalendar();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Session notification popup for daily-session events
  const { pendingPopups, dismissPopup, markSession } = useSessionNotifications(events);

  const handleViewChange = useCallback((newView: string) => {
    setView(newView as CalendarView);
  }, [setView]);

  const handleAddEvent = useCallback(() => {
    setSelectedEvent(null);
    setDefaultDate(new Date());
    setIsModalOpen(true);
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedEvent(null);
    setDefaultDate(date);
    setIsModalOpen(true);
  }, []);

  const handleEventClick = useCallback((event: Event) => {
    const eventEnd = new Date(event.endDate);
    const now = new Date();

    // If event is past and not completed, open Resolution Modal
    if (eventEnd < now && !event.isCompleted) {
      setSelectedEvent(event);
      setIsResolutionOpen(true);
      return;
    }

    // Otherwise open normal edit modal
    setSelectedEvent(event);
    setDefaultDate(undefined);
    setIsModalOpen(true);
  }, []);

  const handleSaveEvent = useCallback((data: CreateEventInput) => {
    if (selectedEvent) {
      updateEvent.mutate(
        { id: selectedEvent.id, updates: data },
        {
          onSuccess: (updated) => {
            toast.success('Event updated successfully!');
            emitEventUpdated(updated); // Notify other devices
          },
          onError: (err) => {
            toast.error(`Failed to update: ${err.message}`);
          },
        }
      );
    } else {
      createEvent.mutate(data, {
        onSuccess: (created) => {
          toast.success('Event created successfully!');
          emitEventCreated(created); // Notify other devices
        },
        onError: (err) => {
          toast.error(`Failed to create: ${err.message}`);
        },
      });
    }
  }, [selectedEvent, createEvent, updateEvent, emitEventCreated, emitEventUpdated]);

  const handleDeleteEvent = useCallback((id: string) => {
    deleteEvent.mutate(id, {
      onSuccess: () => {
        toast.success('Event deleted');
        emitEventDeleted({ id }); // Notify other devices
      },
      onError: (err) => {
        toast.error(`Failed to delete: ${err.message}`);
      },
    });
  }, [deleteEvent, emitEventDeleted]);

  const handleToggleComplete = useCallback((event: Event) => {
    // Validate: Can only mark as complete if event has started
    const eventStart = new Date(event.startDate);
    const now = new Date();

    if (!event.isCompleted && eventStart > now) {
      toast.error("Cannot mark as complete - event hasn't started yet!");
      return;
    }

    toggleCompletion.mutate(event.id, {
      onSuccess: (updated) => {
        toast.success(event.isCompleted ? 'Event marked incomplete' : 'Event completed! 🎉');
        emitEventUpdated(updated); // Notify other devices
      },
      onError: (err) => {
        toast.error(`Failed to update: ${err.message}`);
      },
    });
  }, [toggleCompletion, emitEventUpdated]);

  const handleResolve = useCallback((eventId: string, resolution: Resolution, newEndDate?: string) => {
    const updates: Record<string, unknown> = { resolution };

    if (resolution === 'completed') {
      updates.isCompleted = true;
    } else if (resolution === 'rescheduled' && newEndDate) {
      updates.endDate = newEndDate;
      // Increment reschedule count would need backend support
    }

    updateEvent.mutate(
      { id: eventId, updates: updates as Parameters<typeof updateEvent.mutate>[0]['updates'] },
      {
        onSuccess: (updated) => {
          const messages: Record<Resolution, string> = {
            pending: 'Event updated',
            completed: 'Task completed! 🎉',
            missed: 'Task marked as missed',
            rescheduled: 'Task rescheduled',
          };
          toast.success(messages[resolution]);
          emitEventUpdated(updated);
        },
        onError: (err) => {
          toast.error(`Failed to update: ${err.message}`);
        },
      }
    );
  }, [updateEvent, emitEventUpdated]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Sidebar */}
      <Sidebar onViewChange={handleViewChange} currentView={view} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <Header
          currentDate={currentDate}
          currentView={view}
          onPrevious={previous}
          onNext={next}
          onToday={goToToday}
          onViewChange={setView}
          onAddEvent={handleAddEvent}
          onImportSchedule={() => setIsImportOpen(true)}
        />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar */}
          <main className="flex-1 overflow-auto">
            {view === 'focus' ? (
              <FocusView events={events} onToggleComplete={handleToggleComplete} />
            ) : view === 'stats' ? (
              <StatisticsView events={events} />
            ) : (
              <CalendarContainer
                view={view}
                currentDate={currentDate}
                events={events}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
                onToggleComplete={handleToggleComplete}
              />
            )}
          </main>

          {/* Right Sidebar - Removed as per user request */}
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEvent}
        defaultDate={defaultDate}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        existingEvents={events}
      />

      {/* Resolution Modal for Past Events */}
      <ResolutionModal
        isOpen={isResolutionOpen}
        onClose={() => setIsResolutionOpen(false)}
        event={selectedEvent}
        onResolve={handleResolve}
        onDelete={handleDeleteEvent}
      />

      <Toaster richColors position="bottom-right" />

      {/* Import Schedule Modal */}
      <ImportScheduleModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={() => {
          // Events will auto-refresh via React Query invalidation
        }}
      />

      {/* Session Ended Popup */}
      {pendingPopups.length > 0 && (
        <SessionEndedPopup
          event={pendingPopups[0].event}
          sessionDate={pendingPopups[0].sessionDate}
          onMarkAttended={async () => {
            await markSession(pendingPopups[0].event.id, pendingPopups[0].sessionDate, 'attended');
            toast.success('Session marked as attended! 🎉');
          }}
          onMarkMissed={async () => {
            await markSession(pendingPopups[0].event.id, pendingPopups[0].sessionDate, 'missed');
            toast.info('Session marked as missed');
          }}
          onSkip={() => {
            dismissPopup(pendingPopups[0].event.id, pendingPopups[0].sessionDate);
          }}
          onDismiss={() => {
            dismissPopup(pendingPopups[0].event.id, pendingPopups[0].sessionDate);
          }}
        />
      )}
    </div>
  );
}

