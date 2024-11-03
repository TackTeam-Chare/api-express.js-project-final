import pool from '../../config/db.js';

const getAllFilters = async (req, res) => {
  try {
    const [seasons] = await pool.query('SELECT * FROM seasons');
    const [districts] = await pool.query('SELECT * FROM district');
    const [categories] = await pool.query('SELECT * FROM categories');

    res.json({
      seasons,
      districts,
      categories
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const getTouristEntities = async (req, res) => {
  try {
    const {
      q, // คำค้นหาที่ผู้ใช้ระบุ (เช่น ชื่อสถานที่ หรือคำอธิบาย)
      category, // ID ของหมวดหมู่
      district, // ID ของอำเภอ
      season, // ID ของฤดูกาล
      day_of_week, // วันในสัปดาห์ เช่น 'Monday'
      opening_time, // เวลาเปิด
      closing_time, // เวลาปิด
      lat, // ละติจูดของผู้ใช้
      lng, // ลองจิจูดของผู้ใช้
      radius // รัศมีในการค้นหา (เมตร)
    } = req.query;

    // สร้างคำสั่ง SQL เบื้องต้น พร้อมคำนวณระยะทางโดยใช้ ST_Distance_Sphere
    let baseQuery = `
      SELECT 
        te.id, 
        te.name, 
        te.description, 
        te.latitude, 
        te.longitude, 
        c.name AS category_name, 
        d.name AS district_name,
        GROUP_CONCAT(DISTINCT s.name ORDER BY s.id) AS season_name,  -- รวมชื่อฤดูกาล
        GROUP_CONCAT(DISTINCT ti.image_path ORDER BY ti.id) AS images,  -- รวม path ของรูปภาพ
        ST_Distance_Sphere(
          point(te.longitude, te.latitude), 
          point(?, ?)  -- พิกัดของผู้ใช้
        ) AS distance  -- คำนวณระยะทางระหว่างสถานที่กับผู้ใช้
      FROM 
        tourist_entities te
      JOIN 
        categories c ON te.category_id = c.id  -- เชื่อมกับหมวดหมู่
      JOIN 
        district d ON te.district_id = d.id  -- เชื่อมกับอำเภอ
      LEFT JOIN 
        seasons_relation sr ON te.id = sr.tourism_entities_id  -- เชื่อมกับฤดูกาล
      LEFT JOIN 
        seasons s ON sr.season_id = s.id  -- ดึงข้อมูลชื่อฤดูกาล
      LEFT JOIN 
        tourism_entities_images ti ON te.id = ti.tourism_entities_id  -- ดึงรูปภาพของสถานที่
      WHERE 
        te.published = 1  -- เฉพาะสถานที่ที่เผยแพร่แล้ว
    `;

    // เก็บพารามิเตอร์ใน array
    const params = [lng, lat]; // พิกัดของผู้ใช้ (longitude, latitude)

    // ถ้ามีคำค้นหาที่ระบุใน `q`
    if (q) {
      baseQuery += ` AND (te.name LIKE ? OR te.description LIKE ? OR c.name LIKE ? OR d.name LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); // ใช้ LIKE เพื่อค้นหาข้อมูลที่เกี่ยวข้อง
    }

    // ถ้าเลือกหมวดหมู่
    if (category) {
      baseQuery += ` AND c.id = ?`;
      params.push(category); // กรองตาม ID ของหมวดหมู่
    }

    // ถ้าเลือกอำเภอ
    if (district) {
      baseQuery += ` AND d.id = ?`;
      params.push(district); // กรองตาม ID ของอำเภอ
    }

    // ถ้าเลือกฤดูกาล
    if (season) {
      baseQuery += ` AND s.id = ? AND c.id = 1`; // หมวดหมู่ 1 คือ "สถานที่ท่องเที่ยว"
      params.push(season); // กรองตาม ID ของฤดูกาล
    }

    // กรองตามวันในสัปดาห์และเวลาทำการ
    if (day_of_week && opening_time && closing_time) {
      // เช็คว่าถ้า day_of_week เป็น Everyday
      if (day_of_week === 'Everyday') {
        baseQuery += ` AND te.id IN (
      SELECT place_id 
      FROM operating_hours 
       WHERE day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
        AND opening_time <= ? 
        AND closing_time >= ?
    )`;
        params.push(opening_time, closing_time); // ใส่พารามิเตอร์เวลาทำการ
      } else if (day_of_week === 'ExceptHolidays') {
        // เงื่อนไขเพิ่มเติมสำหรับวันจันทร์ถึงวันศุกร์ ยกเว้นเสาร์-อาทิตย์
        baseQuery += ` AND te.id IN (
          SELECT place_id 
          FROM operating_hours 
          WHERE day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') 
               AND opening_time <= ? 
        AND closing_time >= ?
        )`;
        params.push(opening_time, closing_time, opening_time, closing_time);
      } else {
        // เงื่อนไขปกติสำหรับวันอื่น ๆ ที่ไม่ใช่ Everyday
        baseQuery += ` AND te.id IN (
      SELECT place_id 
      FROM operating_hours 
      WHERE day_of_week = ? 
        AND opening_time <= ? 
        AND closing_time >= ?
    )`;
        params.push(day_of_week, opening_time, closing_time); // ใส่พารามิเตอร์เวลาทำการ
      }
    }

    // ถ้ามีระยะทางกำหนด
    if (radius) {
      baseQuery += ` HAVING distance <= ?`; // กรองเฉพาะสถานที่ที่อยู่ในรัศมี
      params.push(radius); // ใส่พารามิเตอร์รัศมี
    }

    // จัดกลุ่มตาม ID ของสถานที่เพื่อลดข้อมูลซ้ำ
    baseQuery += `
      GROUP BY 
        te.id
      ORDER BY 
        te.created_date DESC, -- เรียงจากใหม่ไปเก่า
        distance ASC;       -- แล้วเรียงตามระยะทางจากใกล้ไปไกล
    `;

    // รันคำสั่ง SQL พร้อมพารามิเตอร์ที่ระบุ
    const [rows] = await pool.query(baseQuery, params);

    // แปลงข้อมูลรูปภาพให้เป็น array ของ object พร้อม URL
    rows.forEach(row => {
      if (row.images) {
        row.images = row.images.split(',').map(imagePath => ({
          image_path: imagePath, // path ของรูปภาพ
          image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}` // URL ของรูปภาพสำหรับใช้งานใน frontend
        }));
      }
    });

    // ส่งผลลัพธ์กลับไปในรูปแบบ JSON
    res.json(rows);
  } catch (error) {
    // จัดการข้อผิดพลาด
    console.error('Error fetching tourist entities:', error.message, error.stack);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message // ส่งรายละเอียดข้อผิดพลาดกลับไป
    });
  }
};


export default {
  getTouristEntities,
  getAllFilters,
};