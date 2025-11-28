import React, { useState } from "react";
import EventForm from "../components/EventForm";
import EventList from "../components/EventList";
import { Event } from "../types";
import { currentUser, updatePassword } from "../auth";

export default function ManageEventsPage({
  initialEvents,
  onCreate,
  onDelete,
  onUpdate,
}: {
  initialEvents: Event[];
  onCreate: (e: Event) => Promise<{ success: boolean; error?: string }> | void;
  onDelete: (id: string) => void;
  onUpdate?: (e: Event) => Promise<{ success: boolean; error?: string }> | void;
}) {
  const [editing, setEditing] = useState<Event | null>(null);
  const [newPass, setNewPass] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [eventMessage, setEventMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const user = currentUser();

  async function handleCreate(e: Event) {
    e.ownerEmail = user?.email;
    const result = onCreate(e);
    // If onCreate returns a promise, wait for it
    if (result instanceof Promise) {
      const response = await result;
      if (response && response.success) {
        setEventMessage({
          type: "success",
          text: "Event created successfully!",
        });
        setTimeout(() => setEventMessage(null), 3000);
      } else {
        setEventMessage({
          type: "error",
          text: response?.error || "Failed to create event",
        });
        setTimeout(() => setEventMessage(null), 3000);
      }
    } else {
      // If it's synchronous, show success optimistically
      setEventMessage({ type: "success", text: "Event created successfully!" });
      setTimeout(() => setEventMessage(null), 3000);
    }
  }

  async function handleUpdate(e: Event) {
    // preserve owner
    e.ownerEmail = editing?.ownerEmail || user?.email;
    if (onUpdate) {
      const result = onUpdate(e);
      // If onUpdate returns a promise, wait for it
      if (result instanceof Promise) {
        const response = await result;
        if (response && response.success) {
          setEventMessage({
            type: "success",
            text: "Event updated successfully!",
          });
          setTimeout(() => setEventMessage(null), 3000);
        } else {
          setEventMessage({
            type: "error",
            text: response?.error || "Failed to update event",
          });
          setTimeout(() => setEventMessage(null), 3000);
        }
      } else {
        // If it's synchronous, show success optimistically
        setEventMessage({
          type: "success",
          text: "Event updated successfully!",
        });
        setTimeout(() => setEventMessage(null), 3000);
      }
    }
    setEditing(null);
  }

  async function handleChangePassword() {
    if (!user || !newPass) return;
    if (newPass.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Password must be at least 6 characters long",
      });
      setTimeout(() => setPasswordMessage(null), 3000);
      return;
    }
    const res = await updatePassword(user.email, newPass);
    if (res.ok) {
      setNewPass("");
      setPasswordMessage({
        type: "success",
        text: "Password updated successfully",
      });
      setTimeout(() => setPasswordMessage(null), 3000);
    } else {
      setPasswordMessage({
        type: "error",
        text: res.error || "Failed to update password",
      });
      setTimeout(() => setPasswordMessage(null), 3000);
    }
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            Event Management
          </h1>
          <p className="text-lg" style={{ color: 'var(--muted)' }}>
            Effortlessly create, edit, and manage your campus events.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {eventMessage && (
              <div
                className={`alert ${
                  eventMessage.type === "success"
                    ? "alert-success"
                    : "alert-error"
                } shadow-lg`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  {eventMessage.type === "success" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  )}
                </svg>
                <span>{eventMessage.text}</span>
              </div>
            )}

            {/* Event Form Card */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title text-2xl">
                    {editing ? (
                      <>
                        <span className="badge badge-warning mr-2">
                          Editing
                        </span>
                        Edit Event
                      </>
                    ) : (
                      "Create Event"
                    )}
                  </h2>
                  {editing && (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <EventForm
                  onCreate={handleCreate}
                  onUpdate={handleUpdate}
                  editingEvent={editing}
                />
              </div>
            </div>

            {/* Admin Settings Card */}
            {user?.role === "admin" && (
              <div className="card bg-base-100 shadow-xl border-2 border-primary/20">
                <div className="card-body">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="badge badge-primary badge-lg">Admin</div>
                    <h3 className="card-title text-xl">Admin Settings</h3>
                  </div>

                  {passwordMessage && (
                    <div
                      className={`alert ${
                        passwordMessage.type === "success"
                          ? "alert-success"
                          : "alert-error"
                      } mb-4`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="stroke-current shrink-0 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        {passwordMessage.type === "success" ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        )}
                      </svg>
                      <span>{passwordMessage.text}</span>
                    </div>
                  )}

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">
                        New Password
                      </span>
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      className="input input-bordered w-full themed-input"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Minimum 6 characters
                      </span>
                    </label>
                  </div>

                  <div className="card-actions justify-end mt-4">
                    <button
                      className="btn btn-primary"
                      onClick={handleChangePassword}
                      disabled={!newPass}
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Events List */}
          <div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="card-title text-2xl">Your Events</h2>
                    <p className="text-base-content/70 mt-1">
                      {initialEvents.length}{" "}
                      {initialEvents.length === 1 ? "event" : "events"} total
                    </p>
                  </div>
                  {initialEvents.length > 0 && (
                    <div className="badge badge-primary badge-lg">
                      {initialEvents.length}
                    </div>
                  )}
                </div>
                <EventList
                  events={initialEvents}
                  onDelete={onDelete}
                  onSelect={(e) => setEditing(e)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
