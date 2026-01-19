  import { useEffect, useRef } from "react";

  /**
   * Basılı tuşları Set içinde tutar.
   * useRef => her frame input değişiyor diye rerender tetiklemeyiz.
   */
  export function useKeyboard() {
    const keys = useRef(new Set());

    useEffect(() => {
      const down = (e) => keys.current.add(e.key.toLowerCase());
      const up = (e) => keys.current.delete(e.key.toLowerCase());

      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);

      return () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
      };
    }, []);

    return keys;
  }
