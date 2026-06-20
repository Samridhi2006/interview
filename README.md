# Adaptive AI Technical Interview Engine

A full-stack AI-driven interview evaluation system that adapts in real-time. Questions scale dynamically based on response scores.

## Project Structure
- `/frontend`: Next.js frontend with Tailwind CSS and 3D Spline Scene backgrounds.
- `/backend`: Node.js/Express server backed by MongoDB Atlas and Groq LLM integration.

## Getting Started

### Backend Setup
1. Navigate to `/backend`
2. Run `npm install` to install dependencies
3. Create a `.env` file based on `.env.example` and provide your credentials
4. Seed the database with `node seed.js`
5. Start the server with `npm run dev` or `node server.js`

### Frontend Setup
1. Navigate to `/frontend`
2. Run `npm install` to install dependencies
3. Start the Next.js server with `npm run dev`
4. Visit `http://localhost:3000/login` to start the interview
