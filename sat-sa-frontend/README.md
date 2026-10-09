# SAT-SA Frontend

This is an alternate frontend retained for reference. The default application now uses the refined frontend in the repository root `src/` directory.

## Development

To run this alternate frontend explicitly:

```bash
npm install
npm --prefix sat-sa-frontend install
npm --prefix sat-sa-frontend run dev
```

This starts Vite on `http://127.0.0.1:5173`. Its proxy sends `/api` requests to the Node API on port `3101`. Start MongoDB and the API separately.

To start only the frontend, run `npm run dev`. To run the Python ML service, start it separately from `ml-backend` with `python -m src.api`.

## Frontend commands

```bash
npm --prefix sat-sa-frontend run dev
npm --prefix sat-sa-frontend run build
npm --prefix sat-sa-frontend run lint
npm --prefix sat-sa-frontend run preview
```
