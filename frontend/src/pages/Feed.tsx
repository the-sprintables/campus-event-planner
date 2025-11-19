import React, { useEffect, useRef } from "react";
import { FaPlusCircle } from "react-icons/fa";


const Feed = () => {
  const modalRef = useRef<HTMLDialogElement | null>(null);

  //   const openModal = () => {
  //     modalRef.current?.showModal();
  //   };

  useEffect(() => {
    modalRef.current?.showModal();
  }, []);

  return (
    <div>
      <h2>Event Subscription</h2>
      <p>Chose your favorite events type</p>
      <dialog
        ref={modalRef}
        id="my_modal_5"
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="modal-box text-white">
          <h3 className="font-bold text-lg">Hello!</h3>
          <p className="py-4">
            Press ESC key or click the button below to close
          </p>
          <button className="btn">Sports</button>
          <button className="btn ml-2">Technology</button>
          <button type="button" className="btn flex items-center gap-2">
           <FaPlusCircle />
            Sports
          </button>

          <div className="modal-action">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default Feed;
