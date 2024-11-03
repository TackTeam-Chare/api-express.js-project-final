import pool from '../../config/db.js';
import District from '../auth/DistrictEntityController.js';
import Category from '../auth/CategoryEntityController.js';
import {
    io
} from '../../app.js';

const searchTouristEntities = async (req, res) => {
    // ดึงพารามิเตอร์ `q` จาก query string ของ request (เป็นคำค้นหา)
    const {
        q
    } = req.query;

    try {
        // เรียกใช้ฟังก์ชัน `search` เพื่อค้นหาข้อมูลสถานที่โดยส่งคำค้นหา `q` เข้าไป
        const results = await search(q);

        // ส่งผลลัพธ์การค้นหากลับไปยัง client ในรูปแบบ JSON
        res.json(results);
    } catch (error) {
        // แสดงข้อผิดพลาดใน console ถ้ามีปัญหาในกระบวนการค้นหา
        console.error('Error searching tourist entities:', error);

        // ส่ง response กลับไปพร้อมกับ error message และสถานะ 500 (Internal Server Error)
        res.status(500).json({
            error: error.message
        });
    }
};

const search = async (query) => {
    // คำสั่ง SQL สำหรับค้นหาข้อมูลจากฐานข้อมูล
    const searchQuery = `
        SELECT
            te.*, -- ดึงข้อมูลทั้งหมดจากตาราง tourist_entities
            c.name AS category_name, -- ชื่อหมวดหมู่ของสถานที่
            d.name AS district_name, -- ชื่ออำเภอที่สถานที่ตั้งอยู่
            GROUP_CONCAT(ti.image_path) AS image_url -- รวม path ของรูปภาพทั้งหมดเป็น string เดียว
        FROM
            tourist_entities te -- ตารางสถานที่ท่องเที่ยว
        JOIN
            categories c ON te.category_id = c.id -- เชื่อมกับตาราง categories เพื่อดึงชื่อหมวดหมู่
        JOIN
            district d ON te.district_id = d.id -- เชื่อมกับตาราง district เพื่อดึงชื่ออำเภอ
        LEFT JOIN
            tourism_entities_images ti ON te.id = ti.tourism_entities_id -- เชื่อมกับตารางรูปภาพ (ถ้ามี)
        WHERE
            te.name LIKE ? OR te.description LIKE ? OR c.name LIKE ? OR d.name LIKE ? -- เงื่อนไขการค้นหา
        GROUP BY
            te.id -- จัดกลุ่มตาม ID ของสถานที่ เพื่อไม่ให้มีข้อมูลซ้ำ
    `;

    // เรียกใช้คำสั่ง SQL โดยส่งคำค้นหาในรูปแบบที่รองรับการค้นหาแบบ partial match ด้วย `%`
    const [rows] = await pool.query(searchQuery, [
        `%${query}%`, // ค้นหาในชื่อสถานที่
        `%${query}%`, // ค้นหาในคำอธิบาย
        `%${query}%`, // ค้นหาในชื่อหมวดหมู่
        `%${query}%` // ค้นหาในชื่ออำเภอ
    ]);

    // ส่งคืนผลลัพธ์การค้นหา
    return rows;
};


const fetchTouristEntitiesWithoutImages = async (req, res) => {
    try {
        const query = `
            SELECT 
                te.*, 
                c.name AS category_name, 
                d.name AS district_name, 
                GROUP_CONCAT(DISTINCT ti.image_path) AS images,
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.date_start) AS season_name
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
            GROUP BY 
                te.id
            HAVING 
                images IS NULL OR images = '';  -- กรองเฉพาะสถานที่ที่ยังไม่มีรูปภาพ
        `;

        const [entities] = await pool.query(query);

        entities.forEach(entity => {
            if (entity.images) {
                entity.images = entity.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.BASE_URL}/uploads/${imagePath}`,
                }));
            }

            if (entity.season_name) {
                entity.season_name = entity.season_name.split(','); // แยกฤดูกาลออกเป็นอาร์เรย์
            }
        });

        res.json(entities);

    } catch (error) {
        console.error('Error fetching tourist entities:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getAllTouristEntities = async (req, res) => {
    try {
        const query = `
            SELECT 
                te.*, 
                c.name AS category_name, 
                d.name AS district_name, 
                GROUP_CONCAT(DISTINCT ti.image_path) AS images,
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.date_start) AS season_name
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
            GROUP BY 
                te.id
            ORDER BY 
                te.created_date DESC; -- เรียงจากใหม่ไปเก่า
        `;

        const [entities] = await pool.query(query);

        entities.forEach(entity => {
            if (entity.images) {
                entity.images = entity.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.BASE_URL}/uploads/${imagePath}`,
                }));
            }

            if (entity.season_name) {
                entity.season_name = entity.season_name.split(','); // แยกฤดูกาลออกเป็นอาร์เรย์
            }
        });

        res.json(entities);

    } catch (error) {
        console.error('Error fetching tourist entities:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getTouristEntityById = async (req, res) => {
    try {
        const id = req.params.id;
        const query = `
           SELECT 
    te.*, 
    c.name AS category_name, 
    d.name AS district_name, 
    GROUP_CONCAT(DISTINCT ti.image_path) AS images,
    GROUP_CONCAT(DISTINCT s.id) AS season_ids, -- แก้ไขให้ดึง ID ของฤดูกาล
    CONCAT(
        '[', 
        GROUP_CONCAT(
            DISTINCT JSON_OBJECT(
                'day_of_week', oh.day_of_week,
                'opening_time', IFNULL(DATE_FORMAT(oh.opening_time, '%H:%i'), NULL),
                'closing_time', IFNULL(DATE_FORMAT(oh.closing_time, '%H:%i'), NULL)
            ) 
        ORDER BY oh.day_of_week), 
        ']'
    ) AS operating_hours
FROM tourist_entities te
JOIN categories c ON te.category_id = c.id
JOIN district d ON te.district_id = d.id
LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
LEFT JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
LEFT JOIN seasons s ON sr.season_id = s.id
LEFT JOIN operating_hours oh ON te.id = oh.place_id
WHERE te.id = ?
GROUP BY te.id;

        `;

        const [rows] = await pool.query(query, [id]);
        let touristEntity = rows[0];

        console.log('Tourist Entity:', JSON.stringify(touristEntity, null, 2));
        console.log('Season IDs:', touristEntity.season_ids); // ตรวจสอบ Season IDs

        // ตรวจสอบและจัดการ operating_hours
        if (touristEntity && touristEntity.operating_hours) {
            try {
                const operatingHours = JSON.parse(touristEntity.operating_hours || '[]');
                touristEntity.operating_hours = operatingHours.length > 0 ? operatingHours : null;
                console.log('Operating Hours:', touristEntity.operating_hours);
            } catch (parseError) {
                console.error('Error parsing operating_hours:', parseError);
                touristEntity.operating_hours = null;
            }
        }

        // จัดการรูปภาพ
        if (touristEntity && touristEntity.images) {
            touristEntity.images = touristEntity.images.split(',').map(image => ({
                image_path: image,
                image_url: `${process.env.BASE_URL}/uploads/${image}`,
            }));
        }

        // ลบค่า null หรือ undefined ออกจากผลลัพธ์
        const cleanEntity = Object.fromEntries(
            Object.entries(touristEntity).filter(([_, value]) => value != null)
        );

        // ส่งข้อมูลกลับไปยัง Frontend เฉพาะที่มีค่า
        if (Object.keys(cleanEntity).length > 0) {
            res.json(cleanEntity);
        } else {
            res.status(404).json({
                error: 'Tourist entity not found'
            });
        }
    } catch (error) {
        console.error('Error fetching tourist entity:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const deleteTouristEntity = async (req, res) => {
    // ดึงค่า ID ของสถานที่ท่องเที่ยวจากพารามิเตอร์ URL
    const id = req.params.id;

    try {
        // เรียกฟังก์ชัน `remove` เพื่อทำการลบสถานที่ท่องเที่ยวออกจากฐานข้อมูล
        const affectedRows = await remove(id);

        // ตรวจสอบว่ามีข้อมูลที่ถูกลบหรือไม่
        if (affectedRows > 0) {
            // ถ้าลบสำเร็จ ส่งข้อความยืนยันกลับไปยัง client
            res.json({
                message: `Tourist entity with ID ${id} deleted successfully`
            });
        } else {
            // ถ้าไม่พบสถานที่ที่ต้องการลบ ส่งสถานะ 404 (ไม่พบข้อมูล)
            res.status(404).json({
                error: 'Tourist entity not found'
            });
        }
    } catch (error) {
        // ถ้ามีข้อผิดพลาด ส่งสถานะ 500 (Internal Server Error) พร้อมข้อความ error
        res.status(500).json({
            error: error.message
        });
    }
};

const remove = async (id) => {
    try {
        // รันคำสั่ง SQL เพื่อลบข้อมูลสถานที่ท่องเที่ยวตาม ID ที่ระบุ
        const result = await pool.query('DELETE FROM tourist_entities WHERE id = ?', [id]);

        // ส่งคืนจำนวนแถวที่ถูกลบ (`affectedRows`) เพื่อบอกว่ามีข้อมูลถูกลบหรือไม่
        return result[0].affectedRows;
    } catch (error) {
        // ถ้ามีข้อผิดพลาด ให้ส่ง error ไปยังส่วนที่เรียกใช้ฟังก์ชันนี้
        throw error;
    }
};

// ฟังก์ชันหลักสำหรับสร้างข้อมูลสถานที่ท่องเที่ยวใหม่
const createTouristEntity = async (req, res) => {
    // รับข้อมูลสถานที่จาก body ของคำขอ (request)
    const touristEntity = req.body;

    // ตรวจสอบว่ามีไฟล์ที่อัปโหลดหรือไม่
    // ถ้ามีจะดึงชื่อไฟล์และเก็บในรูปแบบ array ด้วย `.map()`
    const imagePaths = req.files ? req.files.map(file => file.filename) : [];

    // แยกข้อมูลสำคัญที่เกี่ยวข้องกับอำเภอ หมวดหมู่ ฤดูกาล และเวลาทำการออกมา
    const {
        district_name,
        category_name,
        season_ids,
        operating_hours
    } = touristEntity;

    console.log('Received Data:', touristEntity);
    console.log('Image Paths:', imagePaths);
    console.log('Operating Hours:', operating_hours);

    // ตรวจสอบว่ามีข้อมูลที่จำเป็นครบหรือไม่ เช่น ชื่อ คำอธิบาย และสถานที่
    if (!touristEntity.name || !touristEntity.description || !touristEntity.location) {
        console.log('Missing required fields'); 
        return res.status(400).json({
            error: 'Name, description, and location are required.' // ส่ง error ถ้าขาดข้อมูล
        });
    }

    // ตรวจสอบว่ามีชื่อสถานที่ซ้ำในฐานข้อมูลหรือไม่
    try {
        const [existingEntity] = await pool.query('SELECT id FROM tourist_entities WHERE name = ?', [touristEntity.name]); //existingEntity เป็น array ที่เก็บข้อมูลสถานที่ที่มีชื่อซ้ำในฐานข้อมูล
        if (existingEntity.length > 0) {
            console.log('Duplicate name found:', touristEntity.name);
            return res.status(409).json({
                error: 'A tourist entity with this name already exists. Please choose a different name.' // แจ้งชื่อซ้ำ
            });
        }
    } catch (error) {
        console.error('Error checking for duplicate name:', error); // แสดงข้อผิดพลาดใน console
        return res.status(500).json({
            error: 'Error checking for duplicate name.' // ส่ง error ถ้าตรวจสอบไม่สำเร็จ
        });
    }

    try {
        // ดึง ID ของอำเภอและหมวดหมู่ตามชื่อจากฐานข้อมูล
        const districtId = await District.getIdByName(district_name);
        const categoryId = await Category.getIdByName(category_name);

        // กำหนด ID ของอำเภอ, หมวดหมู่ และผู้สร้างลงใน object touristEntity
        touristEntity.district_id = districtId;
        touristEntity.category_id = categoryId;
        touristEntity.created_by = req.user.id; // ID ของผู้ใช้ที่สร้าง

        console.log('Creating tourist entity:', touristEntity);

        // ตรวจสอบว่าข้อมูล season_ids เป็น array หรือไม่ ถ้าไม่ใช่ให้แปลงเป็น array
        const seasonIdsArray = Array.isArray(season_ids) ? season_ids : season_ids.split(',').map(Number);

        // สร้างข้อมูลสถานที่พร้อมกับข้อมูลรูปภาพ ฤดูกาล และเวลาทำการ
        const insertId = await create(touristEntity, imagePaths, seasonIdsArray, operating_hours);

        // เตรียมข้อมูลสถานที่ใหม่เพื่อกระจายให้ผู้ใช้คนอื่น ๆ ผ่าน Socket.io
        const newTouristEntity = {
            id: insertId,
            name: touristEntity.name,
            category_name: category_name,
            images: imagePaths.map(path => ({
                image_url: `/uploads/${path}`
            })), // สร้าง URL ของรูปภาพ
            location: touristEntity.location
        };

        io.emit('newTouristEntity', newTouristEntity); // ส่งข้อมูลใหม่ผ่าน Socket.io
        console.log('Tourist entity created with ID:', insertId);

        // ส่ง response กลับไปบอกว่าการสร้างสำเร็จ
        res.json({
            message: 'Tourist entity created successfully',
            id: insertId
        });
    } catch (error) {
        console.error('Error in createTouristEntity:', error); // แสดงข้อผิดพลาดใน console
        res.status(500).json({
            error: error.message // ส่งข้อผิดพลาดกลับไปยัง client
        });
    }
};

// ฟังก์ชันสำหรับสร้างข้อมูลสถานที่และจัดการข้อมูลที่เกี่ยวข้องในฐานข้อมูล
const create = async (touristEntity, imagePaths, season_ids, operating_hours) => {
    const {
        name,
        description,
        location,
        latitude,
        longitude,
        district_id,
        category_id,
        created_by,
        published
    } = touristEntity;

    // ตรวจสอบว่า published เป็น 'true' หรือไม่ ถ้าใช่ให้กำหนดเป็น 1 (เผยแพร่)
    const isPublished = published === 'true' ? 1 : 0;

    // สร้างการเชื่อมต่อกับฐานข้อมูล
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction(); // เริ่มต้น transaction

        // เพิ่มข้อมูลสถานที่ลงในฐานข้อมูล
        const [result] = await conn.query(
            'INSERT INTO tourist_entities (name, description, location, latitude, longitude, district_id, category_id, created_by, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, location, latitude, longitude, district_id, category_id, created_by, isPublished]
        );

        const tourismEntitiesId = result.insertId; // เก็บ ID ของสถานที่ที่เพิ่งเพิ่ม

        // ถ้ามีรูปภาพ ให้เพิ่มลงฐานข้อมูล
        if (imagePaths && imagePaths.length > 0) {
            const imageInsertPromises = imagePaths.map(imagePath =>
                conn.query('INSERT INTO tourism_entities_images (tourism_entities_id, image_path) VALUES (?, ?)', [tourismEntitiesId, imagePath])
            );
            await Promise.all(imageInsertPromises); // รันคำสั่งทั้งหมดพร้อมกัน
        }

        // ถ้ามีฤดูกาลที่เกี่ยวข้อง ให้เพิ่มลงฐานข้อมูล
        if (season_ids && season_ids.length > 0 && season_ids[0] !== '') {
            const validSeasonIds = season_ids.filter(id => id > 0); // กรอง ID ที่ถูกต้อง
            const seasonInsertPromises = validSeasonIds.map(season_id =>
                conn.query('INSERT INTO seasons_relation (season_id, tourism_entities_id) VALUES (?, ?)', [season_id, tourismEntitiesId])
            );
            await Promise.all(seasonInsertPromises); // รันคำสั่งทั้งหมดพร้อมกัน
        }

        // จัดการเวลาทำการ
        if (operating_hours) {
            let operatingHoursData;
            try {
                // ตรวจสอบว่าเป็น JSON string หรือ object
                operatingHoursData = typeof operating_hours === 'string' ? JSON.parse(operating_hours) : operating_hours;

                // ลบข้อมูลเวลาทำการเก่าถ้าเคยมี
                await conn.query('DELETE FROM operating_hours WHERE place_id = ?', [tourismEntitiesId]);

                // เพิ่มข้อมูลเวลาทำการใหม่
                for (const hour of operatingHoursData) {
                    const days = hour.day_of_week === 'Everyday' ?
                        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] :
                        hour.day_of_week === 'ExceptHolidays' ?
                        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] :
                        [hour.day_of_week];

                    for (const day of days) {
                        await conn.query(
                            'INSERT INTO operating_hours (place_id, day_of_week, opening_time, closing_time) VALUES (?, ?, ?, ?)',
                            [tourismEntitiesId, day, hour.opening_time, hour.closing_time]
                        );
                    }
                }
            } catch (error) {
                console.error('Error parsing operating_hours:', error); // แสดงข้อผิดพลาด
                throw new Error('Invalid operating_hours format'); // ส่ง error ถ้า format ผิด
            }
        } else {
            console.warn('No operating_hours data provided.'); // แจ้งเตือนไม่มีข้อมูลเวลาทำการ
        }

        await conn.commit(); // บันทึก transaction
        return tourismEntitiesId; // ส่งคืน ID ของสถานที่ที่เพิ่ม
    } catch (error) {
        await conn.rollback(); // ยกเลิก transaction ถ้าเกิดข้อผิดพลาด
        throw error; // ส่งข้อผิดพลาดไปยังส่วนที่เรียกใช้
    } finally {
        conn.release(); // ปิดการเชื่อมต่อกับฐานข้อมูล
    }
};

const updateTouristEntity = async (req, res) => {
    // ดึงค่า ID ของสถานที่จากพารามิเตอร์ URL
    const id = req.params.id;

    // รับข้อมูลใหม่ของสถานที่จาก body ของ request
    const touristEntity = req.body;

    // ตรวจสอบว่ามีการอัปโหลดไฟล์หรือไม่ ถ้ามีจะเก็บ path ของไฟล์ใน array
    const imagePaths = req.files ? req.files.map(file => file.filename) : [];

    // แยกค่าชื่ออำเภอ หมวดหมู่ ฤดูกาล และเวลาทำการจากข้อมูลที่รับมา
    const {
        district_name,
        category_name,
        season_ids,
        operating_hours
    } = touristEntity;

    // แสดงข้อมูลการอัปเดตใน console เพื่อ debug
    console.log('Updating tourist entity with ID:', id);
    console.log('Received Data for Update:', touristEntity);
    console.log('Image Paths for Update:', imagePaths);
    console.log('Operating Hours for Update:', operating_hours);

    try {
        // ดึง ID ของอำเภอและหมวดหมู่ตามชื่อที่ระบุ
        const districtId = await District.getIdByName(district_name);
        const categoryId = await Category.getIdByName(category_name);

        // อัปเดต ID ของอำเภอและหมวดหมู่ใน object `touristEntity`
        touristEntity.district_id = districtId;
        touristEntity.category_id = categoryId;

        // ตรวจสอบว่าฤดูกาล (season_ids) เป็น array หรือไม่ ถ้าเป็น string จะ parse ให้เป็น array
        let parsedSeasonIds = season_ids;
        if (typeof season_ids === 'string') {
            try {
                parsedSeasonIds = JSON.parse(season_ids);
            } catch (error) {
                console.error('Error parsing season_ids:', error);
                return res.status(400).json({
                    error: 'Invalid season_ids format'
                });
            }
        } else if (!Array.isArray(parsedSeasonIds)) {
            parsedSeasonIds = []; // กำหนดเป็น array ว่างถ้าข้อมูลไม่ถูกต้อง
        }

        console.log("Parsed season_ids:", parsedSeasonIds);

        // เรียกฟังก์ชัน update เพื่อดำเนินการอัปเดตในฐานข้อมูล
        const affectedRows = await update(id, touristEntity, imagePaths, parsedSeasonIds, operating_hours);

        // ตรวจสอบว่ามีการอัปเดตสำเร็จหรือไม่
        if (affectedRows > 0) {
            console.log(`Tourist entity with ID ${id} updated successfully`);

            // ส่งข้อมูลการอัปเดตใหม่ผ่าน Socket.io
            const newTouristEntity = {
                id: id,
                name: touristEntity.name,
                category_name: category_name,
                images: imagePaths.map(path => ({
                    image_url: `/uploads/${path}`
                })),
                location: touristEntity.location
            };
            io.emit('newTouristEntity', newTouristEntity);

            // ส่ง response กลับไปบอกว่าอัปเดตสำเร็จ
            res.json({
                message: `Tourist entity with ID ${id} updated successfully`,
            });
        } else {
            console.log(`Tourist entity with ID ${id} not found`);
            res.status(404).json({
                error: 'Tourist entity not found'
            });
        }
    } catch (error) {
        console.error('Error in updateTouristEntity:', error);
        res.status(500).json({
            error: error.message
        });
    }
};

const update = async (id, touristEntity, imagePaths, season_ids, operating_hours) => {
    // แยกข้อมูลจาก object touristEntity ที่จะนำไปอัปเดต
    const {
        name,
        description,
        location,
        latitude,
        longitude,
        district_id,
        category_id,
        published
    } = touristEntity;

    // แปลงสถานะ `published` เป็น 1 หรือ 0 (เผยแพร่หรือไม่)
    const isPublished = published === 'true' || published === 1 || published === '1' ? 1 : 0;

    // เริ่มต้นการเชื่อมต่อกับฐานข้อมูล
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction(); // เริ่มต้น transaction

        // อัปเดตรายละเอียดของสถานที่ในฐานข้อมูล
        const [result] = await conn.query(
            'UPDATE tourist_entities SET name=?, description=?, location=?, latitude=?, longitude=?, district_id=?, category_id=?, published=? WHERE id=?',
            [name, description, location, latitude, longitude, district_id, category_id, isPublished, id]
        );

        // ถ้ามีการอัปโหลดภาพใหม่ จะลบภาพเก่าและเพิ่มภาพใหม่
        if (imagePaths && imagePaths.length > 0) {
            await conn.query('DELETE FROM tourism_entities_images WHERE tourism_entities_id = ?', [id]);
            const imageInsertPromises = imagePaths.map(imagePath =>
                conn.query(
                    'INSERT INTO tourism_entities_images (tourism_entities_id, image_path) VALUES (?, ?)',
                    [id, imagePath]
                )
            );
            await Promise.all(imageInsertPromises); // รันคำสั่งพร้อมกัน
        }

        // ถ้ามีฤดูกาลใหม่ จะลบฤดูกาลเก่าและเพิ่มใหม่
        if (season_ids && season_ids.length > 0) {
            await conn.query('DELETE FROM seasons_relation WHERE tourism_entities_id = ?', [id]);
            const seasonInsertPromises = season_ids.map(season_id =>
                conn.query(
                    'INSERT INTO seasons_relation (season_id, tourism_entities_id) VALUES (?, ?)',
                    [season_id, id]
                )
            );
            await Promise.all(seasonInsertPromises); // รันคำสั่งพร้อมกัน
        }

        // จัดการข้อมูลเวลาทำการ
        if (operating_hours && typeof operating_hours === 'string' && operating_hours.length > 0) {
            try {
                const operatingHoursData = JSON.parse(operating_hours);

                // ลบข้อมูลเวลาทำการเดิม
                await conn.query('DELETE FROM operating_hours WHERE place_id = ?', [id]);

                // เพิ่มข้อมูลเวลาทำการใหม่
                for (const hour of operatingHoursData) {
                    if (hour.day_of_week === 'Everyday') {
                        const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        for (const day of allDays) {
                            await conn.query(
                                'INSERT INTO operating_hours (place_id, day_of_week, opening_time, closing_time) VALUES (?, ?, ?, ?)',
                                [id, day, hour.opening_time, hour.closing_time]
                            );
                        }
                    } else if (hour.day_of_week === 'ExceptHolidays') {
                        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                        for (const weekday of weekdays) {
                            await conn.query(
                                'INSERT INTO operating_hours (place_id, day_of_week, opening_time, closing_time) VALUES (?, ?, ?, ?)',
                                [id, weekday, hour.opening_time, hour.closing_time]
                            );
                        }
                    } else {
                        await conn.query(
                            'INSERT INTO operating_hours (place_id, day_of_week, opening_time, closing_time) VALUES (?, ?, ?, ?)',
                            [id, hour.day_of_week, hour.opening_time, hour.closing_time]
                        );
                    }
                }
            } catch (parseError) {
                console.error('Error parsing operating_hours:', parseError);
                // ถ้าเกิดข้อผิดพลาดในการแปลง JSON จะไม่อัปเดตเวลาทำการ
            }
        }

        await conn.commit(); // บันทึกการเปลี่ยนแปลง
        return result.affectedRows; // ส่งคืนจำนวนแถวที่ถูกอัปเดต
    } catch (error) {
        await conn.rollback(); // ยกเลิกการเปลี่ยนแปลงถ้าเกิดข้อผิดพลาด
        throw error; // ส่งข้อผิดพลาดไปยังส่วนที่เรียกใช้
    } finally {
        conn.release(); // ปิดการเชื่อมต่อกับฐานข้อมูล
    }
};

// ฟังก์ชันสำหรับตรวจสอบว่ามีชื่อสถานที่ซ้ำในฐานข้อมูลหรือไม่
const checkDuplicateName = async (req, res) => {
    // ดึงค่า `name` จาก query parameters ของ request
    const {
        name
    } = req.query;

    try {
        // ค้นหาในฐานข้อมูลว่ามีสถานที่ที่มีชื่อตรงกับ `name` หรือไม่
        const [result] = await pool.query(
            'SELECT id FROM tourist_entities WHERE name = ?',
            [name] // ส่งค่าชื่อที่ต้องการตรวจสอบเป็นพารามิเตอร์
        );

        // ตรวจสอบว่ามีผลลัพธ์จากการ query หรือไม่
        if (result.length > 0) {
            // ถ้าพบข้อมูลซ้ำ ส่ง response ว่าเป็นชื่อซ้ำ (isDuplicate: true)
            return res.json({
                isDuplicate: true
            });
        } else {
            // ถ้าไม่พบข้อมูลซ้ำ ส่ง response ว่าไม่มีชื่อซ้ำ (isDuplicate: false)
            return res.json({
                isDuplicate: false
            });
        }
    } catch (error) {
        // แสดงข้อผิดพลาดใน console ถ้ามีปัญหา
        console.error('Error checking duplicate name:', error);

        // ส่ง response กลับไปพร้อมกับ error message และสถานะ 500 (Internal Server Error)
        return res.status(500).json({
            error: 'Error checking duplicate name.'
        });
    }
};


export default {
    searchTouristEntities,
    search,
    fetchTouristEntitiesWithoutImages,
    getAllTouristEntities,
    getTouristEntityById,
    createTouristEntity,
    updateTouristEntity,
    deleteTouristEntity,
    checkDuplicateName
};