"use client";

import { useEffect, useState } from "react";

const SCRIPT_ID = "youtube-iframe-api-script";

export function useYouTubeIframeApi(): boolean {
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.YT?.Player) {
      setIsReady(true);
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const previousHandler = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousHandler?.();
      setIsReady(true);
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return isReady;
}
