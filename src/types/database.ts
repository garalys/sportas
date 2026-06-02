// Hand-written Supabase schema types (kept in sync with supabase/schema.sql).
// You can later replace this with `supabase gen types typescript`.
//
// NOTE: these MUST be `type` aliases (not `interface`). supabase-js constrains
// the schema to `Record<string, unknown>`, and interfaces lack an implicit index
// signature, which would silently collapse every query result to `never`.

export type UserRole = 'client' | 'trainer' | 'admin';
export type SessionType = 'gym' | 'cardio' | 'rest' | 'other';
export type CardioType = 'running' | 'cycling' | 'walking' | 'rowing' | 'other';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type PhotoStatus = 'uploaded' | 'analyzing' | 'analyzed' | 'saved' | 'error';

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  height_cm: number | null;
  created_at: string;
  updated_at: string;
};

export type TrainerClient = {
  id: string;
  trainer_id: string;
  client_id: string;
  created_at: string;
};

export type WorkoutRoutine = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type RoutineExercise = {
  id: string;
  routine_id: string;
  user_id: string;
  name: string;
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
  notes: string | null;
  order_index: number;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  routine_id: string | null;
  date: string;
  type: SessionType;
  notes: string | null;
  created_at: string;
};

export type WorkoutSet = {
  id: string;
  session_id: string;
  user_id: string;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  created_at: string;
};

export type CardioSession = {
  id: string;
  user_id: string;
  date: string;
  type: CardioType;
  duration_min: number;
  calories: number | null;
  distance_km: number | null;
  notes: string | null;
  created_at: string;
};

export type BodyMeasurement = {
  id: string;
  user_id: string;
  date: string;
  height_cm: number | null;
  weight_kg: number | null;
  waist_cm: number | null;
  shoulders_cm: number | null;
  wrist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  hips_cm: number | null;
  created_at: string;
};

export type FoodEntry = {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  name: string;
  quantity: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  photo_id: string | null;
  created_at: string;
};

export type DetectedFood = {
  name: string;
  quantity?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

// A single food item stored inside a reusable recipe (JSONB array).
export type RecipeItem = {
  name: string;
  quantity?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};

export type FoodRecipe = {
  id: string;
  user_id: string;
  name: string;
  items: RecipeItem[];
  created_at: string;
};

export type FoodPhoto = {
  id: string;
  user_id: string;
  storage_path: string;
  status: PhotoStatus;
  detected: { items: DetectedFood[] } | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Database type consumed by createClient<Database>(). Insert/Update are kept
// permissive (Partial) since the app supplies only the fields it needs and the
// DB fills defaults.
// ---------------------------------------------------------------------------
type TableShape<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<Profile>;
      trainer_clients: TableShape<TrainerClient>;
      workout_routines: TableShape<WorkoutRoutine>;
      routine_exercises: TableShape<RoutineExercise>;
      workout_sessions: TableShape<WorkoutSession>;
      workout_sets: TableShape<WorkoutSet>;
      cardio_sessions: TableShape<CardioSession>;
      body_measurements: TableShape<BodyMeasurement>;
      food_entries: TableShape<FoodEntry>;
      food_photos: TableShape<FoodPhoto>;
      food_recipes: TableShape<FoodRecipe>;
    };
    Views: Record<string, never>;
    Functions: {
      is_trainer_of: {
        Args: { target_user: string };
        Returns: boolean;
      };
      add_client_by_email: {
        Args: { p_email: string };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      session_type: SessionType;
      cardio_type: CardioType;
      meal_type: MealType;
      photo_status: PhotoStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
