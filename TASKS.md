# Task Tracking

This file tracks the progress of features, bug fixes, and maintenance tasks for the Repair & Equipment Replacement Management System.

## Status Legend
- 🟢 **Done**: Completed and verified.
- 🟡 **In Progress**: Currently being worked on.
- ⚪ **Todo**: Planned but not yet started.
- 🔴 **Blocked**: Waiting on external factors or decisions.


## ✅ Completed (2026-06-14)
- [x] **System Enhancements (Image Compression, LINE Notify, User Roles & CSV Export)**: Completed four major system enhancements:
  - Created a client-side canvas-based image compression utility that reduces uploaded image file sizes by 75-90% (down to ~200-500 KB) before uploading, optimizing network bandwidth and server disk space.
  - Implemented LINE Notify status change notifications, automatically broadcasting status updates when repair or claim tickets are modified by technicians/admins.
  - Polished user roles by hiding creating, editing, and deleting options on stations and repairs in the frontend (such as `StationSearch.tsx`) for users lacking respective permissions.
  - Developed a reusable CSV exporter utility with UTF-8 BOM encoding support for Excel compatibility, and integrated Excel export buttons on Repairs, Claims, Inventory, Withdrawals, and Transaction ledger history lists. 🟢

## ✅ Completed (2026-06-13)
- [x] **Pending Returns Dedicated Page & Custom Borrow Durations**: Created a dedicated, standalone page for managing unreturned borrowed/testing equipment, and added return due date controls to the new withdrawal form.
  - Created database migrations `031_add_return_due_date_to_withdrawals.js` and `032_add_status_to_transactions_view.js` to add `return_due_date` to `withdrawals` and expose both `return_due_date` and `status` in `transactions_view`.
  - Updated backend controllers `withdrawals.js`, `transactions.js`, and `repairs.js` to save the return due date, support a `pending_only` filter, and include pending returns in the unread count endpoint.
  - Implemented the `PendingReturns.tsx` page with stats cards, search/filter, a days-remaining/overdue duration status column (featuring LED breathing warning animations for overdue items), and a quick-action return modal.
  - Added "ยืมใช้งาน" to default withdrawal types and created preset (7/15/30 days) and custom (Date Picker) return due date selection controls in `NewWithdrawal.tsx`.
  - Added sidebar navigation for "อุปกรณ์ค้างส่งคืน" with a live count badge, and redirected all dashboard pending return links to the new page. 🟢
- [x] **PM Feature Removal**: Completely removed the Preventive Maintenance (PM) feature from both frontend and backend codebases.
  - Created database migration `030_remove_pm_tables.js` to drop `pm_logs` and `pm_schedules` tables.
  - Deleted backend controllers and routes for PM.
  - Removed client-side components (`PmDashboard.tsx`), api definitions (`pmApi`), and types (`PmSchedule`, `PmLog`).
  - Updated sidebar navigation, app routes, and user management permissions UI to remove all PM references. 🟢
- [x] **Obsolete Code Cleanup**: Cleaned up legacy and obsolete features from the codebase to keep it minimal and maintainable.
  - Removed routes and controllers for station areas (`GET /:id/areas` and `POST /:id/areas`) since the UI shifted to free-text sub-locations.
  - Removed the legacy borrow transaction routes and controllers (`POST /borrow`) as borrowing has been unified under withdrawals.
  - Updated frontend API methods for these endpoints to return stub values directly, ensuring client safety and preventing runtime crashes.
  - Resolved compiler and linter warnings in `api.ts`, `RepairList.tsx`, and `SnScannerModal.tsx`. 🟢

## ✅ Completed (2026-06-11)
- [x] **Dynamic Sub-Areas (Free-text Areas)**: Replaced the fixed database-driven sub-area (Areas) dropdown selector with a free-text text input field across New Repair, New Claim, New Withdrawal, and Repair Detail editing forms.
  - Set `showArea={false}` on `StationSelector` components to hide the legacy dropdown and creation buttons.
  - Implemented client-side input field `จุดติดตั้ง / บริเวณพื้นที่ย่อย` and concatenated it to the station name (separated by ` - `) before sending it to the backend `location` field.
  - Adjusted backend `createRepair`, `createClaim`, `updateRepair`, `createWithdrawal`, `logTransaction`, and `borrowItem` handlers to detect and preserve the custom suffix in `location`.
  - Updated `StationCell` to extract and display the custom sub-location suffix from `location_snapshot` dynamically if `areaName` is not provided.
  - Updated A4 print templates (`PrintTemplate.tsx`, `PrintReturnTemplate.tsx`, `PrintWithdrawalTemplate.tsx`) to render the custom sub-location suffix seamlessly. 🟢
- [x] **Mobile Sidebar/Drawer UI Fixes**: Resolved layout and coloring bugs in the mobile sidebar/drawer view.
  - Forced a solid white background (`#ffffff !important`) and disabled the backdrop-filter on mobile to prevent the dark overlay from bleeding through the glass container.
  - Fixed the `.hide-on-mobile` wrapper selector to completely hide the sidebar toggle/collapse button on small screens.
  - Redesigned the close button (`.sidebar-close-btn`) to be transparent with a dark icon to align with standard mobile navigation bar controls. 🟢
- [x] **Station Detail KPI Cards Redesign**: Redesigned the 4 analytical KPI cards in the Station detail view (Total Activity, Repairs, Claims, Withdrawals) in `StationSearch.tsx`.
  - Aligned all text, numbers, and units to the center vertically and horizontally.
  - Injected modern, color-themed translucent circle icons (`Activity`, `Wrench`, `Shield`, `Package`) above the labels, aligning to the "Executive Hub" aesthetics. 🟢
- [x] **Station Prefill in Creation Forms**: Enabled automatic pre-filling of selected station details when creating new repairs, claims, or withdrawals from the Station Search dossier page quick actions / empty feed links.
  - Parsed `station_id` query parameters using React Router's `useLocation`.
  - Loaded matching station details via `stationApi.getUniqueList` to pre-populate both `station_id`/`stationId` states and the text-based `location` field.
  - Confirmed fully functional interactive rendering in the cascading `StationSelector` components. 🟢
- [x] **Direct Print Flow & Print Dialog Bypass**: Globally bypassed the company selection print dialog popup (`PrintDialog`) across the entire application. Clicking print now directly triggers the print window with default company data.
  - Removed `PrintDialog` imports and replaced them with direct `printElement` calls.
  - Implemented off-screen templates in return history (`TransactionList.tsx`) and purchase order lists (`PurchaseOrderList.tsx`), consistent with repairs and withdrawals.
  - Cleaned up unused state variables in `WithdrawalDetail.tsx` to fix ESLint errors. 🟢
- [x] **Repair & Claim PDF Print Layout Optimization**: Redesigned the PDF print layout for Repair and Claim slips to fit strictly within a single A4 page.
  - Changed the layout structure to a single vertical column, resolving the vertical overflow issue.
  - Consolidated all operational details into a single 3-column `PdfInfoGrid` row-by-row structure.
  - Added support for arbitrary column spans (`span?: number`) in `PdfInfoGrid.tsx`.
  - Created a fixed 4-slot image gallery row showing uploaded evidence photos or elegant dashed placeholder cards for empty slots.
  - Ensured the replaced parts table (S/N table) fits within the single-page budget.
  - Fixed a print style override in `pdfGenerator.ts` where `#pdf-print-template` was assigned `12mm` padding, adding `24mm` (`~90px`) of extra vertical height and pushing the footer to page 2. Grouped it with other templates to have `padding: 0 !important`. 🟢

## ✅ Completed (2026-06-10)
- [x] **Print Preview / PDF Generation Positioning Fix**: Resolved the issue where clicking print/download on repair detail or equipment withdrawal pages resulted in a blank/white preview page. Added `left: 0 !important` and `top: 0 !important` to the print stylesheet rules in `pdfGenerator.ts` to override the off-screen layout offsets (`-99999px`) used by React print templates. 🟢
- [x] **TypeScript Compiler Errors Fix**: Cleaned up build errors causing failed client compilation: removed undefined `setRecipient` in `NewWithdrawal.tsx`, added missing parameter types `withdrawal_id` and `station_id` to `transactionApi.getAll` in `api.ts`, and removed unused icon imports (`CheckCircle2`, `Layers`, `Star`) in `StationSearch.tsx` and `UserManagement.tsx`. 🟢

## ✅ Completed (2025-06-08)
- [x] **"Executive Command Center V2" Upgrade**: Transformed the Dashboard into a high-density analytical hub. Features include:
  - **Asset Health Monitoring**: Visualized most frequent device failures via vertical BarCharts.
  - **Workload Distribution**: Stacked BarCharts tracking technician task completion vs. active assignments.
  - **Inventory Intelligence**: Detailed lists for critical stock levels with progress indicators and Top Used parts analysis.
  - **SLA & Overdue Monitoring**: High-priority alert list for repair tasks exceeding the 3-day turnaround threshold.
  - **Centralized Operational Pulse**: Merged repair activity logs and stock movements into a single chronological timeline with distinct semantic icons.
  - **Enhanced Aesthetics**: Integrated glassmorphic tooltips, asymmetric Bento Grid layouts, and smooth reveal animations. 🟢
- [x] **"The Executive Hub" UI/UX Redesign**: Successfully transitioned the entire system aesthetic from flat minimalist to a premium "Executive Hub" style. Key implementations include:
  - **Global Glassmorphism**: Introduced `--glass-bg`, `--glass-blur`, and layered elevation shadows across all components.
  - **Bento Grid Dashboard**: Restructured the main dashboard into a modular 12-column Bento Grid with interactive Recharts (Area and Donut charts) for real-time analytics.
  - **Premium Sidebar & Search**: Applied frosted glass effects to the navigation and redesigned the global Command Palette (Ctrl+K) into a futuristic centered portal.
  - **"Case File" Detail Views**: Overhauled Repair and Withdrawal detail pages with sticky glass headers, metadata strips, and grouped information cards for a professional technical passport feel.
  - **Refined Componentry**: Upgraded buttons with deeper shadows and smoother interactions, and unified all modals with Glassmorphism styling. 🟢
- [x] **Complete Mock Data Clearing**: Developed and executed `scripts/clear_all_data.js` to comprehensively remove all records from the database and delete all uploaded image files in `server/uploads/`, providing a clean state for the system. 🟢
- [x] **Automated Station Code Generation**: Prevented users from manually entering the station code (Code) when creating a new station by removing the input field from the Add Station modal. The backend now dynamically generates the code using the pattern `STN-{next_id}-{shortDir}` based on `MAX(id)` and the selected direction (INBOUND -> IN, OUTBOUND -> OUT, BOTH -> BOTH, NONE -> NONE). 🟢
- [x] **Database Cleansing & Station Management**: Cleared all mock/pre-seeded station data from the database and disabled migration seeding to ensure users must add stations themselves. Added a complete Station Management view in `StationSearch.tsx` listing all stations, with full support for adding new stations (using automated station codes) and deleting stations via a new backend API `DELETE /api/stations/:id` with foreign key safety (`ON DELETE SET NULL`). 🟢
- [x] **Custom Station Types Support**: Added a 4th option "อื่นๆ (ระบุด้วยตัวเอง)" in the station type dropdown, changed `station_type` type validation to `string` in types, and added conditional text inputs in modals. Updated table rendering and badges to support custom types. 🟢
- [x] **1000 WIM Stations Seeding**: Created and executed `seed_wim_stations.js` to seed exactly 1,000 WIM-themed stations across all 77 provinces using real highway numbers. Temporarily disabled foreign key checking to prevent async race condition errors during bulk transaction inserts. 🟢

---

## 📋 Backlog

### 🟢 Features (Completed previously)
- [x] **Ledger Layout Positioning**: Fixed the Transaction Ledger page layout so content no longer appears left-shifted with large empty right space by centering the page container and using a single-column main layout. 🟢
- [x] **Ledger Outbound Symbol Direction & Color**: Updated the "เบิกออกทั้งหมด" KPI symbol to a red downward icon and aligned the outbound card tint/border to match outbound semantics. 🟢
- [x] **Withdrawal Images**: Added equipment thumbnails to selection dropdown and print templates. 🟢
- [x] **Withdrawal Dropdown Improvements**: Added "ซ่อมแซม" (Repair/Maintenance) and "ระบุด้วยตัวเอง" (Specify by self) custom input, ordered by priority, and styled type badges. 🟢
- [x] **Returnable Withdrawals**: Enabled returns for Testing and Backup withdrawals on the ledger history page, complete with a 7-day overdue warning indicator. 🟢
- [x] **Remove Legacy Borrow/Return**: Removed all legacy borrowing/returning UI, states, modals, and actions from the Inventory page. Consolidated transaction ledger history by merging 'ยืม' into 'เบิกออก' and added styled badges for withdrawal types in the transaction history. 🟢
- [x] **Ledger Return Status & Duration Details**: Displayed return status, usage duration (in days), returner info, condition, and notes directly inside the Transaction Ledger detail modal for test/backup withdrawals and borrowings. 🟢
- [x] **Withdrawal Location Field ("สถานที่")**: Added a location field to withdrawals, saved it in the database and transaction history logs, and rendered it across New Withdrawal forms, History lists, Detail views, and printed PDF templates. 🟢
- [x] **Borrow Date & Expected Return Date UI**: Added exact borrow start date and 7-day expected return date inside the Transaction Ledger detail modal, and resolved a discrepancy where BORROW type transactions were not flagged as overdue in calculations. 🟢
- [x] **Dashboard Premium Animations**: Added hover lift effects to KPI and Bento cards, scale/rotate micro-animations to icons, smooth sliding progress bars triggered on dashboard load, and slide-in/padding expansion animations to list and table rows. 🟢
- [x] **Dashboard KPI Click Navigation**: Linked all 7 Dashboard KPI cards to their corresponding pages/filtered views (e.g., low stock, recent activity, pending/in-progress/completed repairs) and implemented safe, non-cascading state synchronization. 🟢
- [x] **Custom Date Range Filter on History Pages**: Added custom start and end date filters to all list/history pages (Repairs, Claims, Withdrawals, Ledger) with local timezone-safe filtering and styling matching the site tone. 🟢
- [x] **Sidebar Menu Restructuring**: Restructured and renamed the sidebar navigation items in pure Thai to be consistent and ordered by operational frequency (Tracking Lists first, Creation Forms second). 🟢
- [x] **Inventory Image Scaling & TypeScript Fixes**: Adjusted CSS config for the inventory grid cards and modal image upload preview to `object-fit: contain` to preserve the original aspect ratio and details of uploaded images without cropping. Fixed implicit any type compilation issues in history list pages and built the production bundle. 🟢
- [x] **View Toggle & Pagination**: Added View Toggle (Grid vs Table layout) in Repair, Claim, and Stock pages, and pagination controls (15 rows/page) in withdrawal history and transaction ledger pages. Resolved JSX syntax errors and built client. 🟢
- [x] **Search System Audit & Location Fix**: Conducted a comprehensive audit of search features across all 5 list pages. Fixed a bug in the repairs/claims search backend where searching by 'location' was promised by the UI placeholder but omitted from the database query. 🟢
- [x] **Search Enhancements**: Built a global Command Palette (Ctrl+K) overlay searching across Inventory, Repairs, and Claims. Added advanced sidebar triggers, keyboard navigation, and dropdown sorting/filtering by Priority, Location, and Stock Status. 🟢
- [x] **Dashboard V2**: Designed interactive analytics widgets powered by Recharts, showing stacked charts of Technician Workload, donut charts of Withdrawal categories, and area charts of 6-month Stock Movements. 🟢
- [x] **Ledger Inbound KPI Card**: Added an Inbound KPI card to track newly added stock and returned equipment, linking it to the Inbound filter tab, and displayed transaction count badges on the interactive tabs. 🟢
- [x] **Purchase Orders & Executive Reports System**: Added a complete parts reordering system (PO) that automatically creates draft POs when inventory levels drop below minimum stock (min_stock) during withdrawals, updates, or borrowings. Integrated a manual PO builder and stock receiving workflow that adds products back to inventory. Designed an Executive Reports page with client-side Excel (CSV with UTF-8 BOM encoding) exports and print-ready PDF summaries. 🟢
- [x] **Documentation**: 
  - [x] Create README.md with project overview and setup. 🟢
  - [x] Create ARCHITECTURE.md for system design overview. 🟢
  - [x] Create context.md for business logic and workflows. 🟢
  - [x] Create agents.md for AI agent instructions. 🟢
  - [x] Create TASKS.md for progress tracking. 🟢

### 🟢 Infrastructure & Maintenance (Completed previously)
- [x] Implement automated database backups (SQLite) using VACUUM INTO and auto-cleanup. 🟢
- [x] Set up a basic CI/CD pipeline (GitHub Actions workflow) for client-side linting. 🟢
- [x] Refactor `migrate.js` into a robust, automated database-backed migration runner. 🟢
- [x] Cleanup unnecessary test data generation scripts (`add_test_data.js`). 🟢
- [x] Reorganize project structure: moved documentation to `docs/` and utility scripts to `scripts/`. 🟢

### 🟢 Completed Maintenance & Optimizations (Completed previously)
- [x] **Dashboard Layout Alignment & Low Stock Items**: Tidied up layout grids to prevent empty side columns, standardized section header opacities, removed numeric prefixes, made PO tables full width, and added a Low Stock Items (critical items) list below the recent activity section to balance the left column. 🟢
- [x] **Sidebar Active Menu Highlight for Claims Detail**: Resolved an issue where viewing claim details shifted active sidebar highlighting up to Wrench/Repairs by adding a dedicated `/claim-history/:id` route, linking Claim List items to it, and dynamically adapting header labels and delete redirects in the detail view. 🟢
- [x] **Real-time Sidebar Badge Sync**: Integrated instant callback triggers across page creation/read updates to synchronize navigation badges. 🟢
- [x] **Inventory Low Stock Badge**: Added automated checking and badging on the sidebar for items with quantity below minimum stock levels. 🟢
- [x] **UI Polish & Side-Stripe Removal**: Cleared decorative border-left side-stripes from cards, toasts, and PDF templates, applying elegant 1px borders with status tints. 🟢
- [x] **Dashboard Layout & Animation Tuning**: Optimized grid responsive flow for small screens and transitioned bento progress bars to GPU hardware-accelerated `transform: scaleX(...)` animations. 🟢
- [x] **Sidebar Icon Streamlining**: Updated claims tracking and ledger menus with distinct Lucide icons to resolve visual repetition. 🟢
- [x] **Page Hardening & Crash-Resistance (Harden All Pages)**: Integrated global and route-level `ErrorBoundary` components to catch child failures, preventing total white-screens. Added string trimming, maximum character limits (`maxLength`), positive numeric validations, duplicate serial number filters, and loading lock states on form controls and modals (`NewRepair.tsx`, `NewClaim.tsx`, `NewWithdrawal.tsx`, `InventoryList.tsx`, `ProvideSnModal.tsx`, `TransactionList.tsx`, `RepairDetail.tsx`). Secured list maps and charts with optional chaining and safe fallback objects (`Dashboard.tsx`, `WithdrawalDetail.tsx`). 🟢
- [x] **PO Button Styling Harmony & New Procurement Guidance**: Aligned button colors in the Purchase Orders page and modals to the unified light blue and outline theme, eliminating conflicting slate-gray buttons. Integrated visual guides to instruct users on registering new devices in the inventory first. 🟢
- [x] **PO Modal Layout Correction, Warning Guide & Printing**: Aligned the modal's top close button `[X]` horizontally with the title. Added an alert banner explaining how to add items when the PO list is empty. Implemented a professional "พิมพ์ใบสั่งซื้อ" (Print PO) browser print action inside the Detailed Modal. 🟢
- [x] **PO Modal Footer Button Scaling**: Adjusted sizes of footer buttons in the PO detailed and creation modals to be more compact, matching the grid and preventing layout clutter. 🟢
- [x] **PO Modal Alignment, Single-Page Viewport Fit & Metadata Integration**: Organized Create PO modal metadata inputs into a single row of 4 columns, aligned the item selection inputs, and constrained the parts tables with max heights and scrollbars. Rendered requester and project fields in both detailed modal views and printed PDF layouts. 🟢
- [x] **PO Fields Height Equalization & Non-Inventory Ordering**: Corrected Select element height by applying `.form-control` classes and identical padding. Added "+ สั่งซื้ออุปกรณ์ใหม่ (ไม่มีในคลัง)" toggle inside the Create PO modal, permitting users to order custom unregistered devices, which registers them with 0 stock on PO submit. 🟢
- [x] **Contextual Tab/Pill Filter Color Optimization**: Styled active state borders, text and background colors for filter tabs on Ledger and PO list pages. Matched inbound to green, outbound to red, pending to yellow, and overdue to bright red, boosting typesetting scanning. 🟢
- [x] **Executive Reports Date Range Filtering**: Added a responsive Date Range Filter Panel with quick presets (30 days, 3 months, 1 year, all, custom) at the top of the Executive Reports page. Applied timezone-safe date boundary filtering to withdrawals and purchase orders. Injected date range text into CSV filenames (`purchase_orders_YYYYMMDD_YYYYMMDD.csv`) and PDF report print titles. Added real-time/filtered status badges to the report cards. 🟢
- [x] **Instant Audio Notifications**: Exposed the audio notification playback utility `playNotificationSound` in the notification context and triggered it immediately on form submission (repairs, claims, and withdrawals) to provide instant user feedback. Reduced background polling interval from 30 seconds to 5 seconds to broadcast alerts to other clients almost instantly. 🟢
- [x] **Button Hover Animation Refactoring**: Removed the solid blue sliding background block (`::after`) overlay from `.btn-primary` which was clashing and covering other button colors (orange, green, red, etc.). Replaced it with smooth standard CSS `background-color` transitions, and generalized the premium glossy white shimmer sheen (`::before`) to sweep on top of all solid colored buttons for a consistent and high-quality aesthetic. 🟢
- [x] **PO Deletion & Global Icon Overhaul**: Added the ability to delete purchase orders directly from the list page for non-received orders. Conducted a comprehensive icon overhaul across the entire project matching the chosen minimal, modern, and sleek design style. 🟢
- [x] **Trash Button Consistency & Hover Fixes**: Audited and unified the styling and hover animation of all delete/trash buttons. Resolved the hover invisible icon issue on the inventory cards using `.card-action-btn` classes, and bypassed the global `.btn-text` blue overriding on item tables by introducing `.btn-text-danger`. 🟢
- [x] **Dashboard Redesign (Option 1: Modern Luxury + PO Integration)**: Overhauled the layout structure by adding Section 3: "การสั่งซื้อและจัดหาพัสดุ" (Purchase Orders) showing budget spent, drafts pending, received POs, and recent order logs. Applied glassmorphism backdrop-filters, subtle double-layer shadows, and premium Recharts color gradients to bar and stacked column charts. Strictly typed all dashboard models in TypeScript. 🟢
- [x] **Repair Form Custom Fields ("Project / Job")**: Added "โครงการ / งาน" (Project / Job) field, updated "ผู้แจ้ง" to "ชื่อผู้เบิก / หน่วยงาน", and adjusted "สถานที่" to be optional and renamed to "สถานที่ / หน้างาน". Applied changes across New Repair, New Claim, Repair Detail (view & edit), search backend, and printed PDF templates. 🟢
- [x] **Premium KPI Icons Upgrade**: Upgraded icons in Repair List, Claim List, and Transaction List to a more modern and premium set (Inbox, AlertTriangle, RefreshCw, Hourglass, ArrowUpFromLine, etc.) to enhance the professional look of the UI. 🟢
- [x] **Premium PDF Print Templates**: Redesigned PDF templates with module-based color coding (🔵 Repair, 🟠 Claim, 🟢 Withdrawal), improved information grouping, signature areas, and modern layout enhancements. 🟢
- [x] **Transaction List Icon & Printing Fix**: Resolved a `ReferenceError: FileText is not defined` crash and a `TypeError: generatePDF is not a function` in the Transaction List detailed modal by adding missing Lucide-React imports and correcting the PDF generation utility call. 🟢
- [x] **Transaction History Grouping & Tab Fixes**: Refactored the grouping logic in the Transaction Ledger to prioritize chronological activity, ensuring that recent returns bring their parent transactions to the top of the list. Fixed a bug in the Inbound filter tab that was hiding equipment return transactions. 🟢
- [x] **Overdue Threshold Update**: Changed the system-wide overdue return threshold from 7 days to 30 days for equipment borrowings and test/backup withdrawals. Updated all UI labels and logic to reflect the new 30-day policy. 🟢
- [x] **Modern Sidebar Badge Design**: Replaced legacy badges with "Option 2: The Pulse Dot" featuring a minimalist red circle with a smooth glowing pulse animation. Applied consistently across low stock, new repairs, and new claims for a high-end, modern UI feel. 🟢
- [x] **Collapsible Sidebar**: Implemented a "Collapse/Expand" functionality for the main navigation sidebar. Includes a toggle button positioned in the sidebar header, smooth width transitions, and a minimized "mini-sidebar" mode. 🟢
- [x] **Premium Mobile Responsiveness**: Overhauled the system layout for mobile devices using a Drawer-based sidebar menu, fixed mobile top-header with hamburger button, and responsive grid utilities. Fixed squashing issues on the Dashboard by implementing dynamic column counts (4-2-1 logic) and stable Recharts aspect ratios. Enhanced data tables with sticky first columns and scroll shadows for superior mobile UX. 🟢
- [x] **Responsive cleanup across pages**: Standardized dashboard chart layout, removed inline viewport logic, improved Repair Detail and Purchase Order responsive layouts, and added mobile-safe spacing for withdrawal pages. 🟢
- [x] **Recharts Dimensions Warning Fix**: Resolved the console warning `The width(-1) and height(-1) of chart should be greater than 0` by adding `minWidth={1}` and `minHeight={1}` to all `ResponsiveContainer` components on the Dashboard. 🟢
- [x] **Pre-Production Mock Data Seeding**: Developed `seed_mock_data.js` database seeder to populate exactly 100 high-fidelity test records (repairs, claims, inventory, withdrawals, POs) with full status/date distribution over the past 6 months to enable full pre-production testing. 🟢
- [x] **Global Print Templates Layout Fix**: Applied off-screen hiding logic to `PrintWithdrawalTemplate.tsx` and `PrintReturnTemplate.tsx` to prevent print pages from rendering and shifting content on main detail views (`WithdrawalDetail.tsx` and `TransactionList.tsx`). 🟢
- [x] **Print Layout Overflow & Pagination Fix**: Resolved page layout cutoff and footer overflow ("ตกขอบ") on multi-page templates (e.g. 12-item withdrawals) by overriding `.print-page` dimensions, height, and padding during browser print. 🟢
- [x] **Print Templates Uniformity & Layout Alignment**: Aligned the header document titles to Thai ("ใบเบิกพัสดุและอุปกรณ์พัสดุ" / "ใบรับคืนพัสดุและอุปกรณ์"), matched the signature lines layout (adding the centered horizontal lines above signature text), formatted the footer metadata layout, and added full-grid borders with header backgrounds to the items list tables across both the Withdrawal and Return templates to be identical to the Claim template design in Image 2. 🟢
- [x] **Withdrawal Print Header Overlap Fix**: Fixed the header layout in `PrintWithdrawalTemplate.tsx` by setting the header's `marginTop` from `0px` to `8px`. This prevents the top accent color band from overlapping/crossing the header text during PDF rendering and aligns it with other print templates. 🟢
- [x] **Print Headers Spacing & Top Band Position Alignment**: Made page wrapper padding conditional (`padding: isPreview ? '12mm' : '0'`) and aligned top accent band height (5px), header margin-top (6px), and header border-bottom (2px solid) across Withdrawal (`PrintWithdrawalTemplate.tsx`) and Return (`PrintReturnTemplate.tsx`) templates to match the Claim template (`PrintTemplate.tsx`) layout. 🟢
- [x] **Global Print Template Unification & Thai Branding**: Comprehensive audit and unification of all 3 main PDF templates (PrintTemplate, PrintWithdrawalTemplate, PrintReturnTemplate). Standardized header font sizes (h1: 20px/800, subtitle: 11px, address: 9px, doc title: 16px), base colors (textMuted: #64748b, borderColor: #cbd5e1), badge styling (accentColor, 10px, 2px 8px), removed card boxShadow (not visible on print), fixed page gap in Return template (18px→12px), unified signature/QR colors to accentColor, applied conditional padding to PrintTemplate.tsx, reduced withdrawal items-per-page from 10→8 for overflow safety, and updated Thai organizational names to "ระบบบริหารจัดการงานซ่อมบำรุงและพัสดุอุปกรณ์" with "Ref. Document — For internal use only | ใช้ภายในองค์กรเท่านั้น". 🟢
- [x] **Dashboard-Style PDF Templates Redesign (Option 3)**: Completely redesigned all 5 PDF print templates (Repair/Claim, Withdrawal, Return, Executive Reports, and Purchase Orders) to the "Dashboard Style Infographic" concept. Implemented top gradient accent bands, card-based KPI info grids, table style improvements (solid header background fill, zebra-striping, highlighted values), tinted certification boxes, and stamp-themed digital boxes for the signature sections. Cleaned up unused imports, and fixed page margins by setting print page borders padding to a constant 12mm inside the templates and print stylesheet (ignoring browser margins). Verified with ESLint. 🟢
- [x] **Sidebar Navigation Restructuring V2 (Reordering, Icons & Renaming)**: Reorganized the sidebar to separate repairs and claims into dedicated sections. Updated menu titles to be formal ("ประวัติการเบิกพัสดุ", "สมุดบัญชีสต็อก (Ledger)", "การจัดซื้อพัสดุ (PO)", "รายงานและสถิติวิเคราะห์"). Swapped generic/repetitive icons with distinct Lucide indicators (`PlusCircle`, `ShieldPlus`, `ShieldCheck`, `ClipboardList`, `Activity`) to prevent visual redundancy. Verified compilation and ESLint formatting. 🟢
- [x] **Table Column Text Truncation & Wrapping Fix (Transaction List)**: Resolved severe text cutoff/truncation (ellipsis) in the Transaction List table (Devices, Location/Project, and Requesters columns). Reduced spacing of narrow fields (Quantity, Type, S/N) and allocated that percentage width to text columns. Replaced hardcoded `maxWidth` pixel limits (100px/120px) with fluid `maxWidth: '100%'` constraints. Removed `whiteSpace: 'nowrap'` from text columns to enable automatic word wrapping (`whiteSpace: 'normal'`) to ensure full readability. Injected `minWidth: '1200px'` on the table to ensure readable column structures. Solved warning/overdue badge overlapping by increasing the `ระยะเวลาใช้งาน` column width from `8%` to `13%`. 🟢
- [x] **PDF Print Templates Overflow & Page Sizing Correction**: Resolved double padding layout bug by separating nested padding settings in `pdfGenerator.ts`. Adjusted pagination (`ITEMS_PER_PAGE` to 6) in `PrintWithdrawalTemplate.tsx`, and reduced layout gaps, image max heights, and card paddings across Withdrawal, Return, and Executive Reports print views, guaranteeing perfect fit on A4 single-page or paginated PDF outputs without blank-page footers. 🟢
- [x] **Interactive PO Filters & Custom Column Header Filtering**: Implemented interactive PO KPI filters, resolved subtitle text truncation on PO notes (`po.note`), and created customized inline table column search and filter fields (text, numbers, dropdown selects) across all 6 main data table list pages (Purchase Orders, Repairs, Claims, Inventory, Withdrawals, and Transactions/Ledger) with client-side real-time execution. Verified compilation and clean formatting. 🟢
- [x] **Impeccable Design System & UI Polish**: Created the system-wide visual documentation (`DESIGN.md` in the root) and metadata configuration (`.impeccable/design.json`). Audited the frontend and resolved all 21 design warnings, replacing layout transitions in the sidebar collapse with `transform` transitions, removing `border-left` 4px side-stripe borders across all cards, modals, and PDF templates, and optimizing typography pairing with mixed-font (`Outfit` + `Sarabun`) styling on print pages. 🟢
- [x] **Executive Dashboard PDF Templates Visual Redesign**: Performed a complete visual overhaul of the shared PDF layout components (Header, InfoGrid, Table, Signature Block) and all 4 primary print templates (Repair/Claim, Purchase Order, Return, and Withdrawal). Implemented a premium dashboard style featuring left vertical accent border lines, soft color-tinted metadata cards matching the document type, borderless rows with zebra striping in tables, and certificate-style signature approval cards with circular "STAMP" watermarks. Formatted the slips to strictly fit on a single A4 page and integrated context-aware evidence images, condition badges, and thumbnails. Replaced company name and contact info on all internal slips (Repair, Claim, Return, Withdrawal) with context-based icons and system branding "ระบบบริหารจัดการงานซ่อมบำรุงและพัสดุอุปกรณ์ / REPAIR & INVENTORY MANAGEMENT SYSTEM". 🟢

### ⚪ Upcoming / Todo
- [ ] **Auth System**: Add user login and role-based access control (Admin/Technician/User). ⚪
- [ ] **Notifications**: Implement email notifications for repair status updates. ⚪

### 🔄 In-Progress
- 👤 *None*
