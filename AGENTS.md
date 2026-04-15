# Project Agent Rules

## Non-Negotiable Player UX Rule

- Strictly forbidden: any mini controls, floating controls, dock controls, or external playback controls rendered outside the player surface.
- Required: all playback controls (timeline, play/pause, seek, volume, fullscreen, speed, next/prev) must be inside the player UI only.
- If a control cannot fit on small screens, adapt the in-player layout responsively; do not move controls outside the player.
- Any PR/change that introduces outside-player playback controls must be rejected.

