# Copilot Instructions for my-ai-assistant

This document provides essential knowledge for AI coding agents to effectively work with the `my-ai-assistant` codebase.

## 1. Big Picture Architecture

The project is structured as a monorepo with two primary components:
- `backend/`: A Node.js (Express) API server.
- `frontend/`: A Next.js application.

### Data Flow Overview:
1.  **Frontend (Next.js)** makes API calls to the **Backend (Express)**.
2.  **Backend** then conditionally:
    *   Responds with offline/event-based answers.
    *   Calls the **Google Generative AI (Gemini) API** for AI responses.
3.  Both chat history and events are persisted locally on the backend as JSON files.

## 2. Key Components and Their Responsibilities

### `backend/`
-   **`src/server.js`**:
    *   Main Express server handling all API routes (`/api/chat`, `/api/event`, `/api/chat-history`, `/api/events/:type`, `/api/status`).
    *   Integrates with `@google/generative-ai` using the `gemini-2.0-flash` model.
    *   Includes an **offline fallback mechanism** (`getOfflineResponse`, `tryAnswerEventQuery`) that provides deterministic responses when the Google API is unreachable or quota is exceeded.
    *   Manages local data persistence for chat history (`chat_history.json`) and events (`events.json`) in the `backend/data` directory.
-   **`package.json`**: Defines backend dependencies (`express`, `cors`, `dotenv`, `@google/generative-ai`, `uuid`) and scripts (`start`, `dev`).
-   **`.npmrc`**: Contains `legacy-peer-deps=true` to resolve `npm` peer dependency conflicts during deployment.

### `frontend/`
-   **`app/page.js`**: The main client-side React component for the chat interface. It handles user input, displays chat history, and makes API calls to the backend.
-   **`app/layout.js`**: The root layout for the Next.js application, importing global styles.
-   **`app/globals.css`**: Contains all custom CSS styling for the application. **Note: Tailwind CSS has been removed from this project.**
-   **`next.config.js`**: Configures Next.js, including `NEXT_PUBLIC_API_URL` which points to the backend service.
-   **`package.json`**: Defines frontend dependencies (`next`, `react`, `react-dom`, `axios`, `autoprefixer`, `postcss`).

## 3. Critical Developer Workflows

### 3.1. Local Development Setup
1.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    ```
2.  **Install Frontend Dependencies:**
    ```bash
    cd frontend
    npm install
    ```
3.  **Environment Variables:**
    *   Create `backend/.env` with `GOOGLE_API_KEY=<your_api_key>` and `PORT=5000`.
    *   Create `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5000`.

4.  **Run Backend Locally:**
    ```bash
    cd backend
    npm run dev
    # or npm start
    ```
    The backend will run on `http://localhost:5000`.

5.  **Run Frontend Locally:**
    ```bash
    cd frontend
    npm run dev
    ```
    The frontend will run on `http://localhost:3000` (or `http://localhost:3001` if 3000 is in use).

### 3.2. Deployment
-   **Backend (Render.com)**:
    *   **Root Directory**: `backend`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
    *   **Environment Variables**: `GOOGLE_API_KEY=<your_prod_api_key>`, `PORT=5000`.
    *   Ensure the `.npmrc` file is present in the `backend` directory for `legacy-peer-deps` handling.
-   **Frontend (Vercel)**:
    *   **Root Directory**: `frontend`
    *   **Environment Variable**: `NEXT_PUBLIC_API_URL` should be set to the deployed backend URL (e.g., `https://my-ai-assistant-final.onrender.com`).

## 4. Project-Specific Conventions and Patterns

-   **Offline Mode**: The backend automatically falls back to deterministic offline responses if the Google Generative AI API fails (e.g., due to quota limits or network issues). This is handled by `getOfflineResponse` in `backend/src/server.js`.
-   **Event System**: The backend includes a simple event logging system (`/api/event`, `/api/events/:type`) for recording and retrieving specific user-related events (e.g., 'vitamin', 'doctor').
-   **Styling**: The frontend uses plain CSS defined in `frontend/app/globals.css`. There are no Tailwind CSS classes used or configured.
-   **Model**: The project specifically uses the `gemini-2.0-flash` model. If a different model is desired, update `backend/src/server.js`.

## 5. Potential Issues and Troubleshooting

-   **Google API Quota**: If the bot gives offline responses in production, check Google Cloud Console for `Generative Language API` quota usage. You might need to enable billing or create a new API key.
-   **`npm install` failures on CI/CD**: If build fails with peer dependency errors, ensure `backend/.npmrc` with `legacy-peer-deps=true` is present and pushed to the repository. If not, consider using `npm install --legacy-peer-deps` as the build command.
