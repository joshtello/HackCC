export type InventoryBaseline = {
  quantity: number;
  threshold: number;
  unit: string;
  avgDailyUsage: number;
  source: string;
  notes?: string;
};

const HALF_YEAR_RANGE = "Jan-Jun 2023 Manhattan POS dataset";

export const INVENTORY_BASELINES: Record<string, InventoryBaseline> = {
  "chai tea bag": {
    quantity: 630,
    threshold: 315,
    unit: "Bags",
    avgDailyUsage: 45.24,
    source: HALF_YEAR_RANGE,
    notes: "1 bag per Brewed Chai tea order; values cover ~14 days of demand.",
  },
  "chocolate powder": {
    quantity: 10500,
    threshold: 5250,
    unit: "G",
    avgDailyUsage: 750.55,
    source: HALF_YEAR_RANGE,
    notes:
      "25g of powder per Hot chocolate serving across 5,434 drinks in the data window.",
  },
  "coffee beans": {
    quantity: 36000,
    threshold: 18000,
    unit: "G",
    avgDailyUsage: 2575.84,
    source: HALF_YEAR_RANGE,
    notes:
      "18g per espresso beverage plus 15g per brewed coffee, taken from all coffee drink orders.",
  },
  cups: {
    quantity: 4450,
    threshold: 2225,
    unit: "Cup",
    avgDailyUsage: 317.78,
    source: HALF_YEAR_RANGE,
    notes: "Covers every beverage category (coffee, tea, drinking chocolate).",
  },
  ice: {
    quantity: 280000,
    threshold: 140000,
    unit: "G",
    avgDailyUsage: 20020.08,
    source: HALF_YEAR_RANGE,
    notes:
      "Assumes 35% of beverages are iced (NCA 2023 study) with 180g of ice per drink.",
  },
  "matcha powder": {
    quantity: 260,
    threshold: 130,
    unit: "G",
    avgDailyUsage: 18.52,
    source: HALF_YEAR_RANGE,
    notes:
      "No explicit matcha SKU in the dataset; approximated as 40% of Brewed Green tea orders using 3g powder each.",
  },
  milk: {
    quantity: 221000,
    threshold: 110500,
    unit: "ml",
    avgDailyUsage: 15806.63,
    source: HALF_YEAR_RANGE,
    notes:
      "Milk-heavy drinks (latte, mocha, capp, chai, steamers, hot chocolate) assumed to use 200ml of milk per cup.",
  },
  "tea bag": {
    quantity: 1125,
    threshold: 560,
    unit: "Bag",
    avgDailyUsage: 80.22,
    source: HALF_YEAR_RANGE,
    notes:
      "Covers Brewed Black, Herbal, and Green tea lines at one bag per order.",
  },
  water: {
    quantity: 1068000,
    threshold: 534000,
    unit: "ml",
    avgDailyUsage: 76266.96,
    source: HALF_YEAR_RANGE,
    notes: "Assumes each beverage consumes ~240ml of filtered water.",
  },
};
