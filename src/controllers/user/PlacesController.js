import pool from '../../config/db.js';

const mapImages = (rows) => {
    rows.forEach(row => {
        if (row.image_path && typeof row.image_path === 'string') {
            console.log(`Processing image_path for ${row.name}: ${row.image_path}`);
            row.images = row.image_path.split(',').map(imagePath => ({
                image_path: imagePath,
                image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
            }));
        } else {
            console.log(`No valid image_path found for ${row.name}`);
            row.images = [];
        }
    });
    return rows;
};

// Function to get all tourist entities
const getAllTouristEntities = async (req, res) => {
    try {
        const query = `
        SELECT te.*, c.name AS category_name, d.name AS district_name, GROUP_CONCAT(ti.image_path) AS images
        FROM tourist_entities te
        JOIN categories c ON te.category_id = c.id
        JOIN district d ON te.district_id = d.id
        LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
        WHERE te.published = 1
        GROUP BY te.id
        ORDER BY te.created_date DESC; 
      `;
        const [rows] = await pool.query(query);
           // Perform image mapping directly inside the function
           rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
                }));
            }
        });
        res.json(rows);
    } catch (error) {
        console.error('Error fetching tourist entities:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Function to get all tourist attractions
const getAllTouristAttractions = async (req, res) => {
    try {
        const query = `
        SELECT te.*, c.name AS category_name, d.name AS district_name, GROUP_CONCAT(ti.image_path) AS images
        FROM tourist_entities te
        JOIN categories c ON te.category_id = c.id
        JOIN district d ON te.district_id = d.id
        LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
        WHERE te.published = 1 AND c.name = 'สถานที่ท่องเที่ยว'
        GROUP BY te.id
        ORDER BY te.created_date DESC;
      `;
        const [rows] = await pool.query(query);
        res.json(mapImages(rows));
    } catch (error) {
        console.error('Error fetching tourist attractions:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Function to get all accommodations
const getAllAccommodations = async (req, res) => {
    try {
        const query = `
        SELECT te.*, c.name AS category_name, d.name AS district_name, GROUP_CONCAT(ti.image_path) AS images
        FROM tourist_entities te
        JOIN categories c ON te.category_id = c.id
        JOIN district d ON te.district_id = d.id
        LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
        WHERE te.published = 1 AND c.name = 'ที่พัก'
        GROUP BY te.id
        ORDER BY te.created_date DESC;
      `;
        const [rows] = await pool.query(query);
        res.json(mapImages(rows));
    } catch (error) {
        console.error('Error fetching accommodations:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Function to get all restaurants
const getAllRestaurants = async (req, res) => {
    try {
        const query = `
        SELECT te.*, c.name AS category_name, d.name AS district_name, GROUP_CONCAT(ti.image_path) AS images
        FROM tourist_entities te
        JOIN categories c ON te.category_id = c.id
        JOIN district d ON te.district_id = d.id
        LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
        WHERE te.published = 1 AND c.name = 'ร้านอาหาร'
        GROUP BY te.id;
      `;
        const [rows] = await pool.query(query);
        res.json(mapImages(rows));
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Function to get all souvenir shops
const getAllSouvenirShops = async (req, res) => {
    try {
        const query = `
        SELECT te.*, c.name AS category_name, d.name AS district_name, GROUP_CONCAT(ti.image_path) AS images
        FROM tourist_entities te
        JOIN categories c ON te.category_id = c.id
        JOIN district d ON te.district_id = d.id
        LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
        WHERE te.published = 1 AND c.name = 'ร้านค้าของฝาก'
        GROUP BY te.id
        ORDER BY te.created_date DESC;
      `;
        const [rows] = await pool.query(query);
        res.json(mapImages(rows));
    } catch (error) {
        console.error('Error fetching souvenir shops:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getNearbyTouristEntitiesHandler = async (req, res) => {
    try {
        // รับ id ของสถานที่ท่องเที่ยวจากพารามิเตอร์ใน URL
        const id = req.params.id;

        // รับระยะทางจาก query parameter (ถ้าไม่มีให้ใช้ค่าเริ่มต้น 5000 เมตร)
        let { radius = 5000 } = req.query;

        // แปลง radius เป็นตัวเลข ถ้าไม่ถูกต้อง ให้ตั้งค่าเป็น 5000
        radius = parseInt(radius, 10);
        if (isNaN(radius) || radius <= 0) {
            radius = 5000;
        }

        // ดึงข้อมูลรายละเอียดของสถานที่จาก id ที่ระบุ
        const entity = await getTouristEntityDetailsById(id);
        if (!entity) {
            // ถ้าหาไม่เจอ ให้ส่งสถานะ 404 พร้อมข้อความ error
            return res.status(404).json({
                error: 'Tourist entity not found'
            });
        }

        // ดึงข้อมูลสถานที่ที่อยู่ใกล้กับสถานที่ที่ระบุ โดยไม่รวมสถานที่ปัจจุบัน (excludeId)
        const nearbyEntities = await getNearbyTouristEntities(entity.latitude, entity.longitude, radius, id);

        // ส่งข้อมูลสถานที่และสถานที่ใกล้เคียงกลับไปในรูปแบบ JSON
        res.json({
            entity,
            nearbyEntities: mapImages(nearbyEntities)  // แปลงข้อมูลรูปภาพให้พร้อมใช้งาน
        });

    } catch (error) {
        // จัดการข้อผิดพลาด ถ้ามีปัญหา ให้แสดงข้อความใน console และส่ง error response
        console.error('Error fetching tourist entity details:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getTouristEntityDetailsById = async (id) => {
    const entityQuery = `
        SELECT 
            te.*, 
            c.name AS category_name, 
            d.name AS district_name, 
            GROUP_CONCAT(DISTINCT ti.image_path) AS images,
            GROUP_CONCAT(DISTINCT s.name) AS season_name,
            CONCAT('[', GROUP_CONCAT(
                JSON_OBJECT(
                    'day_of_week', oh.day_of_week,
                    'opening_time', IFNULL(DATE_FORMAT(oh.opening_time, '%H:%i'), 'null'),
                    'closing_time', IFNULL(DATE_FORMAT(oh.closing_time, '%H:%i'), 'null')
                ) ORDER BY oh.day_of_week
            ), ']') AS operating_hours
        FROM 
            tourist_entities te
        JOIN categories c ON te.category_id = c.id
        JOIN district d ON te.district_id = d.id
        LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
        LEFT JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
        LEFT JOIN seasons s ON sr.season_id = s.id
        LEFT JOIN operating_hours oh ON te.id = oh.place_id
        WHERE 
            te.id = ? AND te.published = 1
        GROUP BY te.id
    `;

    // SQL Query สำหรับดึงเวลาทำการของสถานที่
    const hoursQuery = `
        SELECT day_of_week, opening_time, closing_time
        FROM operating_hours
        WHERE place_id = ?
        ORDER BY FIELD(day_of_week, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
    `;

    // รัน Query เพื่อดึงรายละเอียดสถานที่
    const [entityRows] = await pool.query(entityQuery, [id]);
    const [hoursRows] = await pool.query(hoursQuery, [id]);

    // ถ้ามีรูปภาพ ให้แปลงเป็น array ของ object พร้อม URL
    if (entityRows.length && entityRows[0].images) {
        entityRows[0].images = entityRows[0].images.split(',').map(imagePath => ({
            image_path: imagePath,
            image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
        }));
    }

    // เพิ่มข้อมูลเวลาทำการลงใน entity
    entityRows[0].operating_hours = hoursRows;

    return entityRows[0];  // คืนค่ารายละเอียดสถานที่
};

// ฟังก์ชันสำหรับดึงข้อมูลสถานที่ท่องเที่ยวที่อยู่ใกล้กับพิกัดที่กำหนด
const getNearbyTouristEntities = async (latitude, longitude, radius, excludeId) => {
    const query = `
        SELECT 
            te.*,  -- ข้อมูลทั้งหมดจากตาราง tourist_entities
            c.name AS category_name,  -- ชื่อหมวดหมู่ของสถานที่
            d.name AS district_name,  -- ชื่ออำเภอของสถานที่
            ST_Distance_Sphere(
                point(te.longitude, te.latitude),  -- จุดพิกัดของสถานที่ปัจจุบัน
                point(?, ?)  -- พิกัด (latitude, longitude) ที่ต้องการคำนวณระยะทาง
            ) AS distance,  -- คำนวณระยะทางระหว่างจุดสองจุดและเก็บเป็น 'distance'
            (SELECT GROUP_CONCAT(image_path)
             FROM tourism_entities_images
             WHERE tourism_entities_id = te.id) AS image_path,  -- รวม path รูปภาพที่เกี่ยวข้องกับสถานที่แต่ละแห่ง
            GROUP_CONCAT(DISTINCT oh.day_of_week ORDER BY oh.day_of_week) AS days_of_week,  -- รวมวันที่เปิดทำการ
            GROUP_CONCAT(DISTINCT oh.opening_time ORDER BY oh.day_of_week) AS opening_times,  -- รวมเวลาเปิดทำการตามลำดับวัน
            GROUP_CONCAT(DISTINCT oh.closing_time ORDER BY oh.day_of_week) AS closing_times  -- รวมเวลาปิดทำการตามลำดับวัน
        FROM 
            tourist_entities te  -- ตารางข้อมูลสถานที่ท่องเที่ยว
        JOIN categories c ON te.category_id = c.id  -- เชื่อมกับ categories เพื่อดึงชื่อหมวดหมู่
        JOIN district d ON te.district_id = d.id  -- เชื่อมกับ district เพื่อดึงชื่ออำเภอ
        LEFT JOIN operating_hours oh ON te.id = oh.place_id  -- เชื่อมกับ operating_hours เพื่อดึงข้อมูลเวลาทำการ (ถ้ามี)
        WHERE 
            te.id != ?  -- กรองไม่ให้แสดงสถานที่ที่มี ID ตรงกับ excludeId (สถานที่ปัจจุบัน)
            AND te.latitude BETWEEN -90 AND 90  -- ตรวจสอบว่าค่าละติจูดอยู่ในช่วงที่ถูกต้อง
            AND te.longitude BETWEEN -180 AND 180  -- ตรวจสอบว่าค่าลองจิจูดอยู่ในช่วงที่ถูกต้อง
            AND te.published = 1  -- เฉพาะสถานที่ที่เผยแพร่แล้ว
            AND ST_Distance_Sphere(
                point(te.longitude, te.latitude),  -- พิกัดของสถานที่ท่องเที่ยว
                point(?, ?)  -- พิกัดที่ใช้ค้นหา
            ) < ?  -- เงื่อนไขระยะทาง: ต้องอยู่ภายในรัศมีที่กำหนด
        GROUP BY te.id  -- จัดกลุ่มตาม ID ของสถานที่เพื่อหลีกเลี่ยงข้อมูลซ้ำ
        ORDER BY distance;  -- เรียงตามระยะทางจากใกล้ไปไกล
    `;

    // รัน Query พร้อมพารามิเตอร์ (longitude, latitude, excludeId, longitude, latitude, radius)
    const [rows] = await pool.query(query, [longitude, latitude, excludeId, longitude, latitude, radius]);

    // แสดงผลข้อมูลใน console เพื่อการ debug (แสดงชื่อและรูปภาพของสถานที่)
    console.log("Fetched nearby tourist entities with images:", rows.map(row => ({
        name: row.name,  // ชื่อสถานที่
        images: row.image_path  // รูปภาพของสถานที่
    })));

    // คืนค่ารายการสถานที่ใกล้เคียง
    return rows;
};

const getCurrentlyOpenTouristEntities = async (req, res) => {
    try {
        // ตั้งค่าเวลาให้เป็นเขตเวลาของประเทศไทย (Asia/Bangkok)
        const now = new Date();  // รับวันที่และเวลาปัจจุบัน (ของเครื่องเซิร์ฟเวอร์)
        const bangkokTime = new Date(now.toLocaleString('en-US', {
            timeZone: 'Asia/Bangkok'  // แปลงเป็นเวลาตามเขตเวลา Asia/Bangkok
        }));
        
        // ดึงวันปัจจุบันในรูปแบบข้อความ (เช่น Sunday, Monday)
        const dayOfWeek = bangkokTime.toLocaleString('en-US', {
            weekday: 'long'
        });

        // ดึงเวลาปัจจุบันในรูปแบบ HH:MM:SS
        const currentTime = bangkokTime.toTimeString().split(' ')[0];

        // คำสั่ง SQL Query สำหรับดึงข้อมูลสถานที่ที่เปิดให้บริการ
        const query = `
            SELECT 
                te.*,
                c.name AS category_name,  -- ชื่อหมวดหมู่ของสถานที่
                d.name AS district_name,  -- ชื่ออำเภอ
                GROUP_CONCAT(ti.image_path) AS images,  -- รวม path รูปภาพทั้งหมด (คั่นด้วย ',')
                GROUP_CONCAT(DISTINCT oh.day_of_week) AS days_of_week,  -- รวมวันที่เปิดให้บริการ (ไม่ซ้ำ)
                GROUP_CONCAT(DISTINCT oh.opening_time) AS opening_times,  -- รวมเวลาเปิดบริการ (ไม่ซ้ำ)
                GROUP_CONCAT(DISTINCT oh.closing_time) AS closing_times  -- รวมเวลาปิดบริการ (ไม่ซ้ำ)
            FROM
                tourist_entities te  -- ตารางสถานที่ท่องเที่ยว
            JOIN categories c ON te.category_id = c.id  -- เชื่อมกับหมวดหมู่
            JOIN district d ON te.district_id = d.id  -- เชื่อมกับอำเภอ
            LEFT JOIN operating_hours oh ON te.id = oh.place_id  -- เชื่อมกับเวลาทำการ (ถ้ามี)
            LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id  -- เชื่อมกับรูปภาพสถานที่ (ถ้ามี)
            WHERE
                te.published = 1  -- เฉพาะสถานที่ที่เผยแพร่แล้ว
                AND oh.day_of_week = ?  -- ตรวจสอบว่าตรงกับวันปัจจุบัน
                AND oh.opening_time <= ?  -- เวลาปัจจุบันอยู่หลังหรือเท่ากับเวลาเปิด
                AND oh.closing_time >= ?  -- เวลาปัจจุบันอยู่ก่อนหรือเท่ากับเวลาปิด
            GROUP BY 
                te.id  -- จัดกลุ่มตาม ID ของสถานที่
            ORDER BY te.created_date DESC;  -- เรียงตามวันที่สร้าง (ใหม่สุดก่อน)
        `;

        // รันคำสั่ง SQL Query พร้อมส่งค่า (dayOfWeek และ currentTime) เป็นพารามิเตอร์
        const [rows] = await pool.query(query, [dayOfWeek, currentTime, currentTime]);

        // แปลงข้อมูลรูปภาพจาก String เป็น Array ของ Object พร้อม URL
        rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`  // สร้าง URL สำหรับแต่ละรูปภาพ
                }));
            }
        });

        // ส่งข้อมูลที่จัดเตรียมแล้วกลับไปในรูปแบบ JSON
        res.json(rows);

    } catch (error) {
        // หากเกิดข้อผิดพลาด ให้แสดงใน console และส่งข้อความ error กลับไปยัง client
        console.error('Error fetching currently open tourist entities:', error);
        res.status(500).json({
            error: 'Internal server error'  // แจ้งว่าเกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
        });
    }
};


// Function to fetch tourist entities by time with image handling
const getTouristEntitiesByTime = async (req, res) => {
    try {
        // ดึงค่า `day_of_week`, `opening_time`, และ `closing_time` จาก `req.params` (พารามิเตอร์ใน URL)
        const {
            day_of_week,
            opening_time,
            closing_time
        } = req.params;

        // สร้างคำสั่ง SQL เบื้องต้นเพื่อดึงข้อมูลสถานที่
        let query = `
          SELECT 
              te.*,  -- ดึงข้อมูลทั้งหมดของสถานที่ท่องเที่ยวจาก tourist_entities
              d.name AS district_name,  -- ชื่ออำเภอจากตาราง district
              GROUP_CONCAT(
                  DISTINCT CONCAT(
                      oh.day_of_week, ': ',  -- แสดงวันในรูปแบบ "Sunday: "
                      TIME_FORMAT(oh.opening_time, '%h:%i %p'), ' - ',  -- แปลงเวลาเปิดในรูปแบบ 12 ชั่วโมง (AM/PM)
                      TIME_FORMAT(oh.closing_time, '%h:%i %p')  -- แปลงเวลาปิดในรูปแบบ 12 ชั่วโมง (AM/PM)
                  ) ORDER BY oh.day_of_week SEPARATOR '\n'  -- แสดงแต่ละวันโดยคั่นด้วยบรรทัดใหม่
              ) AS operating_hours,  -- เก็บเวลาทำการของแต่ละวันในคอลัมน์เดียว
              (SELECT GROUP_CONCAT(image_path) FROM tourism_entities_images WHERE tourism_entities_id = te.id) AS images  
              -- ดึงรูปภาพทั้งหมดของสถานที่ในรูปแบบ String คั่นด้วยเครื่องหมาย ','
          FROM
              tourist_entities te  -- ตารางสถานที่ท่องเที่ยว
              JOIN district d ON te.district_id = d.id  -- เชื่อมกับ district เพื่อดึงชื่ออำเภอ
              LEFT JOIN operating_hours oh ON te.id = oh.place_id  -- เชื่อมกับเวลาทำการ (ถ้ามี)
          WHERE
              1 = 1  -- เงื่อนไขเริ่มต้นเพื่อให้สามารถต่อ AND เงื่อนไขอื่นได้อย่างยืดหยุ่น
      `;

        // เก็บค่าพารามิเตอร์ที่จะใช้ใน SQL Query
        const params = [];

        // ถ้าผู้ใช้ระบุวันและช่วงเวลาในการค้นหา
        if (day_of_week && opening_time && closing_time) {
            query += `
              AND oh.day_of_week = ?  -- ตรวจสอบว่าวันตรงกับที่ระบุ
              AND oh.opening_time <= ?  -- เวลาเปิด <= เวลาที่ระบุ
              AND oh.closing_time >= ?  -- เวลาปิด >= เวลาที่ระบุ
          `;
            params.push(day_of_week, opening_time, closing_time);  // ใส่ค่าพารามิเตอร์ลงใน array `params`
        }

        // เพิ่มการจัดกลุ่มตาม `te.id` เพื่อให้แต่ละสถานที่ไม่ซ้ำกัน
        query += `GROUP BY te.id`;

        // รัน SQL Query พร้อมพารามิเตอร์
        const [rows] = await pool.query(query, params);

        // ส่งข้อมูลที่จัดการรูปภาพแล้วในรูปแบบ JSON
        res.json(mapImages(rows));
    } catch (error) {
        // หากเกิดข้อผิดพลาด แสดงใน console และส่ง error response กลับไปยัง client
        console.error('Error fetching tourist entities by time:', error);
        res.status(500).json({
            error: 'Internal server error'  // แจ้งว่ามีข้อผิดพลาดภายในเซิร์ฟเวอร์
        });
    }
};


const getTouristEntitiesBySeasonRealTime = async (req, res) => {
    try {
        // สร้างวันที่ปัจจุบัน
        const currentDate = new Date();  
        const month = currentDate.getMonth() + 1; // ดึงเดือนปัจจุบัน (เดือนเริ่มจาก 0 จึงต้อง +1)

        // กำหนด seasonId ตามเดือนปัจจุบัน
        let seasonId;
        if (month >= 3 && month <= 5) {
            // หากเดือนเป็น มีนาคม - พฤษภาคม => เป็นฤดูร้อน
            seasonId = await getIdByName('ฤดูร้อน');
        } else if (month >= 6 && month <= 8) {
            // หากเดือนเป็น มิถุนายน - สิงหาคม => เป็นฤดูฝน
            seasonId = await getIdByName('ฤดูฝน');
        } else if (month >= 9 && month <= 11) {
            // หากเดือนเป็น กันยายน - พฤศจิกายน => เป็นฤดูหนาว
            seasonId = await getIdByName('ฤดูหนาว');
        } else {
            // เดือนธันวาคม - กุมภาพันธ์ => ฤดูตลอดทั้งปี
            seasonId = await getIdByName('ตลอดทั้งปี');
        }

        // คำสั่ง SQL สำหรับดึงข้อมูล tourist entities เฉพาะที่มี category_id = 1 (สถานที่ท่องเที่ยว)
        const query = `
            SELECT
                te.*,
                MAX(s.name) AS season_name, 
                MAX(d.name) AS district_name,
                GROUP_CONCAT(DISTINCT tei.image_path) AS images  -- รวม path รูปภาพทั้งหมดเป็น String คั่นด้วย ,
            FROM
                tourist_entities te 
                JOIN seasons_relation sr ON te.id = sr.tourism_entities_id  -- เชื่อมกับ seasons_relation ตาม tourism_entities_id
                JOIN seasons s ON sr.season_id = s.id  -- เชื่อมกับ seasons เพื่อดึงข้อมูลฤดูกาล
                JOIN district d ON te.district_id = d.id  -- เชื่อมกับ district เพื่อดึงชื่ออำเภอ
                LEFT JOIN tourism_entities_images tei ON te.id = tei.tourism_entities_id  -- เชื่อมกับรูปภาพ (อาจไม่มีรูปก็ได้)
            WHERE 
                te.category_id = 1  -- กรองเฉพาะสถานที่ที่เป็นประเภทท่องเที่ยว
                AND (sr.season_id = ? OR sr.season_id = (SELECT id FROM seasons WHERE name = 'ตลอดทั้งปี'))
                -- แสดงข้อมูลเฉพาะฤดูกาลที่ตรงกับ seasonId หรือฤดู 'ตลอดทั้งปี'
            GROUP BY
                te.id  -- จัดกลุ่มตามสถานที่แต่ละแห่ง
            ORDER BY te.created_date DESC;  -- เรียงตามวันที่สร้างล่าสุดก่อน
        `;

        const [rows] = await pool.query(query, [seasonId]);  // รันคำสั่ง SQL และรับผลลัพธ์จาก database

        // แปลงข้อมูล images จาก string เป็น array ของ object พร้อม image_url
        rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
                    // สร้าง URL สำหรับแต่ละรูปภาพ
                }));
            }
        });

        // ส่งผลลัพธ์กลับไปในรูปแบบ JSON
        res.json(rows);

    } catch (error) {
        // หากเกิดข้อผิดพลาด ให้แสดงใน console และส่ง error response กลับไป
        console.error('Error fetching tourist entities by season:', error);
        res.status(500).json({
            error: 'Internal server error'  // แจ้งว่าเกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
        });
    }
};
 

const getIdByName = async (name) => {
    const [rows] = await pool.query('SELECT id FROM seasons WHERE name = ?', [name]);
    if (rows.length > 0) {
        return rows[0].id;
    } else {
        throw new Error(`Season '${name}' not found`);
    }
};

const getTouristEntitiesBySeason = async (req, res) => {
    try {
        // รับ id ของฤดูกาลจากพารามิเตอร์ใน URL
        const id = req.params.id;

        // สร้างคำสั่ง SQL สำหรับดึงข้อมูลสถานที่ท่องเที่ยวตามฤดูกาล
        const query = `
            SELECT
                te.*,  -- ดึงข้อมูลทั้งหมดจากตาราง tourist_entities
                s.name AS season_name,  -- ชื่อฤดูกาลจากตาราง seasons
                GROUP_CONCAT(DISTINCT ti.image_path) AS images,  -- รวม path ของรูปภาพทั้งหมด คั่นด้วย ','
                d.name AS district_name  -- ชื่ออำเภอจากตาราง district
            FROM
                tourist_entities te  -- ตารางข้อมูลสถานที่ท่องเที่ยว
                JOIN seasons_relation sr ON te.id = sr.tourism_entities_id  -- เชื่อมกับ seasons_relation เพื่อตรวจสอบฤดูกาล
                JOIN seasons s ON sr.season_id = s.id  -- เชื่อมกับ seasons เพื่อดึงชื่อฤดูกาล
                LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id  -- เชื่อมกับรูปภาพของสถานที่ (ถ้ามี)
                LEFT JOIN operating_hours oh ON te.id = oh.place_id  -- เชื่อมกับเวลาทำการ (ถ้ามี)
                JOIN district d ON te.district_id = d.id  -- เชื่อมกับ district เพื่อดึงชื่ออำเภอ
                JOIN categories c ON te.category_id = c.id  -- เชื่อมกับ categories เพื่อกรองเฉพาะหมวดหมู่ท่องเที่ยว
            WHERE 
                sr.season_id = ?  -- เงื่อนไข: ค้นหาตามฤดูกาลที่กำหนด (รับจากพารามิเตอร์)
                AND c.id = 1  -- เงื่อนไข: เฉพาะสถานที่ในหมวดหมู่ท่องเที่ยว (category_id = 1)
            GROUP BY
                te.id, s.name, d.name  -- จัดกลุ่มตามสถานที่, ชื่อฤดูกาล และชื่ออำเภอ
            ORDER BY te.created_date DESC;  -- เรียงตามวันที่สร้าง (ใหม่สุดก่อน)
        `;

        // รันคำสั่ง SQL พร้อมกับ id ของฤดูกาลที่รับมาจากพารามิเตอร์
        const [rows] = await pool.query(query, [id]);

        // แปลงข้อมูลรูปภาพจาก string เป็น array ของ object พร้อม URL ของรูปภาพ
        rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,  // path ของรูปภาพ
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`  // URL ของรูปภาพสำหรับแสดงใน frontend
                }));
            }
        });

        // แสดงคำสั่ง SQL และพารามิเตอร์ที่ใช้ใน console (สำหรับ debug)
        console.log('Executing query:', query);
        console.log('With parameters:', [id]);

        // ส่งข้อมูลที่ได้กลับไปในรูปแบบ JSON
        res.json(rows);

    } catch (error) {
        // ถ้ามีข้อผิดพลาด ให้แสดงข้อความใน console และส่ง error response กลับไปยัง client
        console.error('Error fetching tourist entities by season:', error);
        res.status(500).json({
            error: error.message  // ส่งข้อความข้อผิดพลาดกลับไปให้ client
        });
    }
};


const getTouristEntitiesByCategory = async (req, res) => {
    try {
        // รับ id ของหมวดหมู่จากพารามิเตอร์ใน URL
        const id = req.params.id;

        // SQL Query สำหรับดึงข้อมูลสถานที่ท่องเที่ยวตามหมวดหมู่
        const query = `
            SELECT 
                te.*,  -- ข้อมูลทั้งหมดของสถานที่จาก tourist_entities
                c.name AS category_name,  -- ชื่อหมวดหมู่จาก categories
                GROUP_CONCAT(DISTINCT tei.image_path) AS image_url,  -- รวม path ของรูปภาพทั้งหมด คั่นด้วย ','
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.date_start) AS seasons  -- รวมชื่อฤดูกาลตามลำดับวันที่เริ่มต้น
            FROM 
                tourist_entities te  -- ตารางสถานที่ท่องเที่ยว
                JOIN categories c ON te.category_id = c.id  -- เชื่อมกับ categories เพื่อดึงชื่อหมวดหมู่
                LEFT JOIN tourism_entities_images tei ON te.id = tei.tourism_entities_id  -- เชื่อมกับรูปภาพของสถานที่ (ถ้ามี)
                LEFT JOIN seasons_relation sr ON te.id = sr.tourism_entities_id  -- เชื่อมกับ seasons_relation เพื่อดูว่ามีฤดูกาลไหนบ้าง
                LEFT JOIN seasons s ON sr.season_id = s.id  -- เชื่อมกับ seasons เพื่อดึงชื่อฤดูกาล
            WHERE 
                te.category_id = ?  -- เงื่อนไข: ค้นหาสถานที่ที่ตรงกับหมวดหมู่ที่กำหนด
            GROUP BY 
                te.id  -- จัดกลุ่มตามสถานที่แต่ละแห่ง
            ORDER BY te.created_date DESC;  -- เรียงตามวันที่สร้างล่าสุด
        `;

        // SQL Query สำหรับดึงข้อมูลเวลาทำการของสถานที่ในหมวดหมู่นั้น ๆ
        const hoursQuery = `
            SELECT 
                oh.place_id,  -- ID ของสถานที่ (เชื่อมกับ tourist_entities)
                oh.day_of_week,  -- วันในสัปดาห์
                oh.opening_time,  -- เวลาเปิด
                oh.closing_time  -- เวลาปิด
            FROM 
                operating_hours oh  -- ตารางเวลาทำการ
            JOIN tourist_entities te ON oh.place_id = te.id  -- เชื่อมกับ tourist_entities ตาม place_id
            WHERE 
                te.category_id = ?  -- เงื่อนไข: เฉพาะสถานที่ในหมวดหมู่ที่กำหนด
        `;

        // รันคำสั่ง SQL Query สำหรับดึงข้อมูลสถานที่และข้อมูลเวลาทำการ
        const [rows] = await pool.query(query, [id]);  // ดึงข้อมูลสถานที่ตามหมวดหมู่
        const [hoursRows] = await pool.query(hoursQuery, [id]);  // ดึงข้อมูลเวลาทำการ

        // เชื่อมเวลาทำการเข้ากับสถานที่แต่ละแห่ง
        rows.forEach(row => {
            row.operating_hours = hoursRows.filter(hour => hour.place_id === row.id);
        });

        // ส่งข้อมูลที่จัดเตรียมแล้วกลับไปในรูปแบบ JSON
        res.json(rows);
    } catch (error) {
        // หากมีข้อผิดพลาด ให้แสดงใน console และส่ง error response กลับไปยัง client
        console.error('Error fetching tourist entities by category:', error);
        res.status(500).json({
            error: 'Internal server error'  // ส่งข้อความ error กลับไปให้ client
        });
    }
};

const getTouristEntitiesByDistrict = async (req, res) => {
    try {
        // รับ id ของอำเภอจากพารามิเตอร์ใน URL
        const id = req.params.id;

        // SQL Query สำหรับดึงข้อมูลสถานที่ท่องเที่ยวตามอำเภอ
        const query = `
            SELECT
                te.id,  -- ID ของสถานที่
                te.name,  -- ชื่อสถานที่
                te.description,  -- คำอธิบายของสถานที่
                te.location,  -- ที่อยู่ของสถานที่
                te.latitude,  -- พิกัดละติจูด
                te.longitude,  -- พิกัดลองจิจูด
                d.name AS district_name,  -- ชื่ออำเภอ
                c.name AS category_name,  -- ชื่อหมวดหมู่ของสถานที่
                GROUP_CONCAT(DISTINCT ti.image_path) AS images,  -- รวม path ของรูปภาพทั้งหมด คั่นด้วย ','
                GROUP_CONCAT(DISTINCT s.name) AS seasons  -- รวมชื่อฤดูกาลที่เกี่ยวข้องกับสถานที่
            FROM
                tourist_entities te  -- ตารางสถานที่ท่องเที่ยว
            INNER JOIN
                district d ON te.district_id = d.id  -- เชื่อมกับตาราง district เพื่อดึงชื่ออำเภอ
            INNER JOIN
                categories c ON te.category_id = c.id  -- เชื่อมกับ categories เพื่อดึงชื่อหมวดหมู่
            LEFT JOIN
                tourism_entities_images ti ON te.id = ti.tourism_entities_id  -- เชื่อมกับรูปภาพของสถานที่ (ถ้ามี)
            LEFT JOIN
                seasons_relation sr ON te.id = sr.tourism_entities_id  -- เชื่อมกับ seasons_relation เพื่อตรวจสอบฤดูกาลที่เกี่ยวข้อง
            LEFT JOIN
                seasons s ON sr.season_id = s.id  -- เชื่อมกับ seasons เพื่อดึงชื่อฤดูกาล
            WHERE
                te.district_id = ?  -- เงื่อนไข: ค้นหาสถานที่ที่อยู่ในอำเภอที่ระบุ
            GROUP BY
                te.id  -- จัดกลุ่มตามสถานที่แต่ละแห่ง
            ORDER BY te.created_date DESC;  -- เรียงตามวันที่สร้างล่าสุดก่อน
        `;

        // รันคำสั่ง SQL พร้อมส่งพารามิเตอร์ (id ของอำเภอ)
        const [rows] = await pool.query(query, [id]);

        // แปลงข้อมูลรูปภาพจาก string เป็น array ของ object พร้อม URL ของรูปภาพ
        rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,  // path ของรูปภาพ
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`  // URL ของรูปภาพสำหรับ frontend
                }));
            }
        });

        // ส่งข้อมูลที่ได้กลับไปในรูปแบบ JSON
        res.json(rows);

    } catch (error) {
        // ถ้าเกิดข้อผิดพลาด ให้แสดงใน console และส่ง error response กลับไปยัง client
        console.error('Error fetching tourist entities by district:', error);
        res.status(500).json({
            error: 'Internal server error'  // ส่งข้อความ error กลับไปให้ client
        });
    }
};


const getTouristAttractionsByDistrict = async (req, res) => {
    try {
        const districtId = req.params.district_id;

        const query = `
            SELECT 
                te.*, 
                c.name AS category_name, 
                d.name AS district_name, 
                GROUP_CONCAT(ti.image_path) AS images,
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.id) AS season_name
            FROM 
                tourist_entities te
            JOIN 
                categories c ON te.category_id = c.id
            JOIN 
                district d ON te.district_id = d.id
            LEFT JOIN 
                tourism_entities_images ti ON te.id = ti.tourism_entities_id
            LEFT JOIN 
                seasons_relation sr ON te.id = sr.tourism_entities_id
            LEFT JOIN 
                seasons s ON sr.season_id = s.id
            WHERE 
                te.published = 1 
                AND c.name = 'สถานที่ท่องเที่ยว'
                AND d.id = ?
            GROUP BY 
                te.id
            ORDER BY te.created_date DESC;
        `;

        const [rows] = await pool.query(query, [districtId]);

        // Map images and format season names
        rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
                }));
            }

            // Format season names for display (if needed)
            if (row.season_name) {
                row.season_name = row.season_name.split(',').join(', ');
            }
        });

        res.json(rows);
    } catch (error) {
        console.error('Error fetching tourist attractions by district:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};


const getAccommodationsByDistrict = async (req, res) => {
    try {
        const districtId = req.params.district_id;

        const query = `
            SELECT te.*, c.name AS category_name, d.name AS district_name, GROUP_CONCAT(ti.image_path) AS images
            FROM tourist_entities te
            JOIN categories c ON te.category_id = c.id
            JOIN district d ON te.district_id = d.id
            LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
            WHERE te.published = 1 
              AND c.name = 'ที่พัก'
              AND d.id = ?
            GROUP BY te.id
            ORDER BY te.created_date DESC;
        `;

        const [rows] = await pool.query(query, [districtId]);

        rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
                }));
            }
        });

        res.json(rows);
    } catch (error) {
        console.error('Error fetching accommodations by district:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getRestaurantsByDistrict = async (req, res) => {
    try {
        const districtId = req.params.district_id;

        const query = `
            SELECT 
                te.*, 
                c.name AS category_name, 
                d.name AS district_name, 
                GROUP_CONCAT(DISTINCT ti.image_path) AS images,
                GROUP_CONCAT(DISTINCT s.name) AS season_name
            FROM 
                tourist_entities te
            JOIN 
                categories c ON te.category_id = c.id
            JOIN 
                district d ON te.district_id = d.id
            LEFT JOIN 
                tourism_entities_images ti ON te.id = ti.tourism_entities_id
            LEFT JOIN 
                seasons_relation sr ON te.id = sr.tourism_entities_id
            LEFT JOIN 
                seasons s ON sr.season_id = s.id
            WHERE 
                te.published = 1 
                AND c.name = 'ร้านอาหาร'
                AND d.id = ?
            GROUP BY 
                te.id
            ORDER BY te.created_date DESC;
        `;

        const [rows] = await pool.query(query, [districtId]);

        rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
                }));
            }
        });

        res.json(rows);
    } catch (error) {
        console.error('Error fetching restaurants by district:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};


const getSouvenirShopsByDistrict = async (req, res) => {
    try {
        const districtId = req.params.district_id;

        const query = `
            SELECT 
                te.*, 
                c.name AS category_name, 
                d.name AS district_name, 
                GROUP_CONCAT(DISTINCT ti.image_path) AS images,
                GROUP_CONCAT(DISTINCT s.name) AS season_name
            FROM 
                tourist_entities te
            JOIN 
                categories c ON te.category_id = c.id
            JOIN 
                district d ON te.district_id = d.id
            LEFT JOIN 
                tourism_entities_images ti ON te.id = ti.tourism_entities_id
            LEFT JOIN 
                seasons_relation sr ON te.id = sr.tourism_entities_id
            LEFT JOIN 
                seasons s ON sr.season_id = s.id
            WHERE 
                te.published = 1 
                AND c.name = 'ร้านค้าของฝาก'
                AND d.id = ?
            GROUP BY 
                te.id
            ORDER BY te.created_date DESC;
        `;

        const [rows] = await pool.query(query, [districtId]);

        rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
                }));
            }
        });

        res.json(rows);
    } catch (error) {
        console.error('Error fetching souvenir shops by district:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getNearbyPlacesByCoordinates = async (req, res) => {
    try {
        const { lat, lng, radius = 5000 } = req.query;

        // ตรวจสอบว่าพิกัดที่ส่งมาถูกต้องหรือไม่ (ต้องไม่เป็น undefined หรือ null)
        if (!lat || !lng) {
            return res.status(400).json({ error: "Invalid coordinates" });
        }

        // ตรวจสอบว่า radius เป็นตัวเลขที่ถูกต้องหรือไม่
        let radiusValue = parseInt(radius, 10);
        if (isNaN(radiusValue) || radiusValue <= 0) {
            radiusValue = 5000; // Default to 5000 meters
        }

        console.log(`Fetching nearby places with coordinates lat: ${lat}, lng: ${lng}, radius: ${radiusValue} meters`);

        const query = `
            SELECT 
                te.id,
                te.name,
                te.description,
                te.location,
                te.latitude,
                te.longitude,
                te.district_id,
                te.category_id,
                te.created_date,
                te.created_by,
                te.published,
                c.name AS category_name, 
                d.name AS district_name,
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.id) AS season_name,
                GROUP_CONCAT(DISTINCT ti.image_path ORDER BY ti.id) AS images,
                ST_Distance_Sphere(
                    point(te.longitude, te.latitude),
                    point(?, ?)
                ) AS distance
            FROM 
                tourist_entities te
            JOIN 
                categories c ON te.category_id = c.id
            JOIN 
                district d ON te.district_id = d.id
            LEFT JOIN 
                seasons_relation sr ON te.id = sr.tourism_entities_id
            LEFT JOIN 
                seasons s ON sr.season_id = s.id
            LEFT JOIN 
                tourism_entities_images ti ON te.id = ti.tourism_entities_id
            WHERE 
                te.published = 1
            GROUP BY 
                te.id, 
                te.name, 
                te.description, 
                te.location, 
                te.latitude, 
                te.longitude, 
                te.district_id, 
                te.category_id, 
                te.created_date, 
                te.created_by, 
                te.published, 
                c.name, 
                d.name
            HAVING 
                distance < ?
            ORDER BY 
                distance
        `;

        // Execute the query with the provided lat, lng, and radius
        const [rows] = await pool.query(query, [lng, lat, radiusValue]);

        console.log(`Fetched ${rows.length} places within the radius.`);

        // Process rows to format images and construct full URLs
        rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
                }));
            }
        });

        // Return the results as JSON
        res.json(rows);
    } catch (error) {
        console.error('Error fetching nearby places by coordinates:', error.message, error.stack);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};



export default {
    getAllTouristEntities,
    getAllTouristAttractions,
    getAllAccommodations,
    getAllRestaurants,
    getAllSouvenirShops,
    getNearbyTouristEntitiesHandler,
    getCurrentlyOpenTouristEntities,
    getTouristEntitiesByTime,
    getTouristEntitiesBySeasonRealTime,
    getTouristEntitiesBySeason,
    getTouristEntitiesByCategory,
    getTouristEntitiesByDistrict,
    getTouristAttractionsByDistrict,
    getAccommodationsByDistrict,
    getRestaurantsByDistrict,
    getSouvenirShopsByDistrict,
    getNearbyPlacesByCoordinates
};