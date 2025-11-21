import React, { useState } from "react";
import EventDetails from "../components/EventDetails";
import { Event } from "../types";

function getPriorityLabel(priority: string = "available") {
  switch (priority) {
    case "full":
      return "Full";
    case "almost-full":
      return "Almost Full";
    default:
      return "Available";
  }
}

export default function EventsPage({ events }: { events: Event[] }) {
  const [selected, setSelected] = useState<Event | null>(null);

  // Handle null or undefined events
  if (!events || !Array.isArray(events)) {
    return <div className="events-page">No events available.</div>;
  }

  // Load ticket counts from localStorage
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>(
    () => {
      const saved = localStorage.getItem("ticketCounts");
      if (saved) return JSON.parse(saved);

      const initial = events.reduce((acc, ev) => {
        acc[ev.id] =
          typeof ev.ticketsAvailable === "number" ? ev.ticketsAvailable : 20;
        return acc;
      }, {} as Record<string, number>);

      localStorage.setItem("ticketCounts", JSON.stringify(initial));
      return initial;
    }
  );

  // Load booked status from localStorage
  const [booked, setBooked] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("bookedEvents");
    return saved ? JSON.parse(saved) : {};
  });

  // Handle booking
  function handleBook(ev: Event) {
    const current = ticketCounts[ev.id] ?? 0;

    if (booked[ev.id] || current <= 0) return;

    const newTicketCounts = {
      ...ticketCounts,
      [ev.id]: current - 1,
    };
    setTicketCounts(newTicketCounts);
    localStorage.setItem("ticketCounts", JSON.stringify(newTicketCounts));

    const updatedBooked = {
      ...booked,
      [ev.id]: true,
    };
    setBooked(updatedBooked);
    localStorage.setItem("bookedEvents", JSON.stringify(updatedBooked));
  }

  return (
    <div className="events-page mb-20">
      <section className="left px-8 my-8">
        <div className="view-grid">
          {events.length === 0 ? (
            <div className="empty">No events planned yet.</div>
          ) : (
            events.map((ev) => (
              <div className=" rounded-lg shadow-xl shadow-gray-500 overflow-hidden">
                <div key={ev.id} className="event-card card">
                <div
                  className="media"
                  style={
                    ev.imageData && ev.imageData.trim() !== ""
                      ? {
                          backgroundImage: `url(${ev.imageData})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }
                      : {
                          background:
                            ev.color && ev.color.trim() !== ""
                              ? `linear-gradient(120deg, ${ev.color}, #ffffff)`
                              : "linear-gradient(120deg, #fef3c7, #ffffff)",
                        }
                  }
                />
                <div className="badge">{getPriorityLabel(ev.priority)}</div>
                <div className="title">{ev.title}</div>
                <div className="meta">
                  {ev.date}
                  {ev.location ? ` • ${ev.location}` : ""}
                </div>
                <div className="price">
                  {ev.price !== undefined ? `From €${ev.price.toFixed(2)}` : ""}
                </div>
                <p>
                  Available Tickets:{" "}
                  <span className="font-bold text-secondary">
                    {ticketCounts[ev.id] ?? 0}
                  </span>
                </p>
                <div style={{ marginTop: 10 }} className="flex justify-between">
                  <button className="btn ghost" onClick={() => setSelected(ev)}>
                    View
                  </button>
                  <button
                    className={`border-2 rounded-md px-3 text-white ${
                      booked[ev.id]
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-secondary hover:bg-primary"
                    }`}
                    disabled={!!booked[ev.id]}
                    onClick={() => handleBook(ev)}
                  >
                    {booked[ev.id] ? "Booked" : "Book Now!"}
                  </button>
                </div>
              </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modal popup for selected event */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn ghost"
              style={{ float: "right" }}
              onClick={() => setSelected(null)}
            >
              Close
            </button>
            <EventDetails event={selected} />
          </div>
        </div>
      )}
    </div>
  );
}
