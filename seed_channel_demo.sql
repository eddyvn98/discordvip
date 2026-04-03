WITH upsert_channel AS (
  INSERT INTO "CinemaChannel" (
    id, platform, "sourceChannelId", role, "displayName", slug, "isEnabled", "createdAt", "updatedAt"
  ) VALUES (
    'ch_demo_3749586011', 'TELEGRAM', '-3749586011', 'FULL_SOURCE', 'Telegram Source -3749586011', 'telegram-3749586011', true, NOW(), NOW()
  )
  ON CONFLICT (platform, "sourceChannelId") DO UPDATE
    SET "displayName" = EXCLUDED."displayName", role = EXCLUDED.role, "isEnabled" = true, "updatedAt" = NOW()
  RETURNING id
), channel_row AS (
  SELECT id FROM upsert_channel
  UNION ALL
  SELECT id FROM "CinemaChannel" WHERE platform='TELEGRAM' AND "sourceChannelId"='-3749586011' LIMIT 1
), inserted_items AS (
  INSERT INTO "CinemaItem" (
    id, "channelId", "sourceMessageId", title, description, "durationSeconds", status, "createdAt", "updatedAt"
  )
  SELECT
    v.id, c.id, v.msg, v.title, v.descr, v.dur, 'READY', NOW(), NOW()
  FROM channel_row c
  CROSS JOIN (VALUES
    ('item_demo_1','msg_demo_1001','Demo Film 01','Imported mock from Telegram source channel for UI testing',640),
    ('item_demo_2','msg_demo_1002','Demo Film 02','Imported mock from Telegram source channel for UI testing',712),
    ('item_demo_3','msg_demo_1003','Demo Film 03','Imported mock from Telegram source channel for UI testing',845)
  ) AS v(id,msg,title,descr,dur)
  ON CONFLICT ("channelId", "sourceMessageId") DO UPDATE
    SET title = EXCLUDED.title, description = EXCLUDED.description, "durationSeconds"=EXCLUDED."durationSeconds", status='READY', "updatedAt"=NOW()
  RETURNING id
)
INSERT INTO "CinemaAsset" (
  id, "itemId", kind, provider, "fileRef", "mimeType", "createdAt", "updatedAt"
)
SELECT
  'asset_' || i.id || '_' || k.kind,
  i.id,
  k.kind::"CinemaAssetKind",
  'demo-seed',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'video/mp4',
  NOW(), NOW()
FROM inserted_items i
CROSS JOIN (VALUES ('PREVIEW'), ('FULL')) AS k(kind)
ON CONFLICT ("itemId", kind) DO UPDATE
  SET provider=EXCLUDED.provider, "fileRef"=EXCLUDED."fileRef", "mimeType"=EXCLUDED."mimeType", "updatedAt"=NOW();

SELECT c.id, c."sourceChannelId", c."displayName", COUNT(i.id) AS item_count
FROM "CinemaChannel" c
LEFT JOIN "CinemaItem" i ON i."channelId"=c.id
WHERE c.platform='TELEGRAM' AND c."sourceChannelId"='-3749586011'
GROUP BY c.id, c."sourceChannelId", c."displayName";
