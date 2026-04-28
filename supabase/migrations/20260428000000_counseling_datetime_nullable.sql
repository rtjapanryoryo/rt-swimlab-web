-- preferred_datetime_1 の NOT NULL 制約を削除（日程なし申し込みに対応）
ALTER TABLE counseling_requests
  ALTER COLUMN preferred_datetime_1 DROP NOT NULL;
