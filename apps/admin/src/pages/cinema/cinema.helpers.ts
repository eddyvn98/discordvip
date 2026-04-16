import { CinemaChannel, CinemaScanJob } from "./cinema.types";

/**
 * Lấy job mới nhất cho mỗi channel. 
 * Giữ nguyên logic: job đầu tiên gặp trong mảng (vì array đã được sort từ API).
 */
export const getLatestJobByChannel = (jobs: CinemaScanJob[]): Map<string, CinemaScanJob> => {
  const map = new Map<string, CinemaScanJob>();
  for (const job of jobs) {
    if (!map.has(job.channelId)) map.set(job.channelId, job);
  }
  return map;
};

/**
 * Đếm số lượng job đang chạy.
 */
export const getActiveJobsCount = (jobs: CinemaScanJob[]): number => {
  return jobs.filter((j) => j.status === "RUNNING").length;
};

/**
 * Tính toán tiến độ của một job.
 */
export const getJobProgress = (job: CinemaScanJob) => {
  const total = Math.max(0, job.totalDetected || 0);
  const done = Math.max(0, job.totalInserted + job.totalFailed);
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return { total, done, percent };
};

/**
 * Lấy channel ID mặc định để hiển thị.
 * Ưu tiên FULL_SOURCE, nếu không thì lấy cái đầu tiên.
 */
export const getDefaultSelectedChannelId = (channels: CinemaChannel[]): string | null => {
  if (channels.length === 0) return null;
  return channels.find((c) => c.role === "FULL_SOURCE")?.id || channels[0].id;
};

/**
 * Tính tổng số phim đã phát hiện từ tất cả các job.
 */
export const getTotalDetectedMovies = (jobs: CinemaScanJob[]): number => {
  return jobs.reduce((acc, j) => acc + j.totalDetected, 0);
};
