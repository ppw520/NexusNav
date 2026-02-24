import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { App } from "./app/App";
import "./styles.css";

function ToastDismissOnClick() {
  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const toastNode = target.closest("[data-sonner-toast]");
      if (!toastNode) {
        return;
      }
      const interactiveNode = target.closest(
        "button, a, input, select, textarea, [data-button], [data-close-button]"
      );
      if (interactiveNode) {
        return;
      }
      toast.dismiss();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastDismissOnClick />
      <Toaster
        richColors
        position="top-right"
        duration={2200}
        closeButton
        toastOptions={{ duration: 2200, closeButton: true, className: "cursor-pointer" }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
