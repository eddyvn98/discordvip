import { useState, useCallback, useEffect } from "react";

export function useCinemaFeedback() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearFeedback = useCallback(() => {
    setMessage("");
    setError("");
  }, []);

  // Auto-clear feedback after 5 seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        clearFeedback();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error, clearFeedback]);

  return {
    message,
    setMessage,
    error,
    setError,
    clearFeedback,
  };
}
