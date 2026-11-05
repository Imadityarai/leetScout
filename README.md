# LeetCode Scout

A React + Vite app for choosing LeetCode problems by category and rating.

## Features

- Browse problems from the LeetCode problem set.
- Filter by one or more topic categories in soft mode (all selected topics must match) or hard mode (the problem's categories must match the selection exactly), difficulty, and rating range.
- Search by problem name or ID.
- Pick a random problem matching your current filters.
- Combine real LeetCode metadata with contest-style ratings from zerotrac.

## Run locally

1. Install dependencies with `npm install`.
2. Run `npm run dev`.
3. Open the local URL printed by Vite.

## Build for production

Run `npm run build`.

## Deploy to GitHub Pages

The GitHub Actions workflow builds and publishes the app to
`https://imadityarai.github.io/leetScout/` whenever changes are pushed to `main`.
GitHub Pages must use **GitHub Actions** as its build and deployment source.

The production build includes the current `assets/problems.json` snapshot as a
static dataset. To update the published problem list, refresh that file with the
local Vite server and commit the updated snapshot.

## Notes

- The first request fetches the LeetCode problem list and the rating data from zerotrac, combines them, and saves the result in `assets/problems.json`.
- Later requests read `assets/problems.json` and do not call either website again. Remove that file only when you want to fetch a fresh copy.
- The cache API runs in the Vite development server and Vite preview server. GitHub Pages serves the bundled static problem snapshot because static hosting cannot write to the project’s assets folder.
- Soft category matching requires every selected topic but allows extra topics; hard matching requires an exact category set. With no selected categories, either mode leaves the category filter inactive.
- Problems are sorted by highest rating first by default, with a Show more button to browse beyond the initial 100 results.
- The app does not replace failed live requests with sample problems; it displays the source error and lets you retry.
## about app
this app provides a way to filter out Leetcode DSA problems on the basis of multiple Categories and Rating of the problem based on contest.