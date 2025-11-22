import React, { useEffect, useRef, useState } from "react";
import { Event } from "../types";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

async function handleImageUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 5000000) {
      // 5MB limit
      reject(new Error("File size must be less than 5MB"));
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("File must be an image"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

export default function EventForm({
  onCreate,
  onUpdate,
  editingEvent,
}: {
  onCreate?: (e: Event) => void;
  onUpdate?: (e: Event) => void;
  editingEvent?: Event | null;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageError, setImageError] = useState("");
  const [color, setColor] = useState("#fef3c7");
  const [priority, setPriority] = useState<
    "available" | "almost-full" | "full"
  >("available");

  // Select multiple event types (max 2)
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({});
  const eventTypes = [
    "Sports & Fitness",
    "Music & Entertainment",
    "Parties & Social",
    "Business & Professional",
    "Education & Learning",
    "Arts & Culture",
    "Community & Charity",
    "Food & Drink",
    "Travel & Outdoors",
    "Health & Wellness",
  ];
  const handleToggleType = (type: string) => {
    setSelectedTypes(prev => {
      const isCurrentlySelected = prev[type] || false;
      const currentlySelectedCount = Object.keys(prev).filter(t => prev[t]).length;
      
      // If unchecking, allow it
      if (isCurrentlySelected) {
        return {
          ...prev,
          [type]: false
        };
      }
      
      // If checking and already at max (2), don't allow
      if (currentlySelectedCount >= 2) {
        return prev;
      }
      
      // Otherwise, allow checking
      return {
        ...prev,
        [type]: true
      };
    });
  };
  
  const selectedTypesList = Object.keys(selectedTypes).filter(type => selectedTypes[type]);
  const maxReached = selectedTypesList.length >= 2;

  // Tickets input field
  const [selectedTickets, setSelectedTickets] = useState<string>("");

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title || "");
      setDate(editingEvent.date || "");
      setLocation(editingEvent.location || "");
      setDescription(editingEvent.description || "");
      setPrice(
        editingEvent.price !== undefined ? String(editingEvent.price) : ""
      );
      setImageData(editingEvent.imageData || "");
      setColor(editingEvent.color || "#fef3c7");
      setPriority(editingEvent.priority || "available");
      // Handle both string (old) and array (new) formats
      if (editingEvent.eventType) {
        if (Array.isArray(editingEvent.eventType)) {
          const typesObj: Record<string, boolean> = {};
          editingEvent.eventType.forEach(type => { typesObj[type] = true; });
          setSelectedTypes(typesObj);
        } else {
          // Handle comma-separated string from backend
          const types = editingEvent.eventType.split(',').map(t => t.trim()).filter(Boolean);
          const typesObj: Record<string, boolean> = {};
          types.forEach(type => { typesObj[type] = true; });
          setSelectedTypes(typesObj);
        }
      } else {
        setSelectedTypes({});
      }
      setSelectedTickets(editingEvent.ticketsAvailable ? String(editingEvent.ticketsAvailable) : "");
    } else {
      setTitle("");
      setDate("");
      setLocation("");
      setDescription("");
      setPrice("");
      setImageData("");
      setColor("#fef3c7");
      setPriority("available");
      setSelectedTypes({});
      setSelectedTickets("");
    }
  }, [editingEvent]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const d = date.trim();
    if (!t || !d) return;
    const newEvent: Event = {
      id: editingEvent?.id || uid(),
      title: t,
      date: d,
      location: location.trim() || "", // Use empty string instead of undefined for backend
      description: description.trim() || "", // Use empty string instead of undefined for backend
      price: price ? Number(price) : undefined,
      ownerEmail: editingEvent?.ownerEmail,
      imageData: imageData || undefined,
      color: color || undefined,
      priority,
      eventType: Object.keys(selectedTypes).filter(type => selectedTypes[type]), // Convert to array
      ticketsAvailable: selectedTickets ? Number(selectedTickets) : (editingEvent?.ticketsAvailable ?? 100),
    };
    if (editingEvent && onUpdate) {
      onUpdate(newEvent);
    } else if (!editingEvent && onCreate) {
      onCreate(newEvent);
    }
    // reset handled by effect when editingEvent becomes null
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Title</span>
          <span className="label-text-alt text-error">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Event Title"
          className="input input-bordered w-full bg-gray-50"
        />
      </div>
      
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Date</span>
          <span className="label-text-alt text-error">*</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="input input-bordered w-full bg-gray-50"
        />
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Location</span>
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Event Location"
          className="input input-bordered w-full bg-gray-50"
        />
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Description</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Event Description"
          className="textarea textarea-bordered h-24 bg-gray-50"
        />
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Price (EUR)</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          placeholder="0.00"
          onChange={(e) => setPrice(e.target.value)}
          className="input input-bordered w-full bg-gray-50"
        />
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Event Image</span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            setImageError("");
            const file = e.target.files?.[0];
            if (!file) return;

            try {
              const data = await handleImageUpload(file);
              setImageData(data);
            } catch (err) {
              setImageError(
                err instanceof Error ? err.message : "Failed to upload image"
              );
            }
          }}
          className="file-input file-input-bordered w-full bg-gray-50"
        />
        {imageError && (
          <label className="label">
            <span className="label-text-alt text-error">{imageError}</span>
          </label>
        )}
      </div>

      {imageData && (
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <img
              src={imageData}
              alt="Event preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              className="btn btn-sm btn-ghost btn-error mt-2"
              onClick={() => setImageData("")}
            >
              Remove Image
            </button>
          </div>
        </div>
      )}

      {/* Event types - Checkbox grid (max 2 selections) */}
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Event Types</span>
          <span className="label-text-alt">Select up to 2</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {eventTypes.map((type) => {
            const isSelected = selectedTypes[type] || false;
            const isDisabled = !isSelected && maxReached;
            
            return (
              <label
                key={type}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-base-300 bg-gray-50 hover:border-primary/50"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleType(type)}
                  disabled={isDisabled}
                  className="checkbox checkbox-primary checkbox-sm"
                />
                <span className={`text-sm ${isSelected ? "font-semibold text-primary" : ""}`}>
                  {type}
                </span>
              </label>
            );
          })}
        </div>
        {maxReached && (
          <label className="label">
            <span className="label-text-alt text-warning">
              Maximum of 2 event types selected
            </span>
          </label>
        )}
      </div>

      {/* Tickets Input Field */}
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Number of Tickets</span>
        </label>
        <input
          type="number"
          min="0"
          value={selectedTickets}
          onChange={(e) => setSelectedTickets(e.target.value)}
          placeholder="Enter number of tickets"
          className="input input-bordered w-full bg-gray-50"
        />
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Background Color</span>
          <span className="label-text-alt">Used if no image uploaded</span>
        </label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="input input-bordered w-full h-12 bg-gray-50"
        />
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-semibold">Priority Status</span>
        </label>
        <select
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as "available" | "almost-full" | "full")
          }
          className="select select-bordered w-full bg-gray-50"
        >
          <option value="available">Available</option>
          <option value="almost-full">Almost Full</option>
          <option value="full">Full</option>
        </select>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        {editingEvent && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onUpdate?.(editingEvent)}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {editingEvent ? "Save Changes" : "Create Event"}
        </button>
      </div>
    </form>
  );
}
