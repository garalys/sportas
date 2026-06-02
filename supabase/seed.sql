-- =============================================================================
-- Sportas — optional sample data
-- =============================================================================
-- Run AFTER schema.sql and AFTER you have registered at least one user in the
-- app. Set the email below to that user's email. This script is safe to re-run;
-- it only inserts if the user has no routines yet.
-- =============================================================================

do $$
declare
  v_user      uuid;
  v_routine   uuid;
  v_session   uuid;
  -- 👇 change this to your registered email
  v_email     text := 'demo@sportas.app';
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise notice 'No user found for %, skipping seed.', v_email;
    return;
  end if;

  if exists (select 1 from public.workout_routines where user_id = v_user) then
    raise notice 'User % already has data, skipping seed.', v_email;
    return;
  end if;

  -- Routine: Push day -------------------------------------------------------
  insert into public.workout_routines (user_id, name, description)
  values (v_user, 'Push Day', 'Chest, shoulders, triceps')
  returning id into v_routine;

  insert into public.routine_exercises (routine_id, user_id, name, target_sets, target_reps, target_weight, order_index)
  values
    (v_routine, v_user, 'Bench Press',        4, 8,  60, 0),
    (v_routine, v_user, 'Overhead Press',     3, 10, 35, 1),
    (v_routine, v_user, 'Incline Dumbbell',   3, 12, 22, 2),
    (v_routine, v_user, 'Triceps Pushdown',   3, 15, 25, 3);

  -- Routine: Pull day -------------------------------------------------------
  insert into public.workout_routines (user_id, name, description)
  values (v_user, 'Pull Day', 'Back and biceps')
  returning id into v_routine;

  insert into public.routine_exercises (routine_id, user_id, name, target_sets, target_reps, target_weight, order_index)
  values
    (v_routine, v_user, 'Deadlift',     3, 5,  100, 0),
    (v_routine, v_user, 'Pull Ups',     4, 8,  0,   1),
    (v_routine, v_user, 'Barbell Row',  3, 10, 50,  2),
    (v_routine, v_user, 'Biceps Curl',  3, 12, 15,  3);

  -- A logged gym session with sets -----------------------------------------
  insert into public.workout_sessions (user_id, routine_id, date, type, notes)
  values (v_user, v_routine, current_date - 1, 'gym', 'Felt strong')
  returning id into v_session;

  insert into public.workout_sets (session_id, user_id, exercise_name, set_number, reps, weight)
  values
    (v_session, v_user, 'Bench Press', 1, 8, 60),
    (v_session, v_user, 'Bench Press', 2, 8, 60),
    (v_session, v_user, 'Bench Press', 3, 7, 62),
    (v_session, v_user, 'Overhead Press', 1, 10, 35),
    (v_session, v_user, 'Overhead Press', 2, 9, 35);

  -- Attendance markers (calendar) ------------------------------------------
  insert into public.workout_sessions (user_id, date, type)
  values
    (v_user, current_date - 3, 'gym'),
    (v_user, current_date - 5, 'cardio'),
    (v_user, current_date - 6, 'rest'),
    (v_user, current_date - 8, 'other');

  -- Cardio ------------------------------------------------------------------
  insert into public.cardio_sessions (user_id, date, type, duration_min, calories, distance_km, notes)
  values
    (v_user, current_date - 1, 'running', 30, 320, 5.2, 'Morning run'),
    (v_user, current_date - 5, 'cycling', 45, 410, 18.0, null);

  -- Body measurements (a short history so charts have something to show) ----
  insert into public.body_measurements (user_id, date, height_cm, weight_kg, waist_cm, shoulders_cm, wrist_cm, chest_cm, arm_cm, hips_cm)
  values
    (v_user, current_date - 60, 180, 84.0, 88, 120, 17, 102, 36, 98),
    (v_user, current_date - 30, 180, 82.5, 86, 121, 17, 103, 37, 97),
    (v_user, current_date - 7,  180, 81.2, 85, 122, 17, 104, 38, 96);

  -- Food diary (today) ------------------------------------------------------
  insert into public.food_entries (user_id, date, meal_type, name, quantity, calories, protein, carbs, fat)
  values
    (v_user, current_date, 'breakfast', 'Oatmeal with banana', '1 bowl', 350, 12, 60, 7),
    (v_user, current_date, 'lunch',     'Chicken & rice',      '400 g',  620, 45, 70, 14),
    (v_user, current_date, 'snack',     'Protein shake',       '1 scoop',150, 25, 5,  2);

  raise notice 'Seed complete for %.', v_email;
end $$;
