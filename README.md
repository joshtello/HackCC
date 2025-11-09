# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/cad82832-e7f2-409c-8a3d-85d4b3b3401d

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/cad82832-e7f2-409c-8a3d-85d4b3b3401d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/cad82832-e7f2-409c-8a3d-85d4b3b3401d) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Inventory baselines

The ingredient quantities displayed on the Inventory page fall back to **Jan-Jun 2023 Manhattan POS data** (`public/data/coffee-sales-manhattan.json`) whenever Supabase does not have explicit numbers. The calculations live in `src/data/inventory-baselines.ts` and assume 14 days of average demand on hand with a 7-day reorder threshold.

| Ingredient | Quantity | Threshold | Unit | Basis |
| --- | --- | --- | --- | --- |
| Chai Tea Bag | 630 | 315 | Bags | Brewed Chai tea orders, 1 bag each |
| Chocolate Powder | 10,500 | 5,250 | G | 25g per Hot chocolate serving |
| Coffee Beans | 36,000 | 18,000 | G | 18g per espresso, 15g per brewed coffee |
| Cups | 4,450 | 2,225 | Cup | All beverages (coffee, tea, drinking chocolate) |
| Ice | 280,000 | 140,000 | G | 35% of drinks iced, 180g ice per iced drink (NCA 2023) |
| Matcha Powder | 260 | 130 | G | Approximated as 40% of Brewed Green tea orders at 3g each |
| Milk | 221,000 | 110,500 | ml | Milk-heavy drinks use 200ml per cup |
| Tea Bag | 1,125 | 560 | Bag | Brewed Black, Herbal, and Green tea orders |
| Water | 1,068,000 | 534,000 | ml | 240ml of filtered water per beverage |

Update the baseline file if you ingest a different sales window or want to tweak the consumption assumptions.
