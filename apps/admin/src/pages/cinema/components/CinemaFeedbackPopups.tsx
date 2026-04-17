import { X } from "lucide-react";

interface CinemaFeedbackPopupsProps {
  message: string;
  error: string;
  onClose: () => void;
}

export function CinemaFeedbackPopups({ message, error, onClose }: CinemaFeedbackPopupsProps) {
  if (!message && !error) return null;

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[100] animate-in fade-in slide-in-from-bottom-4">
      {message && (
        <div className="bg-primary text-primary-foreground px-6 py-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 min-w-[300px] border border-primary-foreground/10 backdrop-blur-md">
          <span className="font-medium">{message}</span>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="bg-destructive text-destructive-foreground px-6 py-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 min-w-[300px] border border-destructive-foreground/10 backdrop-blur-md">
          <span className="font-medium">{error}</span>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
