import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type MealType = 'Fruehstueck' | 'Mittagessen' | 'Abendessen' | 'Snack';

type MealEntry = {
  id: string;
  name: string;
  meal: MealType;
  grams: number;
  caloriesPer100g: number;
  createdAt: string;
};

type StoredState = {
  dailyGoal: number;
  entries: MealEntry[];
};

const STORAGE_KEY = 'calorie-tracker-state';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly meals: MealType[] = ['Fruehstueck', 'Mittagessen', 'Abendessen', 'Snack'];

  protected readonly dailyGoal = signal(2200);
  protected readonly entries = signal<MealEntry[]>([]);

  protected readonly foodName = signal('');
  protected readonly selectedMeal = signal<MealType>('Fruehstueck');
  protected readonly grams = signal(100);
  protected readonly caloriesPer100g = signal(250);

  protected readonly totalCalories = computed(() =>
    Math.round(this.entries().reduce((sum, entry) => sum + this.entryCalories(entry), 0)),
  );

  protected readonly remainingCalories = computed(() => this.dailyGoal() - this.totalCalories());

  protected readonly progressPercent = computed(() => {
    const goal = this.dailyGoal();

    if (goal <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((this.totalCalories() / goal) * 100));
  });

  protected readonly groupedEntries = computed(() =>
    this.meals.map((meal) => ({
      meal,
      entries: this.entries().filter((entry) => entry.meal === meal),
    })),
  );

  constructor() {
    const savedState = this.readState();

    if (savedState) {
      this.dailyGoal.set(savedState.dailyGoal);
      this.entries.set(savedState.entries);
    }

    effect(() => {
      const state: StoredState = {
        dailyGoal: this.dailyGoal(),
        entries: this.entries(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  protected addEntry(): void {
    const name = this.foodName().trim();

    if (!name || this.grams() <= 0 || this.caloriesPer100g() < 0) {
      return;
    }

    const entry: MealEntry = {
      id: crypto.randomUUID(),
      name,
      meal: this.selectedMeal(),
      grams: this.grams(),
      caloriesPer100g: this.caloriesPer100g(),
      createdAt: new Date().toISOString(),
    };

    this.entries.update((entries) => [entry, ...entries]);
    this.foodName.set('');
    this.grams.set(100);
    this.caloriesPer100g.set(250);
  }

  protected deleteEntry(id: string): void {
    this.entries.update((entries) => entries.filter((entry) => entry.id !== id));
  }

  protected clearDay(): void {
    this.entries.set([]);
  }

  protected entryCalories(entry: MealEntry): number {
    return (entry.grams / 100) * entry.caloriesPer100g;
  }

  private readState(): StoredState | null {
    const rawState = localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return null;
    }

    try {
      const parsedState = JSON.parse(rawState) as StoredState;

      if (!Array.isArray(parsedState.entries) || typeof parsedState.dailyGoal !== 'number') {
        return null;
      }

      return parsedState;
    } catch {
      return null;
    }
  }
}
