import { useEffect, useState } from "react";
import { Landing } from "./landing/Landing";
import { RuleDostApp } from "./app/RuleDostApp";

/** Hash routing: "#app…" and "#sample=…" open the product; anything else is the landing page. */
export function Root() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const isApp = hash.startsWith("#app") || hash.startsWith("#sample=");
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = isApp ? "RuleDost · app" : "RuleDost: hackathon rules, decoded";
  }, [isApp]);
  return isApp ? <RuleDostApp hash={hash} /> : <Landing />;
}
