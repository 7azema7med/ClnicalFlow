# ClinicFlow - Professional Clinic Management System

ClinicFlow is a comprehensive, multi-lingual clinic management system designed for medical professionals. It features role-based access, patient tracking, automated prescription generation, and AI-powered data extraction.

## Features

- **Multi-role Access**: Admin, Patient Registration, and Clinic Registration roles.
- **Smart Registration**: AI-powered extraction of patient data from raw text.
- **Real-time Notifications**: Instant alerts for new patient arrivals via WebSockets.
- **Multi-lingual Support**: Full support for Arabic (RTL) and English (LTR).
- **Advanced Analytics**: Dashboard with patient statistics and performance tracking.
- **Export Capabilities**: Export patient data to Excel or PDF (Prescriptions).
- **AI Assistant**: Integrated medical assistant for system navigation and terminology.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: Node.js, Express, SQLite (better-sqlite3), WebSockets (ws).
- **AI**: OpenRouter (GPT-OSS-120B) for data extraction and chat.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and add your OpenRouter API key:
   ```env
   OPENROUTER_API_KEY=your_api_key_here
   ```

### Running the App

#### Development Mode
```bash
npm run dev
```

#### Production Mode
1. Build the frontend:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   NODE_ENV=production npm start
   ```

## Environment Variables

- `OPENROUTER_API_KEY`: Required for AI features.
- `PORT`: Optional (defaults to 3000).

## License

MIT
