import React, { useEffect, useRef, useState } from "react";
import { Event } from "../types";
import { FaChevronDown } from "react-icons/fa";

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

  // Select multiple event types
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({});
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
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
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  const selectedTypesList = Object.keys(selectedTypes).filter(type => selectedTypes[type]);
  const displayText = selectedTypesList.length > 0 
    ? `${selectedTypesList.length} type${selectedTypesList.length > 1 ? 's' : ''} selected`
    : "Select Event Types";

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
    <form className="event-form ps-4 py-4" onSubmit={submit}>
      <h2 className="text-2xl font-bold text-center text-primary">Create an Event</h2>
      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Event Title"
        />
      </label>
      
      <label>
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>
      <label>
        Location
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location"/>
      </label>
      <label>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label>
        Price (EUR)
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          placeholder="Ticket Price"
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      <label>
        Event Image
        <div className="file-input-container">
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
          />
          {imageError && <div className="error">{imageError}</div>}
        </div>
      </label>
      {imageData && (
        <div style={{ marginBottom: "1rem" }}>
          <img
            src={imageData}
            alt="Event preview"
            style={{
              maxWidth: "100%",
              height: "200px",
              objectFit: "cover",
              borderRadius: "8px",
            }}
          />
          <button
            type="button"
            className="btn ghost"
            onClick={() => setImageData("")}
            style={{ marginTop: "0.5rem" }}
          >
            Remove image
          </button>
        </div>
      )}

      {/* Event types - Dropdown with checkboxes */}
      <label>
        Event Types (Select multiple)
        <div className="flex flex-col gap-2 w-64 relative border-2 rounded-md mb-2" style={{ marginTop: '8px' }}>
          <div
            className="input input-bordered w-full flex justify-between items-center cursor-pointer bg-white"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span>{displayText}</span>
            <FaChevronDown className="ml-2 text-gray-500" />
          </div>

          {dropdownOpen && (
            <ul className="absolute top-full left-0 z-50 w-full shadow-md rounded-md mt-1 border border-gray-300 bg-white max-h-64 overflow-y-auto">
              {eventTypes.map((type) => (
                <li key={type}>
                  <label
                    className="w-full text-left px-4 py-2 hover:bg-primary hover:text-white rounded-md flex items-center gap-2 cursor-pointer"
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes[type] || false}
                      onChange={() => handleToggleType(type)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{type}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </label>

      {/* Tickets Input Field */}
      <label>
        Number of Tickets
        <input
          type="number"
          min="0"
          value={selectedTickets}
          onChange={(e) => setSelectedTickets(e.target.value)}
          placeholder="Enter number of tickets"
        />
      </label>

      <label>
        Background Color (used if no image uploaded)
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </label>
      <label>
        Priority Status
        <select
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as "available" | "almost-full" | "full")
          }
        >
          <option value="available">Available</option>
          <option value="almost-full">Almost Full</option>
          <option value="full">Full</option>
        </select>
      </label>
      <div className="form-actions">
        <button type="submit" className="border-2 rounded-md p-3 bg-primary text-white hover:bg-secondary">
          {editingEvent ? "Save changes" : "Add event"}
        </button>
        {editingEvent && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => onUpdate?.(editingEvent)}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
