import pool from '../../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config(); // โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env

// ฟังก์ชันสำหรับสร้างผู้ดูแลระบบใหม่
const createAdminHandler = async (req, res) => {
    const {
        username,
        password,
        name
    } = req.body; // รับข้อมูล username, password และ name จากคำขอ
    try {
        // ตรวจสอบว่ามี username ซ้ำในฐานข้อมูลหรือไม่
        const [existingAdmin] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
        if (existingAdmin.length > 0) {
            return res.status(400).json({
                error: 'Username already exists'
            }); // ถ้า username ซ้ำ ส่ง error กลับไป
        }

        // เข้ารหัสรหัสผ่านด้วย bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);
        // สร้าง object ข้อมูล admin ที่จะบันทึก
        const admin = {
            username,
            password: hashedPassword,
            name
        };
        // เรียกฟังก์ชัน createAdmin เพื่อบันทึกข้อมูลลงฐานข้อมูล
        const insertId = await createAdmin(admin);

        // สร้าง JWT token เพื่อใช้สำหรับการยืนยันตัวตน
        const token = jwt.sign({
            id: insertId,
            username
        }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
        // เก็บ token ในฐานข้อมูล
        await storeToken(insertId, token);
        // ส่ง response กลับไปยัง client ว่าสร้าง admin สำเร็จ
        res.json({
            message: 'Admin created successfully',
            id: insertId,
            token
        });
    } catch (error) {
        console.error('Error creating admin:', error); // แสดงข้อผิดพลาดใน console
        res.status(500).json({
            error: error.message
        }); // ส่งข้อผิดพลาดกลับไปยัง client
    }
};

// ฟังก์ชันบันทึกผู้ดูแลระบบใหม่ลงฐานข้อมูล
const createAdmin = async (admin) => {
    try {
        const [result] = await pool.query(
            'INSERT INTO admin (username, password, name) VALUES (?, ?, ?)',
            [admin.username, admin.password, admin.name]
        );
        return result.insertId; // ส่งคืนค่า insertId เพื่อใช้ในส่วนอื่นๆ เช่น การสร้าง JWT token
    } catch (error) {
        console.error('Error inserting admin:', error); // แสดงข้อผิดพลาดใน console
        throw new Error('Database insert failed'); // ส่งข้อผิดพลาดไปยังส่วนที่เรียกใช้
    }
};

// ฟังก์ชันสำหรับเก็บ token ลงในฐานข้อมูล
const storeToken = async (adminId, token) => {
    try {
        await pool.query(
            'INSERT INTO admin_tokens (admin_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = ?',
            [adminId, token, token] // อัปเดต token ถ้ามีข้อมูลซ้ำ
        );
    } catch (error) {
        console.error('Error storing token:', error); // แสดงข้อผิดพลาดใน console
        throw error; // ส่งข้อผิดพลาดไปยังส่วนที่เรียกใช้
    }
};

// ฟังก์ชันสำหรับเข้าสู่ระบบ
const loginHandler = async (req, res) => {
    const {
        username,
        password
    } = req.body; // รับข้อมูลจาก body ของคำขอ
    try {
        // ค้นหาผู้ดูแลระบบตาม username
        const [rows] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
        const admin = rows[0]; // ดึงข้อมูล admin จากผลลัพธ์
        if (admin && await bcrypt.compare(password, admin.password)) { // ตรวจสอบรหัสผ่าน
            // สร้าง JWT token ถ้าข้อมูลถูกต้อง
            const token = jwt.sign({
                    id: admin.id,
                    username: admin.username,
                    name: admin.name
                },
                process.env.JWT_SECRET, {
                    expiresIn: '1h'
                }
            );
            await storeToken(admin.id, token); // เก็บ token ในฐานข้อมูล
            res.json({
                token,
                name: admin.name
            }); // ส่ง token และชื่อกลับไป
        } else {
            res.status(401).json({
                error: 'Invalid username or password'
            }); // ส่ง error ถ้ารหัสไม่ถูกต้อง
        }
    } catch (error) {
        console.error('Login error:', error); // แสดงข้อผิดพลาดใน console
        res.status(500).json({
            error: error.message
        }); // ส่งข้อผิดพลาดกลับไปยัง client
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลโปรไฟล์ผู้ดูแลระบบ
const getProfileHandler = async (req, res) => {
    try {
        const adminId = req.user.id; // รับ id ของผู้ใช้จาก token
        const admin = await getAdminById(adminId); // เรียกข้อมูลผู้ดูแลระบบจากฐานข้อมูล

        if (admin) {
            res.json(admin); // ส่งข้อมูลโปรไฟล์กลับไป
        } else {
            res.status(404).json({
                error: 'Admin not found'
            }); // ถ้าไม่พบผู้ใช้ ส่ง error กลับไป
        }
    } catch (error) {
        res.status(500).json({
            error: error.message
        }); // ส่ง error ถ้ามีปัญหา
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลผู้ดูแลระบบตาม ID
const getAdminById = async (adminId) => {
    try {
        const [rows] = await pool.query('SELECT id, username, name FROM admin WHERE id = ?', [adminId]);
        return rows.length > 0 ? rows[0] : null; // ส่งข้อมูลหรือ null ถ้าไม่เจอ
    } catch (error) {
        console.error('Error fetching admin by ID:', error); // แสดงข้อผิดพลาดใน console
        throw new Error('Database query failed'); // ส่งข้อผิดพลาดไปยังส่วนที่เรียกใช้
    }
};

// ฟังก์ชันสำหรับอัปเดตโปรไฟล์
const updateProfileHandler = async (req, res) => {
    const {
        username,
        name,
        password
    } = req.body; // รับข้อมูลจาก body ของคำขอ
    const adminId = req.user.id; // รับ id ของผู้ใช้จาก token

    try {
        const [currentProfile] = await pool.query('SELECT * FROM admin WHERE id = ?', [adminId]);
        const currentAdmin = currentProfile[0]; // ดึงข้อมูลผู้ใช้ปัจจุบัน

        let updates = []; // เก็บรายการที่ต้องอัปเดต
        let values = []; // เก็บค่าที่จะใช้กับ SQL

        // ตรวจสอบและเพิ่มชื่อถ้ามีการเปลี่ยนแปลง
        if (name && name !== currentAdmin.name) {
            updates.push('name = ?');
            values.push(name);
        }

        // ตรวจสอบและเพิ่ม username ถ้ามีการเปลี่ยนแปลง
        if (username && username !== currentAdmin.username) {
            updates.push('username = ?');
            values.push(username);
        }

        // ตรวจสอบและเข้ารหัสรหัสผ่านใหม่
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            if (await bcrypt.compare(password, currentAdmin.password)) {
                return res.status(400).json({
                    error: 'New password must be different from old password'
                });
            }
            updates.push('password = ?');
            values.push(hashedPassword);
        }

        // ถ้าไม่มีรายการอัปเดต ส่ง error กลับไป
        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No updates provided or same as current values'
            });
        }

        values.push(adminId); // เพิ่ม id ของผู้ใช้ใน SQL
        const [result] = await pool.query(`UPDATE admin SET ${updates.join(', ')} WHERE id = ?`, values);

        if (result.affectedRows > 0) {
            res.json({
                message: 'Profile updated successfully'
            }); // ส่งข้อความยืนยันการอัปเดต
        } else {
            res.status(404).json({
                error: 'Admin not found'
            }); // ถ้าไม่พบผู้ใช้
        }
    } catch (error) {
        res.status(500).json({
            error: error.message
        }); // ส่ง error ถ้ามีปัญหา
    }
};

// ฟังก์ชันสำหรับตรวจสอบรหัสผ่าน
const verifyPasswordHandler = async (req, res) => {
    const {
        username,
        password
    } = req.body; // รับข้อมูลจาก body ของคำขอ
    try {
        const [rows] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
        const admin = rows[0]; // ดึงข้อมูลผู้ใช้
        if (admin && await bcrypt.compare(password, admin.password)) {
            res.json({
                verified: true
            }); // ถ้ารหัสถูกต้อง ส่งผลลัพธ์ verified
        } else {
            res.status(401).json({
                verified: false
            }); // ถ้ารหัสไม่ถูกต้อง ส่ง error
        }
    } catch (error) {
        console.error('Verify password error:', error); // แสดงข้อผิดพลาดใน console
        res.status(500).json({
            error: error.message
        }); // ส่ง error กลับไป
    }
};

// ฟังก์ชันสำหรับออกจากระบบ
const logoutHandler = async (req, res) => {
    const adminId = req.user.id; // รับ id ของผู้ใช้จาก token
    try {
        const token = req.header('Authorization') ?.split(' ')[1]; // รับ token จาก header (?.) เพื่อให้แน่ใจว่าไม่มีข้อผิดพลาดหาก Header ไม่มีข้อมูล
        if (!token) {
            return res.status(403).json({
                message: 'Access denied, no token provided.'
            }); // ถ้าไม่มี token ส่ง error
        }
        await pool.query('DELETE FROM admin_tokens WHERE admin_id = ? AND token = ?', [adminId, token]); // ลบ token
        res.json({
            message: 'Logout successful'
        }); // ส่งข้อความยืนยันการออกจากระบบ
    } catch (error) {
        console.error('Logout error:', error); // แสดงข้อผิดพลาดใน console
        res.status(500).json({
            error: error.message
        }); // ส่ง error กลับไป
    }
};

// ส่งออกฟังก์ชันทั้งหมด
export default {
    createAdminHandler,
    storeToken,
    loginHandler,
    getProfileHandler,
    verifyPasswordHandler,
    updateProfileHandler,
    logoutHandler,
};