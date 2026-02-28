# fluffy-umbrella

A basic project template with React + Tailwind CSS frontend and FastAPI backend.

## Project Structure

```
fluffy-umbrella/
├── backend/          # FastAPI backend
│   ├── main.py      # Main FastAPI application
│   └── requirements.txt
└── frontend/         # React frontend
    ├── public/
    ├── src/
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    ├── package.json
    └── tailwind.config.js
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On macOS/Linux
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

## API Endpoints

- `GET /` - Root endpoint
- `GET /api/health` - Health check endpoint

## Technologies Used

- **Frontend**: React 18, Tailwind CSS 3
- **Backend**: FastAPI, Uvicorn
- **CORS**: Configured for local development