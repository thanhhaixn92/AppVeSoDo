<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# VMS Navigator / Academic Figure Creator

VMS Navigator is a specialized tool designed for researchers and students to create, preview, and export academic-grade diagrams, charts, and tables from source text or data.

## Key Features
- **Visual Synthesis**: Automatically detect and propose visual structures (Flowcharts, Comparison Tables, Trend Charts) from text.
- **Rule-Based & AI-Powered**: Uses a dual engine of deterministic rules and Gemini AI for precise semantic mapping.
- **Academic Standards**: Produces academic-grade diagrams, charts, and tables. PNG export is supported only when real export logic is available; SVG/PDF/TikZ remain disabled or marked coming soon unless truthfully implemented.
- **Verification Engine**: Real-time audit for diagram overlaps, color contrast, and A4 compliance.

## Prerequisites
- Node.js 18+
- Gemini API Key

## Setup (Windows Run Guide)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env.local` (optional if you input it via UI):
   ```env
   GEMINI_API_KEY=your_apiKey_here
   ```
3. Run linting to check for issues:
   ```bash
   npm run lint
   ```
4. Build the application:
   ```bash
   npm run build
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   > Note: The app usually runs on `http://localhost:3000` or `http://localhost:5173`. Look for the local URL in your terminal output.

## Development Workflow
Please refer to `AGENTS.md` for architectural constraints and product boundaries. For handoff and latest invariant states, see `docs/HANDOFF.md`.
