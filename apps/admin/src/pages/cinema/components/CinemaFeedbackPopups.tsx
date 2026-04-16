interface CinemaFeedbackPopupsProps {
  message: string;
  error: string;
}

export function CinemaFeedbackPopups({ message, error }: CinemaFeedbackPopupsProps) {
  return (
    <>
      {message && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">
          {message}
        </div>
      )}
      {error && (
        <div className="fixed bottom-6 right-6 bg-destructive text-destructive-foreground px-6 py-3 rounded-lg shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">
          {error}
        </div>
      )}
    </>
  );
}
