# Rebar Cut Optimizer - Backend Code Manual

This document provides a comprehensive guide to the backend architecture, technologies, and core logic of the Rebar Cut Optimizer. It is designed to help new developers quickly understand the system and start contributing.

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Folder Structure](#folder-structure)
4. [Database Schema](#database-schema)
5. [Core Logic & Engine](#core-logic--engine)
6. [API & Routing](#api--routing)
7. [Getting Started](#getting-started)

---

## Overview

The backend serves as the core processing engine for the Rebar Cut Optimizer. It handles user authentication, job management, Excel/CSV requirement uploads, and executes the First Fit Decreasing (FFD) 1D cutting stock optimization algorithm to minimize rebar waste.

## Technology Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** SQLite (for simple, file-based relational data storage)
- **ORM:** Prisma
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **File Uploads:** Multer (handling Excel/CSV inputs)
- **Data Processing:** `xlsx` (parsing Excel files)
- **API Documentation:** Swagger UI (`swagger-jsdoc`, `swagger-ui-express`)

---

## Folder Structure

The source code is primarily located in the `src` directory:

```text
src/
├── controllers/        # Express route controllers (business logic handling)
│   ├── auth.controller.ts
│   ├── job.controller.ts
│   └── ...
├── middleware/         # Express middleware (Auth verification, file uploads)
├── routes/             # API route definitions
│   ├── auth.routes.ts
│   ├── job.routes.ts
│   └── ...
├── services/           # Reusable services (e.g., Export services)
├── utils/              # Utility functions and core algorithms
│   ├── excelProcessor.ts      # Parses uploaded requirements
│   ├── optimizationEngine.ts  # The FFD cutting algorithm
│   └── prisma.ts              # Prisma client singleton
└── server.ts           # Express application entry point
```

---

## Database Schema

The database is managed using Prisma. The schema (`prisma/schema.prisma`) revolves around these core entities:

- **User / UserSettings / AccessLog:** Manages user authentication, roles (`ADMIN`, `MANAGER`, `ENGINEER`), and preferences.
- **Job:** The primary entity representing an optimization task. It holds settings like `stockLengthMm`, `minOffcutToSaveMm`, etc.
- **RebarRequirement:** The input pieces needed for a Job (parsed from Excel).
- **StockBar:** The output stock bars utilized in a Job. Tracks `totalLengthMm`, `remainingLengthMm`, and whether it is `isScrap`.
- **CutPiece:** Individual cuts made on a `StockBar` to fulfill a `RebarRequirement`.
- **Offcut:** Reusable leftover pieces generated from a Job that meet the `minOffcutToSaveMm` threshold.

---

## Core Logic & Engine

The backend relies on three primary stages to process rebar cutting jobs:

### 1. Requirements Ingestion (`utils/excelProcessor.ts`)
Users upload requirements via Excel/CSV. The backend uses `multer` to accept the file and the `xlsx` library to parse it. Requirements are extracted (diameter, length, quantity, location) and saved as `RebarRequirement` records linked to a `Job`.

### 2. Optimization Engine (`utils/optimizationEngine.ts`)
This is the heart of the application. It solves the 1D Cutting Stock Problem using a combination of the **First Fit Decreasing (FFD)** heuristic and a **Local Search Refinement** algorithm.

**Step A: First Fit Decreasing (FFD)**
The algorithm processes pieces independently by diameter. First, it flattens the quantity into individual pieces and sorts them by length in descending order. For each piece, it tries to fit it into the earliest available stock bar. If it doesn't fit, it opens a new stock bar.

```typescript
// Flatten & group by diameter
const diameterPieces = piecesToCut
    .filter(p => p.diameter === diameter)
    .sort((a, b) => b.length - a.length); // Sort descending

const stockBars: CutResult[] = [];

diameterPieces.forEach(piece => {
    let fitted = false;
    for (const bar of stockBars) {
        if (bar.remainingLengthMm >= piece.length) {
            bar.pieces.push({ requirementId: piece.id, lengthMm: piece.length });
            bar.remainingLengthMm -= piece.length;
            fitted = true;
            break;
        }
    }
    // Open a new stock bar if no fit is found
    if (!fitted) {
        stockBars.push({ /* new stock bar initialized */ });
    }
});
```

**Step B: Local Search Swap**
After the initial FFD pass, a local search refinement attempts to improve the result. It focuses on moving pieces from sparsely populated bars to others with remaining capacity, thereby emptying bars and reducing the total number of stock bars used.

```typescript
// Sort bars by remaining length descending (target sparsest bars first)
currentResults.sort((a, b) => b.remainingLengthMm - a.remainingLengthMm);

for (let i = 0; i < currentResults.length; i++) {
    const barFrom = currentResults[i]!;

    for (let j = currentResults.length - 1; j > i; j--) {
        const barTo = currentResults[j]!;
        // Try to move pieces from barFrom to barTo
        // ... (if piece fits, move it and adjust remaining lengths)
    }
    // If a bar is completely emptied, remove it from the results
    if (barFrom.pieces.length === 0) {
        currentResults.splice(i, 1);
        improved = true;
        break;
    }
}
```

**Step C: Offcuts vs Scrap**
Finally, the algorithm determines if the leftover portion of each stock bar is an offcut or scrap.
```typescript
currentResults.forEach(bar => {
    // If the remainder is >= minOffcutToSaveMm, it's reusable
    bar.isScrap = bar.remainingLengthMm < minOffcutToSaveMm;
});
```

### 3. Job Execution & Transactions (`controllers/job.controller.ts`)
When an optimization is complete, the results (StockBars, CutPieces, Offcuts) are persisted to the database.

> **Note on Prisma Transactions:** Large jobs generate thousands of cut pieces. To prevent the Prisma transaction from timing out (default 5000ms), the writes are **batched** and the timeout is **increased to 30s**.

```typescript
// Collect all cut pieces and offcuts in memory first
// ...
for (const bar of results) {
    const createdBar = await tx.stockBar.create({ /* ... */ });
    
    for (const p of bar.pieces) {
        allCutPiecesData.push({ stockBarId: createdBar.id, requirementId: p.requirementId, lengthMm: p.lengthMm });
    }
}

// Single bulk insert for all cut pieces (highly optimized)
if (allCutPiecesData.length > 0) {
    await tx.cutPiece.createMany({ data: allCutPiecesData });
}

// Single bulk insert for all offcuts
if (allOffcutsData.length > 0) {
    await tx.offcut.createMany({ data: allOffcutsData });
}
}, { timeout: 30000 }); // 30s timeout to handle large jobs
```

---

## API & Routing

All routes are prefixed with `/api` and are protected by JWT authentication middleware where applicable.

- **`/api/auth`**: Login, registration, and token validation.
- **`/api/jobs`**: CRUD operations for Jobs, uploading requirements, triggering optimization, and fetching summary/patterns.
- **`/api/offcuts`**: Retrieving available offcuts.
- **`/api/settings`**: User preference management.
- **`/api/reports`**: Generating and exporting reports (e.g., Excel fabrication reports).

Swagger documentation is available (when running locally) at `/api-docs`.

---

## Getting Started

### Local Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and configure your settings.
   ```bash
   cp .env.example .env
   ```
   Ensure `DATABASE_URL` is set (e.g., `"file:./dev.db"`).

3. **Database Initialization:**
   Generate the Prisma client and push the schema to your SQLite database.
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the Server:**
   Start the development server with hot-reloading (using `tsx`):
   ```bash
   npm run dev
   ```

### Production Build

1. **Compile TypeScript:**
   ```bash
   npm run build
   ```
2. **Start the Application:**
   ```bash
   npm start
   ```

### Important Scripts
- `npm run dev`: Runs the app in dev mode (`tsx watch`).
- `npm run build`: Compiles TS to JS into the `dist` folder.
- `npm start`: Runs the compiled output in Node.js.
