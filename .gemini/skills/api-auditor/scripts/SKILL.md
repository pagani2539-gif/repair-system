# Repair & Equipment Replacement System Skill

## Project Overview
ระบบแจ้งซ่อมและเปลี่ยนอุปกรณ์สำหรับใช้งานภายในทีม
รองรับการแจ้งปัญหา ติดตามสถานะ แนบรูป และบันทึกประวัติการเปลี่ยนอุปกรณ์

---

# Core Features

## 1. Repair Ticket System
- สร้างเลข Ticket อัตโนมัติ
- แจ้งปัญหาได้รวดเร็ว
- แนบรูปภาพได้
- ระบุอุปกรณ์ / Lane / Location ได้

### Example Ticket
REP-20260526-0001

---

## 2. Status Tracking
รองรับสถานะงาน:

- Open
- In Progress
- Waiting Part
- Completed
- Cancelled

---

## 3. Equipment Replacement
ระบบบันทึกการเปลี่ยนอุปกรณ์

### Old Device
- Serial Number
- Device Model
- IP Address
- Install Location

### New Device
- New Serial
- New Model
- Replace Date
- Technician

---

## 4. Timeline / Activity Log
เก็บประวัติการทำงานทั้งหมด

### Example
08:30 User created ticket
08:45 Technician accepted task
09:10 Camera replaced
09:20 Testing completed
09:30 Ticket closed

---

## 5. Image Upload
รองรับ:
- Before Repair
- After Repair
- Device Photo
- Error Screenshot

---

# Recommended Tech Stack

## Frontend
- React
- TailwindCSS
- Vite

## Backend
- Node.js
- Express.js

## Database
- MySQL
or
- SQLite

## Upload
- Multer
- Local Storage

---

# Suggested Database Structure

## repairs
```sql
id
ticket_no
reporter
location
device_name
problem
status
created_at
updated_at