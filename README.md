ข้อความสำหรับคัดลอก (README_DEPLOY.md):

    1 # คู่มือการติดตั้งและ Deploy ระบบซ่อมบำรุง (Repair System)
    2
    3 ## 1. เตรียมความพร้อมของเครื่องเซิร์ฟเวอร์
    4 ตรวจสอบว่าติดตั้งเครื่องมือเหล่านี้บนเซิร์ฟเวอร์แล้ว:
    5 - **Node.js (LTS version)**: ใช้จัดการฝั่ง Backend และ Build Frontend
    6 - **npm**: มาพร้อมกับ Node.js
    7 - **PM2**: สำหรับรันระบบแบบ Background (ติดตั้งด้วย `npm install -g pm2`)
    8
    9 ## 2. การเตรียมโปรเจกต์
   10 1. คัดลอกโฟลเดอร์โปรเจกต์ทั้งหมดไปยังเครื่องเซิร์ฟเวอร์
   11 2. เข้าโฟลเดอร์หลัก: `cd /path/to/ระบบซ่อมแซ่ม`
   12
   13 ## 3. การติดตั้ง Dependencies
   14 รันคำสั่งเพื่อติดตั้งไลบรารีที่จำเป็นในแต่ละส่วน:
  ติดตั้งฝั่งเซิร์ฟเวอร์
  cd server
  npm install

  ติดตั้งฝั่งไคลเอนต์
  cd ../client
  npm install

   1
   2 ## 4. การ Build ระบบ (Frontend)
   3 เราต้องเปลี่ยนจาก Development Mode เป็น Production Mode เพื่อประสิทธิภาพสูงสุด:
  cd ../client
  npm run build

   1
   2 ## 5. การตั้งค่า Backend เพื่อรองรับ Production
   3 แก้ไข `server/index.js` เพื่อให้สามารถให้บริการไฟล์ Frontend ที่ Build เสร็จแล้วได้:
   4 1. เปิดไฟล์ `server/index.js`
   5 2. เพิ่มโค้ดส่วนนี้หลังการ import และก่อนการตั้งค่า routes:
  app.use(express.static(path.join(__dirname, '../client/dist')));
  const repairRoutes = require('./routes/repairs');
  app.use('/api/repairs', repairRoutes);
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });

   1
   2 ## 6. การรันระบบด้วย PM2
   3 1. กลับไปที่โฟลเดอร์หลัก: `cd ..`
   4 2. รันคำสั่งเริ่มการทำงาน: `pm2 start server/index.js --name "repair-system"`
   5 3. บันทึกสถานะ: `pm2 save` และ `pm2 startup`
   6
   7 ## 7. ตรวจสอบการทำงาน
   8 - ดูสถานะระบบ: `pm2 status`
   9 - ดู Log: `pm2 logs repair-system`