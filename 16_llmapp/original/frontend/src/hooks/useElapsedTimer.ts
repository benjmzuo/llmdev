import { useEffect, useRef, useState } from "react";

export function useElapsedTimer(isRunning: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (isRunning) {
      startRef.current = performance.now();
      setElapsed(0);

      function tick() {
        setElapsed((performance.now() - startRef.current) / 1000);
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);

      return () => cancelAnimationFrame(rafRef.current);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
  }, [isRunning]);

  return elapsed;
}
