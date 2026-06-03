# Repair System Backend

ระบบจัดการข้อมูลหลังบ้านสำหรับระบบแจ้งซ่อมและเคลมอุปกรณ์

## รายละเอียดทางเทคนิค
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **File Upload**: Multer

## ขั้นตอนการติดตั้ง (Installation)

1.  **เข้าสู่โฟลเดอร์ server**:
    ```bash
    cd server
    ```

2.  **ติดตั้ง dependencies**:
    ```bash
    npm install
    ```

3.  **เตรียมฐานข้อมูล**:
    - ตรวจสอบไฟล์ใน `database/init.js` เพื่อดูโครงสร้างตาราง
    - รันคำสั่งเริ่มต้น (ถ้ายังไม่มีไฟล์ `.db`):
      ```bash
      node database/init.js
      ```
    - หากมีการอัปเดตระบบ ให้รันไฟล์ migration (ถ้ามี):
      ```bash
      node ../scripts/migrate.js
      ```

4.  **เริ่มการทำงาน (Start Server)**:
    - สำหรับโหมดพัฒนา (Development):
      ```bash
      npm start
      ```
      (หรือ `node index.js`)
    - สำหรับ Production (แนะนำใช้ PM2):
      ```bash
      pm2 start index.js --name "repair-backend"
      ```

## การตั้งค่า (Configuration)
- เซิร์ฟเวอร์จะรันที่ Port: `5221` (สามารถแก้ไขได้ที่ `index.js`)
- ไฟล์ที่อัปโหลดจะถูกเก็บไว้ที่โฟลเดอร์ `uploads/`

## API Endpoints หลัก
- `GET /api/repairs`: ดึงรายการแจ้งซ่อมทั้งหมด
- `POST /api/repairs`: บันทึกการแจ้งซ่อมใหม่
- `POST /api/claims`: บันทึกการแจ้งเคลมใหม่
- `PATCH /api/repairs/:id/status`: อัปเดตสถานะงาน
- `GET /api/repairs/unread/count`: ดึงจำนวนงานที่ยังไม่ได้อ่าน
