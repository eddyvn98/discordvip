# Telegram MTProto Streaming Alignment

## Problem
Inconsistent video playback, `502 Bad Gateway`, or `ERR_CONTENT_LENGTH_MISMATCH` when streaming directly from Telegram servers.

## Context
The system uses Telethon to fetch file chunks from Telegram. Browsers request arbitrary byte ranges (e.g., `bytes=5000-10000`).

## The Root Cause
Telegram's `GetFileRequest` has a strict requirement: **The `offset` MUST be a multiple of 4,096 bytes (4KB)**. 
- If you request an offset like `5000`, Telegram returns an `OFFSET_INVALID` error.
- Poorly handled errors in the proxy service lead to service crashes or broken HTTP responses.

## Solution: Alignment & Slicing
1. **Force Alignment**:
   ```javascript
   const ALIGNMENT = 4096;
   const aligned_offset = Math.floor(requested_offset / ALIGNMENT) * ALIGNMENT;
   ```
2. **Buffer Slicing**: 
   Fetch a larger chunk starting from `aligned_offset`. After receiving the buffer from Telegram, slice it to match the actual range the browser requested.
   ```javascript
   const buffer = await telegram.getFile(aligned_offset, limit);
   const start_in_buffer = requested_offset - aligned_offset;
   const final_payload = buffer.slice(start_in_buffer, start_in_buffer + requested_length);
   ```

## Best Practices
- **Chunk Size**: Use **512KB** or **1MB** chunks. Smaller chunks (like 64KB) cause too many overhead requests; larger chunks may hit memory limits or timeout.
- **Error Handling**: Catch `OFFSET_INVALID` explicitly and log the calculated offset for debugging.
