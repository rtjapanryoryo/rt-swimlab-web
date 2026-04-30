-- Add user_email to counseling_requests so admin can reply without looking up auth.users
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS user_email TEXT;
