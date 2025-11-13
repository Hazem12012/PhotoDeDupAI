import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Test_cloud from "./components/Test_cloud";
export default function App() {
  return (
    <>
      <Test_cloud />
    </>
  );
}
const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
