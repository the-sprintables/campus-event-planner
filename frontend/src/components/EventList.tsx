import React, { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { Event } from "../types";

type Props = {
  events: Event[];
  onSelect?: (e: Event) => void;
  onDelete?: (id: string) => void;
};

export default function EventList({ events, onSelect, onDelete }: Props) {
  if (!events || events.length === 0)
    return (
      <div className="alert alert-info shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <h3 className="font-bold">No events yet</h3>
          <div className="text-xs">Create your first event to get started!</div>
        </div>
      </div>
    );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function askDelete(id: string) {
    // only allow delete flow when onDelete is provided
    if (!onDelete) return;
    setPendingId(id);
    setConfirmOpen(true);
  }

  function cancelDelete() {
    setPendingId(null);
    setConfirmOpen(false);
  }

  function confirmDelete() {
    if (pendingId && onDelete) onDelete(pendingId);
    setPendingId(null);
    setConfirmOpen(false);
  }

  return (
    <>
      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="card bg-base-100 shadow-md hover:shadow-xl transition-shadow border border-base-300"
          >
            <div className="card-body p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="card-title text-lg mb-1 line-clamp-1">
                    {ev.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
                    <div className="flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>{ev.date}</span>
                    </div>
                    {ev.location && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span className="line-clamp-1">{ev.location}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {ev.priority && (
                    <div className="mt-2">
                      <div
                        className={`badge ${
                          ev.priority === "available"
                            ? "badge-success"
                            : ev.priority === "almost-full"
                            ? "badge-warning"
                            : "badge-error"
                        }`}
                      >
                        {ev.priority === "available"
                          ? "Available"
                          : ev.priority === "almost-full"
                          ? "Almost Full"
                          : "Full"}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {onSelect && (
                    <button
                      type="button"
                      onClick={() => onSelect(ev)}
                      className="btn btn-sm btn-outline btn-primary"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => askDelete(ev.id)}
                      className="btn btn-sm btn-error"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete event"
        message="This action cannot be undone. Delete this event?"
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </>
  );
}
