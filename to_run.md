# Guidewire2

Monorepo for the RakshitArtha demo app.

## Project structure

- `Backend/insurance-module` - Node.js and Express backend
- `Frontend/gigcover` - Vite React frontend
- `Automation` - automation and monitoring workflows

## Requirements

- Node.js 18+ recommended
- npm

## Install dependencies

From the root folder:

```powershell
npm run install:all
```

This installs dependencies for:
- `Backend/insurance-module`
- `Frontend/gigcover`
- `Automation`

## Run the app

### Option 1: Run all services

From the root folder:

```powershell
npm run dev:all
```

### Option 2: Run services separately

Backend:

```powershell
cd Backend/insurance-module
npm run dev
```

Frontend:

```powershell
cd Frontend/gigcover
npm run dev
```

Automation:

```powershell
cd Automation
npm run dev
```

## Expected local ports

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:5000`

## Login details

Use the default demo account below when the app asks for sign-in:

- Email: `rajesh@swiggy.com`
- Password: any value works in the demo flow unless your backend is configured differently

## If dependencies were removed

If `node_modules` was cleaned up to save space, run `npm run install:all` again before starting the app.

## Troubleshooting

- If `npm run dev:all` fails with `concurrently` not found, run `npm run install:all` first.
- If the frontend does not start, run `npm run dev` inside `Frontend/gigcover` after reinstalling dependencies.
- If the backend does not start, run `npm run dev` inside `Backend/insurance-module` and check that port `5000` is free.
- If you deleted caches or logs during cleanup, that is fine; they will be recreated on the next run.

## Notes

- If `npm run dev:all` fails, run the frontend and backend in separate terminals.
- Use the backend README inside `Backend/insurance-module` for API-specific details.
