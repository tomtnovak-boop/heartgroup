## Live session presentation
- Coach Live detects completion from the observed coach-owned session, not the local recording hook, so phone-driven stops also show a recap.
- Workouts currently have no session foreign key; scope Live recaps by the observed session's start/end window and captured lobby profiles when available, rather than a global recent-workouts query.