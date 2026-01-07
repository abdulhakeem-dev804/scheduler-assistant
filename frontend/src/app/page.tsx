'use client';

import { useState, useCallback } from 'react';
import { Sidebar, Header } from '@/components/layout';
import { CalendarContainer } from '@/components/calendar';
import { EventModal } from '@/components/events';
import { PomodoroWidget } from '@/components/pomodoro';
import { UpcomingEvents } from '@/components/widgets';
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useToggleEventCompletion,
  useCalendar,
  useSocketSync
} from '@/hooks';
import { Event, CreateEventInput, CalendarView } from '@/types';
import { Toaster, toast } from 'sonner';

export default function Home() {
  // Enable real-time sync across devices
  const { emitEventCreated, emitEventUpdated, emitEventDeleted } = useSocketSync();

  const { data: events = [], isLoading, error } = useEvents();
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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

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
        />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar */}
          <main className="flex-1 overflow-auto">
            <CalendarContainer
              view={view}
              currentDate={currentDate}
              events={events}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              onToggleComplete={handleToggleComplete}
            />
          </main>

          {/* Right Sidebar - Widgets (Hidden on mobile) */}
          <aside className="hidden xl:block w-80 p-4 space-y-4 overflow-y-auto border-l border-border/50 bg-card/30">
            <PomodoroWidget />
            <UpcomingEvents events={events} onEventClick={handleEventClick} />
          </aside>
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
      />

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
