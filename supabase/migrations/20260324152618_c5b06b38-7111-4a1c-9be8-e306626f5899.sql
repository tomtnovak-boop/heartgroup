ALTER TABLE public.workouts
ADD COLUMN rank_avg_bpm integer DEFAULT NULL,
ADD COLUMN rank_peak_bpm integer DEFAULT NULL,
ADD COLUMN session_participant_count integer DEFAULT NULL;