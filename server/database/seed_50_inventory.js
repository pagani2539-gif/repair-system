const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'repair_system.db');
console.log('Connecting to db:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
});

// Enable Foreign Key support
db.run("PRAGMA foreign_keys = ON;");

const items = [
  // 1. อุปกรณ์เครือข่าย (Network Devices)
  {
    name: 'สวิตช์เครือข่าย Cisco 24-Port',
    model: 'WS-C2960X-24PD-L',
    description: 'สวิตช์เลเยอร์ 2 ความเร็ว 1G PoE+ 24 พอร์ต SFP+ 10G 2 พอร์ต กำลังไฟ PoE รวม 370W สำหรับเชื่อมต่ออุปกรณ์เครือข่ายหลัก',
    quantity: 8,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ชั้น 1 ตู้เน็ตเวิร์ก A1',
    unit_price: 45000,
    warranty_months: 36
  },
  {
    name: 'สวิตช์เครือข่าย Cisco 48-Port',
    model: 'WS-C2960X-48FPS-L',
    description: 'สวิตช์เลเยอร์ 2 ความเร็ว 1G PoE+ 48 พอร์ต SFP 1G 4 พอร์ต กำลังไฟ PoE รวม 740W สำหรับกระจายสัญญาณในพื้นที่สำนักงานขนาดใหญ่',
    quantity: 4,
    min_stock: 1,
    requires_sn: 1,
    storage_location: 'ชั้น 1 ตู้เน็ตเวิร์ก A1',
    unit_price: 85000,
    warranty_months: 36
  },
  {
    name: 'เราเตอร์ Cisco ISR 4331',
    model: 'ISR4331/K9',
    description: 'เราเตอร์ระดับองค์กรสำหรับการเชื่อมต่อ WAN/Internet สำนักงานสาขาเข้าสู่สำนักงานใหญ่ รองรับทรูพุตสูงสุด 300Mbps',
    quantity: 3,
    min_stock: 1,
    requires_sn: 1,
    storage_location: 'ชั้น 1 ตู้เน็ตเวิร์ก A2',
    unit_price: 120000,
    warranty_months: 36
  },
  {
    name: 'ไฟร์วอลล์ FortiGate 60F',
    model: 'FG-60F',
    description: 'อุปกรณ์ป้องกันความปลอดภัยเครือข่าย Fortinet FortiGate 60F สำหรับตรวจสอบแพ็กเกจข้อมูล ป้องกันภัยคุกคาม และทำ VPN สาขา',
    quantity: 5,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ชั้น 2 ตู้เซฟตี้ B1',
    unit_price: 25000,
    warranty_months: 12
  },
  {
    name: 'แอคเซสพอยต์ Aruba AP-515',
    model: 'Q9H62A',
    description: 'อุปกรณ์กระจายสัญญาณอินเทอร์เน็ตไร้สายภายนอก/ภายใน Wi-Fi 6 (802.11ax) ความเร็วสูงพิเศษ เหมาะสำหรับการใช้งานความหนาแน่นสูง',
    quantity: 15,
    min_stock: 4,
    requires_sn: 1,
    storage_location: 'ชั้น 1 ตู้เน็ตเวิร์ก A3',
    unit_price: 18500,
    warranty_months: 36
  },
  {
    name: 'สวิตช์เครือข่าย Ubiquiti EdgeSwitch 24 LITE',
    model: 'ES-24-LITE',
    description: 'สวิตช์เลเยอร์ 2/3 ขนาด 24 พอร์ตความเร็ว Gigabit ไม่รองรับ PoE ดีไซน์ประหยัดพลังงานเงียบสนิทไม่มีพัดลมรบกวน',
    quantity: 6,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ชั้น 1 ตู้เน็ตเวิร์ก A3',
    unit_price: 9500,
    warranty_months: 12
  },
  {
    name: 'เราเตอร์ MikroTik RB3011',
    model: 'RB3011UiAS-RM',
    description: 'เราเตอร์ขนาดเล็ก 10 พอร์ต Gigabit พร้อมพอร์ต SFP 1.25G รองรับการตั้งค่าโหลดบาลานซ์และการจัดการทราฟฟิกเครือข่ายสาขาย่อย',
    quantity: 7,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ชั้น 1 ตู้เน็ตเวิร์ก A4',
    unit_price: 7200,
    warranty_months: 12
  },
  {
    name: 'ตัวแปลงสัญญาณไฟเบอร์ออพติก Media Converter',
    model: 'MC-1G-SFP',
    description: 'อุปกรณ์แปลงสัญญาณจากสายใยแก้วนำแสง (Fiber Optic) ความเร็ว Gigabit 1000Mbps เป็นพอร์ตสายแลนทองแดง RJ45',
    quantity: 20,
    min_stock: 5,
    requires_sn: 1,
    storage_location: 'ชั้น 2 ตู้ B2',
    unit_price: 1500,
    warranty_months: 24
  },
  {
    name: 'แอคเซสพอยต์ไร้สาย Ruijie RG-RAP2200(F)',
    model: 'RG-RAP2200(F)',
    description: 'อุปกรณ์กระจายสัญญาณ Wi-Fi แบบติดเพดาน Dual-Band ความเร็วสูงสุด 1267Mbps บริหารจัดการผ่านระบบคลาวด์ฟรี',
    quantity: 12,
    min_stock: 3,
    requires_sn: 1,
    storage_location: 'ชั้น 1 ตู้เน็ตเวิร์ก A4',
    unit_price: 3200,
    warranty_months: 36
  },
  {
    name: 'โมดูลรับส่งสัญญาณแสง Cisco SFP+ 10G',
    model: 'SFP-10G-SR',
    description: 'โมดูลทรานซีฟเวอร์แสงความเร็ว 10Gbps ชนิด Multi-mode ระยะสายสูงสุด 300 เมตร สำหรับลิงก์ความเร็วสูงระหว่างตู้สวิตช์',
    quantity: 25,
    min_stock: 5,
    requires_sn: 1,
    storage_location: 'ชั้น 1 ตู้เน็ตเวิร์ก A2',
    unit_price: 2900,
    warranty_months: 36
  },

  // 2. เครื่องคอมพิวเตอร์และเซิร์ฟเวอร์ (Computing & Workstations)
  {
    name: 'เซิร์ฟเวอร์ Dell PowerEdge R740',
    model: 'R740-8SFF',
    description: 'เซิร์ฟเวอร์ประสิทธิภาพสูงชนิดแร็ค 2U ประมวลผลด้วย Intel Xeon Silver, RAM 64GB, HDD 1.2TB SAS 3 ลูก ทำ Raid 5 สำหรับระบบฐานข้อมูล',
    quantity: 2,
    min_stock: 1,
    requires_sn: 1,
    storage_location: 'ห้องเซิร์ฟเวอร์ ชั้น 3 ตู้ Rack 1',
    unit_price: 195000,
    warranty_months: 60
  },
  {
    name: 'เซิร์ฟเวอร์ HPE ProLiant DL360 Gen10',
    model: 'DL360-Gen10',
    description: 'เซิร์ฟเวอร์ติดตั้งในแร็คขนาด 1U รองรับระบบปฏิบัติการ Linux/Windows Server เหมาะสำหรับการทำเว็บเซิร์ฟเวอร์และแอปพลิเคชันภายใน',
    quantity: 2,
    min_stock: 1,
    requires_sn: 1,
    storage_location: 'ห้องเซิร์ฟเวอร์ ชั้น 3 ตู้ Rack 2',
    unit_price: 165000,
    warranty_months: 36
  },
  {
    name: 'โน้ตบุ๊ก Lenovo ThinkPad L14 Gen 2',
    model: 'ThinkPad L14 Gen 2',
    description: 'คอมพิวเตอร์พกพาสำหรับเจ้าหน้าที่ไอทีและวิศวกรภาคสนาม หน้าจอ 14 นิ้ว, Intel Core i5, RAM 16GB, SSD 512GB มีระบบสแกนลายนิ้วมือ',
    quantity: 10,
    min_stock: 3,
    requires_sn: 1,
    storage_location: 'ห้องไอที ชั้น 2 ตู้เก็บเครื่อง B1',
    unit_price: 28000,
    warranty_months: 36
  },
  {
    name: 'โน้ตบุ๊ก Dell Latitude 5420',
    model: 'Latitude 5420',
    description: 'คอมพิวเตอร์พกพาประสิทธิภาพสูงสำหรับผู้บริหารและผู้ควบคุมระบบความปลอดภัย เครือข่าย Intel Core i7, RAM 16GB, SSD 512GB',
    quantity: 8,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ห้องไอที ชั้น 2 ตู้เก็บเครื่อง B1',
    unit_price: 32000,
    warranty_months: 36
  },
  {
    name: 'คอมพิวเตอร์เดสก์ท็อป HP ProDesk 600 G6',
    model: 'ProDesk 600 G6 MT',
    description: 'เครื่องคอมพิวเตอร์ส่วนบุคคลตั้งโต๊ะสำหรับพนักงานปฏิบัติการทั่วไป Intel Core i3, RAM 8GB, SSD 256GB ขนาดเคสขนาดกลาง Microtower',
    quantity: 12,
    min_stock: 4,
    requires_sn: 1,
    storage_location: 'ห้องไอที ชั้น 2 ตู้เก็บเครื่อง B2',
    unit_price: 19500,
    warranty_months: 36
  },
  {
    name: 'คอมพิวเตอร์ขนาดเล็ก Intel NUC 11 Pro',
    model: 'Intel NUC 11 Pro',
    description: 'มินิพีซีขนาดเล็กสำหรับประยุกต์ใช้เป็นเครื่องควบคุมหน้าจอประชาสัมพันธ์หรือระบบนำเสนอ ข้อมูลในห้องประชุม Intel Core i5, RAM 8GB',
    quantity: 10,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ห้องไอที ชั้น 2 ตู้เก็บเครื่อง B3',
    unit_price: 16500,
    warranty_months: 36
  },
  {
    name: 'เครื่องเก็บข้อมูลเน็ตเวิร์ก NAS Synology DS920+',
    model: 'DS920+',
    description: 'อุปกรณ์จัดเก็บข้อมูลสำรองผ่านระบบเครือข่ายสำหรับสำนักงาน ขนาด 4 ช่องฮาร์ดดิสก์ รองรับการสำรองข้อมูลอัตโนมัติ',
    quantity: 3,
    min_stock: 1,
    requires_sn: 1,
    storage_location: 'ห้องเซิร์ฟเวอร์ ชั้น 3 ตู้ Rack 1',
    unit_price: 21900,
    warranty_months: 36
  },
  {
    name: 'แท็บเล็ต iPad 10.2-inch 64GB Wi-Fi',
    model: 'iPad 10.2-inch (Gen 9)',
    description: 'แท็บเล็ตหน้าจอเรตินาขนาด 10.2 นิ้ว สำหรับวิศวกรใช้กรอกใบแจ้งซ่อม ถ่ายภาพจุดเกิดเหตุ และบันทึกข้อมูลหน้างานผ่านระบบเว็บแอป',
    quantity: 8,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ห้องไอที ชั้น 2 ตู้เก็บเครื่อง B3',
    unit_price: 12900,
    warranty_months: 12
  },
  {
    name: 'หน้าจอคอมพิวเตอร์ Dell 24 นิ้ว',
    model: 'SE2422H',
    description: 'หน้าจอมอนิเตอร์ขนาดหน้าจอ 24 นิ้ว พาเนล VA ความละเอียด Full HD 1080p ถนอมสายตาสำหรับงานออฟฟิศ มีพอร์ต HDMI และ VGA',
    quantity: 15,
    min_stock: 5,
    requires_sn: 1,
    storage_location: 'ห้องไอที ชั้น 2 ชั้นวางหน้าจอ',
    unit_price: 4200,
    warranty_months: 36
  },
  {
    name: 'เครื่องสำรองไฟ APC Easy UPS 1000VA',
    model: 'BVX1000I-MS',
    description: 'เครื่องสำรองไฟระบบ Line Interactive กำลังไฟ 1000VA/600W ป้องกันไฟกระชากและไฟตกไฟเกินสำหรับเครื่องคอมพิวเตอร์สำนักงาน',
    quantity: 15,
    min_stock: 4,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง D1',
    unit_price: 3100,
    warranty_months: 24
  },

  // 3. กล้องวงจรปิดและระบบความปลอดภัย (CCTV & Security)
  {
    name: 'กล้องวงจรปิดโดม IP Hikvision 4MP',
    model: 'DS-2CD2143G2-I',
    description: 'กล้องวงจรปิดชนิด IP แบบโดม ความละเอียด 4 ล้านพิกเซล เลนส์ 2.8 มม. มีระบบอินฟราเรดระยะ 30 เมตร ทนน้ำทนฝุ่นระดับ IP67',
    quantity: 20,
    min_stock: 5,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C1',
    unit_price: 3800,
    warranty_months: 36
  },
  {
    name: 'กล้องวงจรปิดโดม IP Dahua 2MP',
    model: 'DH-IPC-HDBW1230S-S5',
    description: 'กล้องวงจรปิด IP แบบโดม ขนาดกะทัดรัด ความละเอียด 2 ล้านพิกเซล เหมาะสำหรับติดตั้งภายในอาคารสำนักงานและทางเดิน',
    quantity: 25,
    min_stock: 5,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C1',
    unit_price: 1900,
    warranty_months: 24
  },
  {
    name: 'กล้องวงจรปิดกระบอก IP Hikvision 4MP',
    model: 'DS-2CD2043G2-I',
    description: 'กล้องวงจรปิด IP ทรงกระบอก ความละเอียด 4 ล้านพิกเซล ออกแบบมาติดตั้งภายนอกอาคารและโรงจอดรถ มีฟังก์ชันจับภาพป้ายทะเบียนเบื้องต้น',
    quantity: 18,
    min_stock: 5,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C2',
    unit_price: 3950,
    warranty_months: 36
  },
  {
    name: 'เครื่องบันทึกกล้องวงจรปิด Hikvision NVR 16-Ch',
    model: 'DS-7616NI-K2',
    description: 'เครื่องบันทึกวิดีโอวงจรปิดผ่านเน็ตเวิร์ก รองรับกล้อง IP สูงสุด 16 ช่อง ความละเอียดบันทึกสูงสุด 8MP ใส่ฮาร์ดดิสก์ได้ 2 ลูก',
    quantity: 4,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C3',
    unit_price: 7500,
    warranty_months: 36
  },
  {
    name: 'เครื่องสแกนลายนิ้วมือ ZKTeco Fingerprint',
    model: 'ZKTeco F18',
    description: 'เครื่องสแกนนิ้วมือสลับเปิดปิดล็อคประตูคีย์การ์ด รองรับการบันทึกข้อมูลเวลาทำงาน ดึงข้อมูลผ่านสายแลน UTP ได้สะดวก',
    quantity: 6,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C3',
    unit_price: 5500,
    warranty_months: 12
  },
  {
    name: 'กลอนแม่เหล็กไฟฟ้า Magnetic Lock 600lbs',
    model: 'EM-600',
    description: 'ชุดกลอนล็อคแม่เหล็กไฟฟ้าแรงดึงสูง 600 ปอนด์ (270 กก.) สำหรับระบบประตูควบคุมการเข้าออกอัตโนมัติ (Access Control)',
    quantity: 12,
    min_stock: 3,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C4',
    unit_price: 1200,
    warranty_months: 12
  },
  {
    name: 'แหล่งจ่ายไฟกล้องวงจรปิด CCTV Power Supply 12V',
    model: 'PS-12V20A',
    description: 'แหล่งจ่ายไฟฟ้ารวมขนาด 12 โวลต์ 20 แอมป์ (240 วัตต์) มีระบบฟิวส์ป้องกันไฟฟ้าลัดวงจรแยกช่องละกล้อง เหมาะสำหรับระบบกล้อง 9-18 ตัว',
    quantity: 10,
    min_stock: 3,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C2',
    unit_price: 1100,
    warranty_months: 12
  },
  {
    name: 'กล้องวงจรปิดหมุนซูม PTZ Hikvision',
    model: 'DS-2DE4425IW-DE',
    description: 'กล้องวงจรปิดสปีดโดม IP ความละเอียด 4 ล้านพิกเซล สามารถหมุนแพนเอียงก้มเงย ซูมออพติคอล 25 เท่า ตรวจสอบพื้นที่มุมกว้างได้แม่นยำ',
    quantity: 3,
    min_stock: 1,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C5',
    unit_price: 18500,
    warranty_months: 36
  },
  {
    name: 'ตัวแปลงสัญญาณบาลัน CCTV Video Balun',
    model: 'BL-Passive',
    description: 'อุปกรณ์แปลงสัญญาณภาพกล้องวิดีโออนาล็อก/HD-TVI ผ่านสายแลน (UTP/Cat5e/Cat6) ระยะทางไกลสูงสุด 300 เมตร (แพ็คคู่)',
    quantity: 40,
    min_stock: 10,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C4',
    unit_price: 150,
    warranty_months: 6
  },
  {
    name: 'เซนเซอร์ตรวจจับความเคลื่อนไหว Motion Sensor PIR',
    model: 'PIR-01',
    description: 'เซนเซอร์ตรวจจับความร้อนและความเคลื่อนไหวของมนุษย์เพื่อเปิดไฟทางเดิน/แจ้งเตือนความปลอดภัย ยึดติดผนัง ปรับองศาได้',
    quantity: 15,
    min_stock: 5,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง C4',
    unit_price: 450,
    warranty_months: 12
  },

  // 4. อุปกรณ์ต่อพ่วงและสำนักงาน (Peripherals & Office Equipment)
  {
    name: 'เครื่องพิมพ์เลเซอร์ HP LaserJet Pro',
    model: 'LaserJet Pro M404dn',
    description: 'เครื่องพิมพ์เอกสารเลเซอร์ขาวดำสำหรับสำนักงาน ความเร็วพิมพ์สูงสุด 38 แผ่นต่อนาที รองรับการพิมพ์สองหน้าอัตโนมัติและเชื่อมต่อเน็ตเวิร์ก',
    quantity: 6,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง E1',
    unit_price: 11900,
    warranty_months: 36
  },
  {
    name: 'เครื่องพิมพ์แทงค์ Epson L3210 InkTank',
    model: 'Epson L3210',
    description: 'เครื่องพิมพ์สีระบบอิงค์แทงค์ มัลติฟังก์ชัน (Print/Scan/Copy) คุณภาพสูง ประหยัดค่าใช้จ่ายต่อแผ่นสำหรับงานสีทั่วไป',
    quantity: 8,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง E1',
    unit_price: 4400,
    warranty_months: 24
  },
  {
    name: 'เครื่องพิมพ์ฉลากบาร์โค้ด Brother Label Printer',
    model: 'QL-800',
    description: 'เครื่องพิมพ์ฉลากสำหรับพิมพ์สติกเกอร์ที่อยู่ รหัสทรัพย์สิน หรือบาร์โค้ดสินค้า ความร้อนโดยตรงไม่ต้องใช้หมึก ความเร็วสูง',
    quantity: 5,
    min_stock: 2,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง E2',
    unit_price: 6900,
    warranty_months: 12
  },
  {
    name: 'เครื่องสแกนบาร์โค้ด Honeywell Scanner',
    model: 'Honeywell HH360',
    description: 'เครื่องสแกนรหัสบาร์โค้ดและ QR Code เลเซอร์ความเร็วสูง แบบมือจับพร้อมสาย USB พร้อมขาตั้งปรับมุมก้มเงยอัตโนมัติ',
    quantity: 10,
    min_stock: 3,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง E2',
    unit_price: 2500,
    warranty_months: 12
  },
  {
    name: 'เครื่องฉายภาพโปรเจคเตอร์ Epson EB-X06',
    model: 'Epson EB-X06',
    description: 'เครื่องฉายโปรเจคเตอร์สำหรับนำเสนอในห้องประชุมขนาดเล็ก-กลาง ความสว่าง 3,600 ANSI Lumens ความละเอียด XGA',
    quantity: 3,
    min_stock: 1,
    requires_sn: 1,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง E3',
    unit_price: 14500,
    warranty_months: 24
  },
  {
    name: 'เมาส์ไร้สาย Logitech M220',
    model: 'Logitech M220',
    description: 'เมาส์ออพติคอลไร้สายแบบปุ่มกดเก็บเสียงเงียบสนิท แบตเตอรี่ใช้งานยาวนาน 18 เดือน เชื่อมต่อผ่านตัวรับสัญญาณ USB Nano',
    quantity: 30,
    min_stock: 10,
    requires_sn: 0,
    storage_location: 'ห้องไอที ชั้น 2 ชั้นวางอุปกรณ์เสริม',
    unit_price: 490,
    warranty_months: 12
  },
  {
    name: 'คีย์บอร์ดสาย Dell KB216 USB',
    model: 'Dell KB216 USB',
    description: 'คีย์บอร์ดมาตรฐานแบบมีสายพอร์ต USB แป้นพิมพ์อักษรไทย-อังกฤษ ทนทาน ปุ่มกดให้สัมผัสสบายเสียงเบาขณะป้อนข้อมูล',
    quantity: 25,
    min_stock: 10,
    requires_sn: 0,
    storage_location: 'ห้องไอที ชั้น 2 ชั้นวางอุปกรณ์เสริม',
    unit_price: 350,
    warranty_months: 12
  },
  {
    name: 'กล้องเว็บแคม Logitech C922 Pro Stream',
    model: 'Logitech C922',
    description: 'กล้องเว็บแคมสำหรับสตรีมมิ่งและการประชุมออนไลน์ภาพคมชัดเป็นธรรมชาติ Full HD 1080p มีไมโครโฟนสเตอริโอในตัว',
    quantity: 10,
    min_stock: 3,
    requires_sn: 1,
    storage_location: 'ห้องไอที ชั้น 2 ชั้นวางอุปกรณ์เสริม',
    unit_price: 3990,
    warranty_months: 12
  },
  {
    name: 'ฮาร์ดดิสก์พกพา External HDD WD 2TB',
    model: 'WD Elements 2TB',
    description: 'อุปกรณ์จัดเก็บข้อมูลสำรองภายนอกแบบพกพา ความจุ 2TB เชื่อมต่อรวดเร็วผ่าน USB 3.0 สำหรับเก็บข้อมูลประวัติระบบหรือภาพติดตั้ง',
    quantity: 12,
    min_stock: 4,
    requires_sn: 1,
    storage_location: 'ห้องไอที ชั้น 2 ตู้เก็บของ A1',
    unit_price: 2300,
    warranty_months: 36
  },
  {
    name: 'แฟลชไดรฟ์ USB Kingston DTX 64GB',
    model: 'Kingston DTX 64GB',
    description: 'แฟลชไดรฟ์ USB ความจุ 64GB มาตรฐาน USB 3.2 Gen 1 โอนถ่ายไฟล์ระบบ ติดตั้งโปรแกรม OS หรือสำรองข้อมูลฉุกเฉินได้รวดเร็ว',
    quantity: 50,
    min_stock: 15,
    requires_sn: 0,
    storage_location: 'ห้องไอที ชั้น 2 ตู้เก็บของ A1',
    unit_price: 199,
    warranty_months: 60
  },

  // 5. สายสัญญาณและอุปกรณ์เสริม (Cables & Accessories)
  {
    name: 'สาย Lan Link UTP Cat6 305m',
    model: 'US-9116',
    description: 'สายแลนภายนอก/ภายในอาคารมาตรฐาน Cat6 ความยาว 305 เมตรต่อม้วน สำหรับงานติดตั้งเดินสายเชื่อมต่อโครงสร้างเครือข่ายความเร็วสูง',
    quantity: 6,
    min_stock: 2,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 โซนสายเคเบิล',
    unit_price: 3800,
    warranty_months: 360
  },
  {
    name: 'สาย Fiber Patch Cord LC-LC 3m',
    model: 'FP-LCLC-3M',
    description: 'สายสัญญาณใยแก้วนำแสงไฟเบอร์แพตช์คอร์ด สำเร็จรูปหัวต่อ LC ไปยัง LC ชนิด Duplex ยาว 3 เมตร ชนิด OM3',
    quantity: 30,
    min_stock: 10,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 โซนสายเคเบิล',
    unit_price: 350,
    warranty_months: 12
  },
  {
    name: 'สายสัญญาณภาพ HDMI 2.0 5m',
    model: 'HDMI-5M',
    description: 'สายเชื่อมต่อสัญญาณภาพและเสียงระบบดิจิตอล HDMI ความยาว 5 เมตร รองรับสัญญาณ 4K HDR เสริมปลอกป้องกันคลื่นกวน',
    quantity: 20,
    min_stock: 5,
    requires_sn: 0,
    storage_location: 'ห้องไอที ชั้น 2 ชั้นวางสายเคเบิล',
    unit_price: 450,
    warranty_months: 12
  },
  {
    name: 'หัวแลนตัวผู้ RJ45 Cat6 Link',
    model: 'US-1006',
    description: 'หัวต่อพลาสติกตัวผู้มาตรฐาน Cat6 แบรนด์ Link บรรจุกล่องละ 10 ชิ้น สำหรับต่อเข้าปลายสายสัญญาณแลน UTP',
    quantity: 40,
    min_stock: 10,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 ตู้ B3',
    unit_price: 220,
    warranty_months: 120
  },
  {
    name: 'ปลั๊กไฟพ่วง Toshino 6 ช่อง',
    model: 'Toshino TS-615',
    description: 'ปลั๊กไฟพ่วงต่อพ่วงมาตรฐานความปลอดภัย มอก. มีเต้ารับ 6 ช่องพร้อมสวิตช์เปิดปิดแยกอิสระ ระบบกันไฟเกิน ความยาวสาย 3 เมตร',
    quantity: 25,
    min_stock: 8,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง D2',
    unit_price: 590,
    warranty_months: 12
  },
  {
    name: 'สายรัดพลาสติก Cable Ties 8 นิ้ว',
    model: 'CT-8INCH',
    description: 'สายเคเบิลไทร์ไนลอนเกรด A ขนาดความยาว 8 นิ้ว สีดำ (แพ็คละ 100 เส้น) สำหรับจัดเก็บสายแลนและสายไฟให้เป็นระเบียบ',
    quantity: 80,
    min_stock: 20,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 ตู้ B3',
    unit_price: 45,
    warranty_months: 0
  },
  {
    name: 'ตู้แร็คติดผนัง Server Rack Cabinet 6U',
    model: 'CH-606U',
    description: 'ตู้แร็คเหล็กพ่นสีป้องกันสนิม ขนาดกว้าง 60 ซม. ลึก 40 ซม. สูง 6U ประตูกระจกนิรภัยล็อกได้ สำหรับแขวนผนังเก็บโมเด็มสวิตช์และ NVR',
    quantity: 8,
    min_stock: 3,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 โซนขนาดใหญ่',
    unit_price: 2900,
    warranty_months: 12
  },
  {
    name: 'ขาแขวนหน้าจอมอนิเตอร์ติดผนัง TV-Wall',
    model: 'TV-WALL-MOUNT',
    description: 'อุปกรณ์ยึดผนังทีวีจอแบนและหน้าจอตรวจสอบกล้องวงจรปิด รองรับขนาดจอ 32-55 นิ้ว เหล็กหนาพิเศษรับน้ำหนักได้สูงสุด 45 กิโลกรัม',
    quantity: 12,
    min_stock: 4,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 ชั้นวาง F1',
    unit_price: 650,
    warranty_months: 12
  },
  {
    name: 'สายต่อจอภาพ VGA 1.8m',
    model: 'VGA-1.8M',
    description: 'สายเชื่อมต่อจอแสดงผลสัญญาณอนาล็อก D-Sub 15 Pin ความยาว 1.8 เมตร หัวต่อชุบทองป้องกันอิมพีแดนซ์สูงและคลื่นรบกวนภายนอก',
    quantity: 15,
    min_stock: 5,
    requires_sn: 0,
    storage_location: 'ห้องไอที ชั้น 2 ชั้นวางสายเคเบิล',
    unit_price: 150,
    warranty_months: 12
  },
  {
    name: 'ถาดสไปรท์สายใยแก้วนำแสง Splicing Tray 12 Core',
    model: 'SP-TRAY-12',
    description: 'ถาดเก็บสไปรท์รอยสลายรอยต่อสายใยแก้วนำแสง ป้องกันสายหักงอ รองรับไฟเบอร์ออพติกจำนวน 12 แกนคอร์ ป้องกันแรงกระแทก',
    quantity: 20,
    min_stock: 5,
    requires_sn: 0,
    storage_location: 'ห้องสโตร์ ชั้น 1 ตู้ B3',
    unit_price: 120,
    warranty_months: 12
  }
];

// Helper to generate unique serial numbers
function generateSerial(model, index) {
  // Extract alphanumeric uppercase from model or use prefix
  const cleanModel = model.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
  const serialNo = String(index).padStart(4, '0');
  const year = new Date().getFullYear();
  return `SN-${cleanModel}-${year}${serialNo}`;
}

// Function to seed database sequentially
function seedDatabase() {
  db.serialize(() => {
    console.log('Clearing existing inventory tables...');
    db.run('DELETE FROM inventory_instances');
    db.run('DELETE FROM inventory_transactions');
    db.run('DELETE FROM inventory', (err) => {
      if (err) {
        console.error('Error clearing inventory:', err.message);
        process.exit(1);
      }
      console.log('Inventory tables cleared successfully.');
      
      console.log(`Inserting ${items.length} inventory items...`);
      let insertStmt = db.prepare(`
        INSERT INTO inventory (name, model, description, quantity, min_stock, requires_sn, storage_location, unit_price, warranty_months)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let completed = 0;

      items.forEach((item, index) => {
        insertStmt.run(
          [
            item.name,
            item.model,
            item.description,
            item.quantity,
            item.min_stock,
            item.requires_sn,
            item.storage_location,
            item.unit_price,
            item.warranty_months
          ],
          function (err) {
            if (err) {
              console.error(`Error inserting ${item.name}:`, err.message);
              return;
            }

            const inventoryId = this.lastID;
            console.log(`[${completed + 1}/50] Inserted inventory: ${item.name} (ID: ${inventoryId})`);

            // If requires_sn is 1, insert instances
            if (item.requires_sn === 1) {
              const serials = [];
              for (let q = 1; q <= item.quantity; q++) {
                serials.push(generateSerial(item.model, index * 100 + q));
              }

              const placeholders = serials.map(() => '(?, ?, "New", "In Stock")').join(', ');
              const params = [];
              serials.forEach(sn => {
                params.push(inventoryId, sn);
              });

              db.run(`
                INSERT INTO inventory_instances (inventory_id, serial_number, condition, status)
                VALUES ${placeholders}
              `, params, function (err2) {
                if (err2) {
                  console.error(`Error inserting instances for ${item.name}:`, err2.message);
                } else {
                  console.log(`  -> Inserted ${serials.length} serial numbers for ${item.name}`);
                }
              });
            }

            // Always add transaction log
            db.run(`
              INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity_added, note)
              VALUES (?, "ADD_STOCK", ?, "นำเข้าข้อมูลอุปกรณ์เริ่มต้น (Seeding)")
            `, [inventoryId, item.quantity], function (err3) {
              if (err3) {
                console.error(`Error logging transaction for ${item.name}:`, err3.message);
              }
            });

            completed++;
            if (completed === items.length) {
              insertStmt.finalize();
              console.log('All 50 items seeded successfully!');
              db.close();
            }
          }
        );
      });
    });
  });
}

seedDatabase();
