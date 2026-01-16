-- 1. Drop the generated max_hr column
ALTER TABLE profiles DROP COLUMN max_hr;

-- 2. Add max_hr as a regular integer column
ALTER TABLE profiles ADD COLUMN max_hr integer;

-- 3. Update existing values with Tanaka formula (208 - 0.7 * age)
UPDATE profiles SET max_hr = ROUND(208 - (0.7 * age));