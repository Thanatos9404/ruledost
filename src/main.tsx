import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./kit/styles/fonts";
import "./kit/styles/tokens.css";
import "./styles/project.css";
import { Root } from "./Root";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
