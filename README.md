---
sdk: docker
app_port: 7860
---

<div align="center">
  <img src="client/public/laundrolink-logo.png" alt="LaundroLink Logo" width="200"/>
  <h1>👕 LaundroLink</h1>
  <p><strong>The Intelligent Garment Care & Laundry Management Ecosystem</strong></p>
  
  [![Used By](https://img.shields.io/badge/Used%20By-10%2C000%2B%20Students-blue?style=for-the-badge)](https://vit.ac.in)
  [![Deployed On](https://img.shields.io/badge/Deployed%20On-Hugging%20Face-yellow?style=for-the-badge&logo=huggingface)](https://huggingface.co/)
</div>

<br/>

> 🚀 **Proudly powering the laundry infrastructure at VIT Chennai, actively managing daily laundry operations for a campus of over 10,000+ students.**

---

## 📖 Overview

**LaundroLink** is a full-stack, enterprise-grade web application designed to completely modernize college and university laundry workflows. By bridging the gap between students, staff, and administration, LaundroLink transforms a traditionally chaotic physical chore into a seamless digital experience.

## ✨ Core Features

*   **⏱️ Real-Time Machine Tracking:** Live visibility into washer and dryer availability. Students can check machine status before walking to the laundromat.
*   **🔍 AI-Powered Lost & Found:** A smart system for logging missing items and matching them with found garments using descriptive algorithms.
*   **🔐 Secure Registration & Access:** Multi-tiered role-based access control (Students, Staff, Admins) secured with invitation/authorization codes (e.g., `1234`).
*   **📱 Modern UI/UX:** A stunning, responsive, glassmorphism-inspired design built for both desktop and mobile platforms.
*   **⚙️ Admin & Staff Dashboards:** Dedicated portals for managing inventory, tracking maintenance requests, and overseeing active laundry sessions.

## 🛠️ Technology Stack

*   **Frontend:** React 18, Vite, Tailwind CSS, Radix UI, Wouter
*   **Backend:** Node.js, Express 5, Passport.js (Local Strategy)
*   **Database:** PostgreSQL, Supabase, Drizzle ORM
*   **Deployment:** Docker, Hugging Face Spaces

## 🚀 Getting Started Locally

### Prerequisites
*   Node.js (v20+)
*   pnpm (or npm/yarn)
*   A PostgreSQL Database URL (e.g., Supabase)

### 1. Clone the repository
```bash
git clone https://github.com/krishan-gupta/LaundroLink.git
cd LaundroLink
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and add the following:
```env
# Your direct PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:5432/postgres"

# Optional: Session encryption key
SESSION_SECRET="your-super-secret-session-key"
```

### 4. Database Migrations
Push the database schema to your PostgreSQL instance:
```bash
pnpm run db:push
```

### 5. Start the Development Server
```bash
pnpm run dev
```
The application will be running at `http://localhost:5000`.

---

## 🐳 Deployment (Hugging Face / Docker)

This repository is pre-configured to be deployed instantly on **Hugging Face Spaces** using Docker.

1. Create a new Docker Space on Hugging Face.
2. Connect this GitHub repository.
3. Add `DATABASE_URL` and `SESSION_SECRET` in the Space's **Variables and secrets**.
4. The Space will automatically build and expose the app on port `7860` (as defined in the `README.md` metadata).

---

<div align="center">
  <i>Developed with ❤️ for the students of VIT Chennai.</i>
</div>
