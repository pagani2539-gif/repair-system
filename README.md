# Repair & Equipment Replacement Management System

A comprehensive full-stack web application for managing device repairs, equipment inventory, and stock withdrawals with built-in PDF reporting and real-time analytics.

## 📁 Project Structure
- `/client`: Frontend application built with React 19, Vite, and TypeScript.
- `/server`: Backend REST API built with Node.js, Express, and SQLite3.

## 🛠 Tech Stack
### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router 7
- **Data Visualization**: Recharts
- **Icons**: Lucide React
- **PDF Generation**: `jspdf` & `html2canvas` (Template-based rendering)

### Backend
- **Runtime**: Node.js & Express
- **Database**: SQLite3
- **File Uploads**: Multer
- **Middleware**: CORS, Morgan (logging), Centralized Error Handling.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation

1. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the Backend:**
   ```bash
   cd server
   npm run dev
   ```
   The server will run on [http://localhost:5221](http://localhost:5221).

2. **Start the Frontend:**
   ```bash
   cd client
   npm run dev
   ```
   The frontend will run on [http://localhost:5222](http://localhost:5222).

## ✨ Key Features
- **Interactive Dashboard**: Real-time KPI cards and visual charts for repair status, inventory movements, and technician workload.
- **Repair Tracking**: Full lifecycle management of repair tickets, including technician assignments and status history.
- **Inventory Management**: Comprehensive stock tracking with minimum stock alerts and image support for equipment identification.
- **Withdrawal System**: Support for multiple withdrawal types (New Install, Backup, Testing) with automated stock deduction.
- **Global Search (Ctrl+K)**: Command palette for quick navigation and searching across repairs, claims, and inventory.
- **Return Tracking**: Manage returnable withdrawals for testing or backup units with overdue indicators.
- **Purchase Orders (PO)**: Automated draft PO creation when inventory falls below minimum stock level (`min_stock`), custom manual PO builder, non-inventory items support, and stock replenishment workflow upon receipt. Includes safe deletion of POs (reverting stock quantities and log history for Received POs).
- **Executive Reports**: Visual reports with timezone-safe custom date range filters, clean printing layout, and Excel-compatible client-side CSV exports (using UTF-8 BOM encoding).
- **PDF Reporting**: Generate professional PDF reports for repair completions and withdrawal slips.
- **Image Management**: Attach diagnostic or product images to repairs and inventory items.
