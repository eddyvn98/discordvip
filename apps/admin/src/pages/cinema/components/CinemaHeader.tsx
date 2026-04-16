export function CinemaHeader() {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Cinema Workspace</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý đồng bộ, quét phim và tạo nội dung preview tự động.
        </p>
      </div>
    </div>
  );
}
