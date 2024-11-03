import multer from 'multer'; // นำเข้าโมดูล `multer` เพื่อใช้จัดการการอัปโหลดไฟล์
import path from 'path'; // นำเข้าโมดูล `path` เพื่อใช้จัดการเส้นทางไฟล์ (Path handling)
import {
  fileURLToPath
} from 'url'; // นำเข้า `fileURLToPath` จาก `url` เพื่อแปลง URL เป็นเส้นทางไฟล์ (file path)

// แปลง URL ของไฟล์ปัจจุบันเป็น path ของไฟล์
const __filename = fileURLToPath(import.meta.url);

// ดึง directory ของไฟล์ปัจจุบันจาก path ที่แปลงแล้ว
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  // กำหนดปลายทางที่ใช้เก็บไฟล์ที่อัปโหลด
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads'); // รวม path ไปยังโฟลเดอร์ปลายทาง
    cb(null, uploadPath); // บอก multer ให้ใช้ path นี้ในการเก็บไฟล์
  },

  // กำหนดชื่อไฟล์ที่บันทึกในโฟลเดอร์
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // ใช้ timestamp + ชื่อไฟล์เดิม เพื่อลดปัญหาชื่อซ้ำกัน
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/; // ประเภทไฟล์ที่อนุญาต
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase()); // ตรวจสอบนามสกุลไฟล์
  const mimetype = allowedTypes.test(file.mimetype); // ตรวจสอบ MIME type ของไฟล์

  if (extname && mimetype) {
    cb(null, true); // ถ้าผ่านทั้งสองเงื่อนไข อนุญาตให้อัปโหลด
  } else {
    cb(new Error('Only JPEG, JPG, PNG, and GIF files are allowed!')); // ถ้าไม่ผ่าน ส่ง error กลับ
  }
};

const upload = multer({
  storage: storage, // ใช้ตัวแปร storage ที่ตั้งค่าไว้
  limits: { fileSize: 20 * 1024 * 1024 }, // กำหนดขนาดไฟล์สูงสุด 20MB
  fileFilter: fileFilter // ใช้ฟังก์ชันกรองไฟล์
});


export default upload;