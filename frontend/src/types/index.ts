export interface FoodLog {
  id: number
  item_name: string
  quantity: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fibre: number | null
  sugar: number | null
  notes: string | null
}

export interface DrinkLog {
  id: number
  item_name: string
  quantity_ml: number | null
  calories: number | null
  is_alcoholic: boolean
  alcohol_units: number | null
  notes: string | null
}

export interface ExerciseLog {
  id: number
  exercise_type: string
  duration_minutes: number | null
  distance_km: number | null
  calories_burned: number | null
  notes: string | null
}

export interface WeightLog {
  id: number
  weight_kg: number
  notes: string | null
}

export interface DiaryEntry {
  id: number
  entry_date: string
  entry_time: string
  entry_type: 'food' | 'drink' | 'exercise' | 'weight'
  raw_input: string
  created_at: string
  food_log: FoodLog | null
  drink_log: DrinkLog | null
  exercise_log: ExerciseLog | null
  weight_log: WeightLog | null
}

export interface ExerciseSession {
  exercise_type: string
  duration_minutes: number | null
  distance_km: number | null
  calories_burned: number | null
}

export interface DayHistory {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fibre: number
  alcohol_units: number
  calories_burned: number
  exercise_sessions: ExerciseSession[]
  weight_kg: number | null
}

export interface HistoryResponse {
  days: DayHistory[]
}

export interface Profile {
  id: number
  name: string
  sex: 'male' | 'female'
}

export interface DaySummary {
  date: string
  entries: DiaryEntry[]
  total_calories_consumed: number
  total_protein: number
  total_carbs: number
  total_fat: number
  total_fibre: number
  total_alcohol_units: number
  total_calories_burned: number
  net_calories: number
  weight_kg: number | null
}

export interface ChatResponse {
  type: 'entry' | 'edit' | 'answer' | 'error'
  confirmation: string | null
  answer: string | null
  entry: DiaryEntry | null
  error: string | null
}

export interface EntryUpdate {
  entry_date?: string
  entry_time?: string
  food?: Partial<FoodLog>
  drink?: Partial<DrinkLog>
  exercise?: Partial<ExerciseLog>
  weight?: Partial<WeightLog>
}
