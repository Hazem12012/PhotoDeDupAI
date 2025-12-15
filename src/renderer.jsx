import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import MainApp from "./components/MainApp";

export default function App() {
  return (
    <>
      <MainApp />
    </>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
