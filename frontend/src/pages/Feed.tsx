import React, { useEffect, useRef, useState } from "react";
import { FaPlusCircle } from "react-icons/fa";
import { TiTick } from "react-icons/ti";
import { useNavigate } from "react-router-dom";

const eventTypes = [
  "Technology",
  "Sports",
  "Medicine",
  "Fitness",
  "Entertainment",
  "Arts",
  "Education",
  "Travel",
  "Party",
];

const Feed = () => {
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const navigate = useNavigate();

  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({});
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    modalRef.current?.showModal();
  }, []);

  function toggleType(type: string) {
    setSelectedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  }

  const isSubmitDisabled = !Object.values(selectedTypes).some((v) => v);

  function handleSubmit() {
    setShowAlert(true);

    // After 2 seconds, redirect to home
    setTimeout(() => {
      navigate("/");
    }, 2000);
  }

  return (
    <div>
      <dialog
        ref={modalRef}
        id="my_modal_5"
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="mb-32">
          <div className="modal-box text-white glass shadow-2xl">
          <h2 className="text-black font-medium">Event Subscription</h2>
          <p className="text-xl text-primary font-bold">
            Choose your favorite event types
          </p>

          <div className="grid grid-cols-3 gap-6 mt-4">
            {eventTypes.map((type) => (
              <div
                key={type}
                className="flex flex-row items-center w-35 bg-primary rounded-md p-2 justify-around cursor-pointer"
                onClick={() => toggleType(type)}
              >
                <button type="button">{type}</button>
                {selectedTypes[type] ? (
                  <TiTick className="ms-2 text-green-300" size={22} />
                ) : (
                  <FaPlusCircle className="ms-2" size={18} />
                )}
              </div>
            ))}
          </div>

          <div className="modal-action">
            <form
              method="dialog"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <button
                type="button"
                className="btn me-3"
                onClick={() => navigate("/")}
              >
                Close
              </button>
              <button
                type="submit"
                className={`btn ${isSubmitDisabled ? "btn-disabled" : ""}`}
                disabled={isSubmitDisabled}
              >
                Submit
              </button>
            </form>
          </div>

          {/* DaisyUI Alert */}
          {showAlert && (
            <div
              role="alert"
              className="alert alert-success mt-4 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Enjoy Sprintables!</span>
            </div>
          )}
        </div>
        </div>
      </dialog>
    </div>
  );
};

export default Feed;
