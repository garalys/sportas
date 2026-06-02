export * from './database';

import type { SessionType, CardioType, MealType } from './database';

export const SESSION_TYPES: SessionType[] = ['gym', 'cardio', 'rest', 'other'];

// Tailwind-friendly colors for calendar indicators / badges
export const SESSION_TYPE_COLORS: Record<string, string> = {
  gym: 'bg-brand-500',
  cardio: 'bg-emerald-500',
  rest: 'bg-slate-400',
  other: 'bg-amber-500',
};

export const CARDIO_TYPES: CardioType[] = ['running', 'cycling', 'walking', 'rowing', 'other'];

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
