# Telegram Bot Dynamic Permission Management

## Problem
Relying on hardcoded Telegram IDs in `.env` or config files is inflexible, insecure (secrets leakage), and requires service restarts for every new staff member.

## Solution: Hierarchical Authorization Flow

### 1. Bootstrap Phase
Define a single `SUPER_ADMIN_ID` in the environment variables. This ID is the only one authorized by default.

### 2. Request-Authorize Workflow
- **Unverified User**: Sends `/request_access`.
- **Bot Logic**: Sends a notification to all current Admins/Super Admins with:
  - User details (Name, ID, Username).
  - An inline keyboard with `[Authorize]` and `[Reject]` buttons.
- **Admin Action**: Clicks `[Authorize]`. The bot updates the database.
- **User Notification**: The bot informs the user they have been granted access.

### 3. Middleware Validation
Implement a check in the command handler middleware to verify the `user_id` against the database before executing any administrative commands.

## Schema Recommendation
```sql
CREATE TABLE bot_admins (
    telegram_id BIGINT PRIMARY KEY,
    username TEXT,
    role VARCHAR(20) DEFAULT 'admin', -- 'staff', 'admin', 'super_admin'
    added_by BIGINT, -- The ID of the admin who authorized them
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Benefits
- No restarts required to add/remove staff.
- Audit trail of who authorized whom.
- Secure by default.
