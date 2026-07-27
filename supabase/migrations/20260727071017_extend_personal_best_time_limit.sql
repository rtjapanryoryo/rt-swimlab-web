-- マスターズの長距離種目では1時間を超える場合があるため、99分59秒99まで保存可能にします。
ALTER TABLE public.personal_best_times
  DROP CONSTRAINT personal_best_times_time_centiseconds_check;

ALTER TABLE public.personal_best_times
  ADD CONSTRAINT personal_best_times_time_centiseconds_check
  CHECK (time_centiseconds > 0 AND time_centiseconds < 600000);
