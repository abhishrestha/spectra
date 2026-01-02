# AI Search Chat Frontend

A Next.js chat interface for interacting with an AI-powered search backend.

## Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app will automatically reload on file changes.

### Build & Production

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## Configuration

Update the backend URL in `src/pages/index.tsx` if needed:

```typescript
const response = await fetch(
  `http://localhost:8000/chat_stream/${encodeURIComponent(input)}`
);
```

## Features

- **Chat Interface**: Clean, minimal chat UI with user and AI message separation
- **Source Display**: Shows sources used by the AI with clickable links
- **Loading States**: Visual feedback while waiting for responses
- **Error Handling**: Graceful error display and recovery
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Black background with IBM Plex Mono font
- **Smooth Scrolling**: Auto-scroll to latest messages

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Font**: IBM Plex Mono
- **Language**: TypeScript

## Project Structure

```
src/
├── pages/
│   ├── _app.tsx        # App wrapper with global styles
│   ├── _document.tsx   # HTML document template
│   └── index.tsx       # Chat page component
└── globals.css         # Global styles and Tailwind

tailwind.config.ts      # Tailwind configuration
tsconfig.json           # TypeScript configuration
next.config.js          # Next.js configuration
postcss.config.js       # PostCSS configuration
```

## API Integration

The frontend expects a backend endpoint at:

```
GET /chat_stream/{message}
```

Response format:
```json
{
  "query": "user's message",
  "sources": [
    {
      "title": "Source Title",
      "url": "https://example.com",
      "score": 0.95
    }
  ],
  "final_answer": "The AI's response text"
}
```

## Customization

### Colors
Update `tailwind.config.ts` to change the color scheme.

### Font
The IBM Plex Mono font is imported via Google Fonts in `src/globals.css`.

### Messages Per Page
Adjust the `max-w-xs` and `max-w-2xl` classes in the message bubbles.

## Troubleshooting

### CORS Errors
If you see CORS errors, ensure your backend has proper CORS configuration enabled.

### API Connection Issues
Check that the backend is running on `http://localhost:8000` and the endpoint URL is correct.

### Styling Not Applied
Clear Next.js cache and rebuild:
```bash
rm -rf .next
npm run build
```
