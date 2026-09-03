import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/vt323/400.css";
import App from "./App";
import "./styles.css";
import "./ui-board-first-overrides.css";

const EffectsLab = lazy(() => import("./effects-lab/EffectsLab"));
const showEffectsLab = new URLSearchParams(window.location.search).has("effects-lab");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {showEffectsLab ? (
      <Suspense fallback={<div className="effects-lab-loading">LOADING EFFECT LAB...</div>}>
        <EffectsLab />
      </Suspense>
    ) : <App />}
  </StrictMode>
);
