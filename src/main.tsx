import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/vt323/400.css";
import App from "./App";
import "./styles.css";
import "./ui-board-first-overrides.css";

const EffectsLab = lazy(() => import("./effects-lab/EffectsLab"));
const SocialDemo = lazy(() => import("./social-demo/SocialDemo"));
const params = new URLSearchParams(window.location.search);
const showEffectsLab = params.has("effects-lab");
const showSocialDemo = params.has("social-demo");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {showEffectsLab ? (
      <Suspense fallback={<div className="effects-lab-loading">LOADING EFFECT LAB...</div>}>
        <EffectsLab />
      </Suspense>
    ) : showSocialDemo ? (
      <Suspense fallback={<div className="effects-lab-loading">LOADING SOCIAL DEMO...</div>}>
        <SocialDemo />
      </Suspense>
    ) : <App />}
  </StrictMode>
);
