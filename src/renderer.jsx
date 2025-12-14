import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import DuplicateRemover from "./components/DuplicateRemover";

export default function App() {
  return (
    <>
      <DuplicateRemover />
    </>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
