# LeetCode Scout

A React + Vite app for choosing LeetCode problems by category and rating.

## Features

- Browse problems from the LeetCode problem set.
- Filter by one or more topic categories (all selected topics must match), difficulty, and rating range.
- Search by problem name or ID.
- Pick a random problem matching your current filters.
- Combine real LeetCode metadata with contest-style ratings from zerotrac.

## Run locally

1. Install dependencies with `npm install`.
2. Run `npm run dev`.
3. Open the local URL printed by Vite.

## Build for production

Run `npm run build`.

## Notes

- The first request fetches the LeetCode problem list and the rating data from zerotrac, combines them, and saves the result in `assets/problems.json`.
- Later requests read `assets/problems.json` and do not call either website again. Remove that file only when you want to fetch a fresh copy.
- The cache API runs in the Vite development server and Vite preview server. Production hosting needs an equivalent persistent backend because static hosting cannot write to the project’s assets folder.
- Category selections use strict AND matching: a problem must have every selected topic.
- Problems are sorted by highest rating first by default, with a Show more button to browse beyond the initial 100 results.
- The app does not replace failed live requests with sample problems; it displays the source error and lets you retry.
