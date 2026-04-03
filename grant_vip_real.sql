INSERT INTO "Membership" (
  id,"discordUserId","guildId","roleId",platform,"platformUserId","platformChatId",source,status,
  "startAt","expireAt","createdAt","updatedAt","removeRetries"
)
VALUES (
  'cm' || substring(md5(random()::text),1,22),
  'tg_1116836781','-3749586011','-3749586011','TELEGRAM','1116836781','-3749586011','MANUAL','ACTIVE',
  NOW(), NOW() + interval '365 days', NOW(), NOW(), 0
)
ON CONFLICT ("discordUserId","guildId","roleId") DO UPDATE
SET
  platform='TELEGRAM',
  "platformUserId"='1116836781',
  "platformChatId"='-3749586011',
  source='MANUAL',
  status='ACTIVE',
  "expireAt"=NOW() + interval '365 days',
  "updatedAt"=NOW();

SELECT "platformUserId","platformChatId",status,source,"expireAt" FROM "Membership"
WHERE "platformUserId"='1116836781'
ORDER BY "updatedAt" DESC
LIMIT 1;
