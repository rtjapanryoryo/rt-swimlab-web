-- 予約済み枠を認証済みユーザー全員に返すRPC関数
-- SECURITY DEFINER でRLSをバイパスし、datetime のみを返す（PII一切なし）
CREATE OR REPLACE FUNCTION public.get_booked_slots()
RETURNS TABLE (slot_datetime text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT preferred_datetime_1
  FROM public.counseling_requests
  WHERE status != 'cancelled'
    AND preferred_datetime_1 IS NOT NULL;
$$;

-- 認証済みユーザーのみ実行可能
REVOKE EXECUTE ON FUNCTION public.get_booked_slots() FROM public;
GRANT EXECUTE ON FUNCTION public.get_booked_slots() TO authenticated;
