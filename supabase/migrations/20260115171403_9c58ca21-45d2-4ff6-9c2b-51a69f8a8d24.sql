-- Add nickname column to profiles table with unique constraint
ALTER TABLE public.profiles 
ADD COLUMN nickname TEXT;

-- Create unique index for nickname (allowing nulls)
CREATE UNIQUE INDEX profiles_nickname_unique ON public.profiles (nickname) WHERE nickname IS NOT NULL;