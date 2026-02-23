import { useState, useCallback } from "react";
import { captureScreenshot, createThumbnail } from "../lib/screenshot";
import { captureError } from "../lib/sentry";

export function useScreenshot() {
  const [capturing, setCapturing] = useState(false);

  const capture = useCallback(async (): Promise<string | null> => {
    setCapturing(true);
    try {
      const full = await captureScreenshot();
      const thumbnail = await createThumbnail(full);
      return thumbnail;
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      captureError(err);
      return null;
    } finally {
      setCapturing(false);
    }
  }, []);

  return { capture, capturing };
}
