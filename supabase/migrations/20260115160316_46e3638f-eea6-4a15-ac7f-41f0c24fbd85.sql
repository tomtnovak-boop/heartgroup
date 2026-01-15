-- Create profiles table for heart rate training participants
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL DEFAULT 30,
    max_hr INTEGER GENERATED ALWAYS AS (220 - age) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workouts table for training history
CREATE TABLE public.workouts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    avg_bpm INTEGER,
    max_bpm INTEGER,
    avg_zone INTEGER,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live_hr table for realtime heart rate data
CREATE TABLE public.live_hr (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    bpm INTEGER NOT NULL,
    zone INTEGER NOT NULL CHECK (zone >= 1 AND zone <= 5),
    hr_percentage NUMERIC(5,2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_hr ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles - allow public read for coach dashboard, insert for new participants
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can create profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (true);

-- RLS Policies for workouts
CREATE POLICY "Anyone can view workouts" ON public.workouts FOR SELECT USING (true);
CREATE POLICY "Anyone can create workouts" ON public.workouts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workouts" ON public.workouts FOR UPDATE USING (true);

-- RLS Policies for live_hr - public read for coach dashboard
CREATE POLICY "Anyone can view live_hr" ON public.live_hr FOR SELECT USING (true);
CREATE POLICY "Anyone can insert live_hr" ON public.live_hr FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete live_hr" ON public.live_hr FOR DELETE USING (true);

-- Enable Realtime for live_hr table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_hr;

-- Create index for faster queries on live_hr
CREATE INDEX idx_live_hr_profile_timestamp ON public.live_hr(profile_id, timestamp DESC);
CREATE INDEX idx_live_hr_timestamp ON public.live_hr(timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean up old live_hr data (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_live_hr()
RETURNS void AS $$
BEGIN
    DELETE FROM public.live_hr WHERE timestamp < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SET search_path = public;