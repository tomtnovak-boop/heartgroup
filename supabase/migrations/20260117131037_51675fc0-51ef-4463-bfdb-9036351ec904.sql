-- Add weight and gender to profiles for calorie calculation
ALTER TABLE profiles ADD COLUMN weight integer;
ALTER TABLE profiles ADD COLUMN gender text CHECK (gender IN ('male', 'female'));

-- Add zone time tracking and calories to workouts
ALTER TABLE workouts ADD COLUMN zone_1_seconds integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN zone_2_seconds integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN zone_3_seconds integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN zone_4_seconds integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN zone_5_seconds integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN total_calories numeric DEFAULT 0;

-- Create workout_hr_data table for HR history per workout
CREATE TABLE workout_hr_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  bpm integer NOT NULL,
  zone integer NOT NULL,
  hr_percentage numeric NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE workout_hr_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can insert workout_hr_data" ON workout_hr_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view workout_hr_data" ON workout_hr_data FOR SELECT USING (true);