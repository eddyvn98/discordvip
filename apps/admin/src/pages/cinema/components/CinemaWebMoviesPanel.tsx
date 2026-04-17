import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CinemaWebMovie } from "../cinema.types";

interface CinemaWebMoviesPanelProps {
  movies: CinemaWebMovie[];
  renamingMovies: Record<string, boolean>;
  deletingMovies: Record<string, boolean>;
  onRenameMovie: (id: string, currentTitle: string, nextTitle: string) => void;
  onDeleteMovie: (id: string, movieTitle: string) => void;
}

export function CinemaWebMoviesPanel({
  movies,
  renamingMovies,
  deletingMovies,
  onRenameMovie,
  onDeleteMovie,
}: CinemaWebMoviesPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const movie of movies) {
      next[movie.id] = movie.title;
    }
    setDrafts(next);
  }, [movies]);

  const sortedMovies = useMemo(
    () => [...movies].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [movies]
  );

  const cancelEdit = (movieId: string, originalTitle: string) => {
    setDrafts((curr) => ({ ...curr, [movieId]: originalTitle }));
    setEditingMovieId((curr) => (curr === movieId ? null : curr));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Phim dang hien thi tren web</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedMovies.length === 0 && <div className="text-sm text-muted-foreground">Khong co phim dang hien thi.</div>}

        {sortedMovies.length > 0 && (
          <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
            {sortedMovies.map((movie) => {
              const isEditing = editingMovieId === movie.id;
              const isRenaming = !!renamingMovies[movie.id];
              const isDeleting = !!deletingMovies[movie.id];

              return (
                <div key={movie.id} className="rounded-lg border bg-card/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{movie.title}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">{movie.channel.displayName}</span>
                        <span>•</span>
                        <span>{new Date(movie.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isRenaming || isDeleting}
                        onClick={() => {
                          setEditingMovieId(movie.id);
                          setDrafts((curr) => ({ ...curr, [movie.id]: curr[movie.id] ?? movie.title }));
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={isRenaming || isDeleting}
                        onClick={() => onDeleteMovie(movie.id, movie.title)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {movie.remoteStatus}
                    </Badge>
                  </div>

                  {isEditing && (
                    <div className="mt-3 space-y-2">
                      <Input
                        value={drafts[movie.id] ?? movie.title}
                        onChange={(event) =>
                          setDrafts((curr) => ({
                            ...curr,
                            [movie.id]: event.target.value,
                          }))
                        }
                        placeholder="Ten phim"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={isRenaming}
                          onClick={() => cancelEdit(movie.id, movie.title)}
                        >
                          <X size={13} />
                          Huy
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={isRenaming}
                          onClick={() => {
                            onRenameMovie(movie.id, movie.title, drafts[movie.id] ?? movie.title);
                            setEditingMovieId((curr) => (curr === movie.id ? null : curr));
                          }}
                        >
                          <Check size={13} />
                          {isRenaming ? "Dang luu..." : "Luu"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
