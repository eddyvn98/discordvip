import { useState, useCallback } from "react";

export function useCinemaFeedback() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearFeedback = useCallback(() => {
    setMessage("");
    setError("");
  }, []);

  return {
    message,
    setMessage,
    error,
    setError,
    clearFeedback,
  };
}
