# คู่มือการรันระบบในโหมดใช้งานจริง (Production Deployment)

คู่มือนี้แนะนำขั้นตอนการขึ้นระบบเพื่อให้ทำงานได้อย่างเสถียร รวดเร็ว และทำงานอยู่เบื้องหลังตลอดเวลา

---

## 🏗️ 1. Build Frontend (เตรียมไฟล์หน้าเว็บ)
ขั้นตอนนี้จะแปลงโค้ด React ให้เป็นไฟล์ Static ที่ทำงานได้รวดเร็ว
1. เข้าไปที่โฟลเดอร์ `client`:
   ```bash
   cd client
   ```
2. รันคำสั่ง Build:
   ```bash
   npm run build
   ```
   *หมายเหตุ: ระบบจะสร้างโฟลเดอร์ `client/dist` ขึ้นมา ซึ่ง Server จะเรียกใช้ไฟล์จากที่นี่*

---

## 🚀 2. ติดตั้งและรันด้วย PM2 (Process Manager)
เพื่อให้ระบบรันอยู่เบื้องหลัง (Background) และ Re-start ตัวเองอัตโนมัติหากเกิดปัญหา

1. **ติดตั้ง PM2** (ทำครั้งเดียว):
   ```bash
   npm install pm2 -g
   ```

2. **สั่งรันระบบ**:
   เข้าไปที่โฟลเดอร์ `server` แล้วรันคำสั่ง:
   ```bash
   cd server
   pm2 start index.js --name "maintenance-system"
   ```

---

## 🖥️ 3. การเข้าใช้งาน (Production URL)
ในโหมดใช้งานจริง คุณไม่จำเป็นต้องเปิด Port 5222 อีกต่อไป ให้เข้าใช้งานผ่าน Port ของ Server ได้โดยตรง:
👉 **URL: [http://localhost:5221](http://localhost:5221)**

---

## 🛠️ 4. คำสั่งที่จำเป็นของ PM2
*   **ดูสถานะการทำงาน**: `pm2 status`
*   **ดู Log (ประวัติการทำงาน/Error)**: `pm2 logs maintenance-system`
*   **หยุดการทำงาน**: `pm2 stop maintenance-system`
*   **รันใหม่**: `pm2 restart maintenance-system`
*   **ลบออกจากรายการ**: `pm2 delete maintenance-system`

---

## 🛡️ 5. ตั้งค่าให้รันอัตโนมัติเมื่อเปิดเครื่อง (สำหรับ Windows)
เพื่อให้ระบบเปิดเองทันทีที่เปิดคอมพิวเตอร์:
1. ติดตั้ง Helper: `npm install pm2-windows-startup -g`
2. รันคำสั่งติดตั้ง: `pm2-startup install`
3. บันทึกสถานะปัจจุบัน: `pm2 save`

---

## 🌐 การเข้าใช้งานจากเครื่องอื่นในเครือข่าย (LAN)
1. ตรวจสอบ IP ของเครื่อง Server (เช่น `192.168.1.50`)
2. เปิด Port **5221** ที่ Windows Firewall
3. ให้เครื่องอื่นเข้าผ่าน: `http://[IP-ของ-Server]:5221`
