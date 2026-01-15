-- Add custom_max_hr field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS custom_max_hr integer DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.profiles.custom_max_hr IS 'User-defined custom max heart rate, overrides age-based calculation when set';