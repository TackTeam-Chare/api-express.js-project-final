import pool from '../../config/db.js';
import District from '../auth/DistrictEntityController.js';
import Category from '../auth/CategoryEntityController.js';
import { io } from '../../app.js';
const searchTouristEntities = async (req, res) => {
    const {
        q
    } = req.query;
    try {
        const results = await search(q);
        res.json(results);
    } catch (error) {
        console.error('Error searching tourist entities:', error);
        res.status(500).json({
            error: error.message
        });
    }
};

const search = async (query) => {
    const searchQuery = `
        SELECT
            te.*,
            c.name AS category_name,
            d.name AS district_name,
            GROUP_CONCAT(ti.image_path) AS image_url
        FROM
            tourist_entities te
        JOIN
            categories c ON te.category_id = c.id
        JOIN
            district d ON te.district_id = d.id
        LEFT JOIN
            tourism_entities_images ti ON te.id = ti.tourism_entities_id
        WHERE
            te.name LIKE ? OR te.description LIKE ? OR c.name LIKE ? OR d.name LIKE ?
        GROUP BY
            te.id
    `;
    const [rows] = await pool.query(searchQuery, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);

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
            res.status(404).json({ error: 'Tourist entity not found' });
        }
    } catch (error) {
        console.error('Error fetching tourist entity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



  


const deleteTouristEntity = async (req, res) => {
    const id = req.params.id;
    try {
        const affectedRows = await remove(id);
        if (affectedRows > 0) {
            res.json({
                message: `Tourist entity with ID ${id} deleted successfully`
            });
        } else {
            res.status(404).json({
                error: 'Tourist entity not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

const remove = async (id) => {
    try {
        const result = await pool.query('DELETE FROM tourist_entities WHERE id = ?', [id]);
        return result[0].affectedRows;
    } catch (error) {
        throw error;
    }
};

const createTouristEntity = async (req, res) => { 
    const touristEntity = req.body;
    const imagePaths = req.files ? req.files.map(file => file.filename) : [];
    const {
        district_name,
        category_name,
        season_ids,
        operating_hours
    } = touristEntity;

    // Log ข้อมูลที่ได้รับจาก request
    console.log('Received Data:', touristEntity);
    console.log('Image Paths:', imagePaths);
    console.log('Operating Hours:', operating_hours);

    // Validation: Check for required fields
    if (!touristEntity.name || !touristEntity.description || !touristEntity.location) {
        console.log('Missing required fields');
        return res.status(400).json({
            error: 'Name, description, and location are required.'
        });
    }

    // Validation: Check for duplicate name
    try {
        const [existingEntity] = await pool.query('SELECT id FROM tourist_entities WHERE name = ?', [touristEntity.name]);
        if (existingEntity.length > 0) {
            console.log('Duplicate name found:', touristEntity.name);
            return res.status(409).json({
                error: 'A tourist entity with this name already exists. Please choose a different name.'
            });
        }
    } catch (error) {
        console.error('Error checking for duplicate name:', error);
        return res.status(500).json({
            error: 'Error checking for duplicate name.'
        });
    }

    try {
        const districtId = await District.getIdByName(district_name);
        const categoryId = await Category.getIdByName(category_name);

        touristEntity.district_id = districtId;
        touristEntity.category_id = categoryId;
        touristEntity.created_by = req.user.id;

        console.log('Creating tourist entity:', touristEntity);
         // ตรวจสอบและแปลง season_ids เป็น array
        const seasonIdsArray = Array.isArray(season_ids) ? season_ids : season_ids.split(',').map(Number); 

        const insertId = await create(touristEntity, imagePaths, seasonIdsArray, operating_hours);
        const newTouristEntity = {
            id: insertId,
            name: touristEntity.name,
            category_name: category_name,
            images: imagePaths.map(path => ({ image_url: `/uploads/${path}` })),
            location: touristEntity.location
        };

        io.emit('newTouristEntity', newTouristEntity);
        console.log('Tourist entity created with ID:', insertId);

        res.json({
            message: 'Tourist entity created successfully',
            id: insertId
        });
    } catch (error) {
        console.error('Error in createTouristEntity:', error);
        res.status(500).json({
            error: error.message
        });
    }
};

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

    const isPublished = published === 'true' ? 1 : 0;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Insert the tourist entity
        const [result] = await conn.query(
            'INSERT INTO tourist_entities (name, description, location, latitude, longitude, district_id, category_id, created_by, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, location, latitude, longitude, district_id, category_id, created_by, isPublished]
        );

        const tourismEntitiesId = result.insertId;

        // Insert images if any
        if (imagePaths && imagePaths.length > 0) {
            const imageInsertPromises = imagePaths.map(imagePath =>
                conn.query(
                    'INSERT INTO tourism_entities_images (tourism_entities_id, image_path) VALUES (?, ?)',
                    [tourismEntitiesId, imagePath]
                )
            );
            await Promise.all(imageInsertPromises);
        }

        // Insert multiple seasons (array of season_ids) only if season_ids is valid
        if (season_ids && season_ids.length > 0 && season_ids[0] !== '') {
            const validSeasonIds = season_ids.filter(id => id > 0); // Filter out invalid IDs
            if (validSeasonIds.length > 0) {
                const seasonInsertPromises = validSeasonIds.map(season_id =>
                    conn.query('INSERT INTO seasons_relation (season_id, tourism_entities_id) VALUES (?, ?)', [season_id, tourismEntitiesId])
                );
                await Promise.all(seasonInsertPromises);
            }
        }

        // Handle operating hours
        if (operating_hours) {
            let operatingHoursData;
            try {
                // If it's a JSON string, parse it
                if (typeof operating_hours === 'string') {
                    operatingHoursData = JSON.parse(operating_hours);
                } else {
                    operatingHoursData = operating_hours; // If it's an object, use it directly
                }

                await conn.query('DELETE FROM operating_hours WHERE place_id = ?', [tourismEntitiesId]); // Clear existing hours

                for (const hour of operatingHoursData) {
                    if (hour.day_of_week === 'Everyday') {
                        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                        for (const day of allDays) {
                            await conn.query(
                                'INSERT INTO operating_hours (place_id, day_of_week, opening_time, closing_time) VALUES (?, ?, ?, ?)',
                                [tourismEntitiesId, day, hour.opening_time, hour.closing_time]
                            );
                        }
                    } else if (hour.day_of_week === 'ExceptHolidays') {
                        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                        for (const weekday of weekdays) {
                            await conn.query(
                                'INSERT INTO operating_hours (place_id, day_of_week, opening_time, closing_time) VALUES (?, ?, ?, ?)',
                                [tourismEntitiesId, weekday, hour.opening_time, hour.closing_time]
                            );
                        }
                    } else {
                        await conn.query(
                            'INSERT INTO operating_hours (place_id, day_of_week, opening_time, closing_time) VALUES (?, ?, ?, ?)',
                            [tourismEntitiesId, hour.day_of_week, hour.opening_time, hour.closing_time]
                        );
                    }
                }
            } catch (error) {
                console.error('Error parsing operating_hours:', error);
                throw new Error('Invalid operating_hours format');
            }
        } else {
            console.warn('No operating_hours data provided.');
        }

        await conn.commit();
        return tourismEntitiesId;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const updateTouristEntity = async (req, res) => {
    const id = req.params.id;
    const touristEntity = req.body;
    const imagePaths = req.files ? req.files.map(file => file.filename) : [];
    const { district_name, category_name, season_ids, operating_hours } = touristEntity;

    console.log('Updating tourist entity with ID:', id);
    console.log('Received Data for Update:', touristEntity);
    console.log('Image Paths for Update:', imagePaths);
    console.log('Operating Hours for Update:', operating_hours);

    try {
        const districtId = await District.getIdByName(district_name);
        const categoryId = await Category.getIdByName(category_name);

        touristEntity.district_id = districtId;
        touristEntity.category_id = categoryId;

        // Ensure season_ids is an array
        let parsedSeasonIds = season_ids;
        if (typeof season_ids === 'string') {
            try {
                parsedSeasonIds = JSON.parse(season_ids); // Parse JSON string to array
            } catch (error) {
                console.error('Error parsing season_ids:', error);
                return res.status(400).json({ error: 'Invalid season_ids format' });
            }
        } else if (!Array.isArray(parsedSeasonIds)) {
            parsedSeasonIds = []; // fallback to an empty array if no valid data
        }

        console.log("Parsed season_ids:", parsedSeasonIds);

        const affectedRows = await update(id, touristEntity, imagePaths, parsedSeasonIds, operating_hours);

        
        if (affectedRows > 0) {
            console.log(`Tourist entity with ID ${id} updated successfully`);
             // Emit event to Socket.io for real-time update
             const newTouristEntity = {
                id: id,
                name: touristEntity.name,
                category_name: category_name,
                images: imagePaths.map(path => ({ image_url: `/uploads/${path}` })),
                location: touristEntity.location
            };

            io.emit('newTouristEntity', newTouristEntity);
            res.json({
                message: `Tourist entity with ID ${id} updated successfully`,
            });
        } else {
            console.log(`Tourist entity with ID ${id} not found`);
            res.status(404).json({ error: 'Tourist entity not found' });
        }
    } catch (error) {
        console.error('Error in updateTouristEntity:', error);
        res.status(500).json({ error: error.message });
    }
};

const update = async (id, touristEntity, imagePaths, season_ids, operating_hours) => {
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

    const isPublished = published === 'true' || published === 1 || published === '1' ? 1 : 0;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Update tourist entity details
        const [result] = await conn.query(
            'UPDATE tourist_entities SET name=?, description=?, location=?, latitude=?, longitude=?, district_id=?, category_id=?, published=? WHERE id=?',
            [name, description, location, latitude, longitude, district_id, category_id, isPublished, id]
        );

        // Update images if provided
        if (imagePaths && imagePaths.length > 0) {
            await conn.query('DELETE FROM tourism_entities_images WHERE tourism_entities_id = ?', [id]);
            const imageInsertPromises = imagePaths.map(imagePath =>
                conn.query(
                    'INSERT INTO tourism_entities_images (tourism_entities_id, image_path) VALUES (?, ?)',
                    [id, imagePath]
                )
            );
            await Promise.all(imageInsertPromises);
        }

        // Update season relation with multiple seasons
        if (season_ids && season_ids.length > 0) {
            await conn.query('DELETE FROM seasons_relation WHERE tourism_entities_id = ?', [id]);
            const seasonInsertPromises = season_ids.map(season_id =>
                conn.query(
                    'INSERT INTO seasons_relation (season_id, tourism_entities_id) VALUES (?, ?)',
                    [season_id, id]
                )
            );
            await Promise.all(seasonInsertPromises);
        }

        // Update operating hours
        if (operating_hours && typeof operating_hours === 'string' && operating_hours.length > 0) {
            try {
                const operatingHoursData = JSON.parse(operating_hours);

                await conn.query('DELETE FROM operating_hours WHERE place_id = ?', [id]);

                for (const hour of operatingHoursData) {
                    if (hour.day_of_week === 'Everyday') {
                        const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        for (const day of allDays) {
                            await conn.query(
                                'INSERT INTO operating_hours (place_id, day_of_week, opening_time, closing_time) VALUES (?, ?, ?, ?)',
                                [id, day, hour.opening_time, hour.closing_time]
                            );
                        }
                    } else if (hour.day_of_week === 'Except Holidays') {
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
                // If parsing fails, fallback to no update on operating hours
            }
        }

        await conn.commit();
        return result.affectedRows;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};



const checkDuplicateName = async (req, res) => {
    const {
        name
    } = req.query;

    try {
        // ตรวจสอบว่ามีชื่อนี้อยู่ในฐานข้อมูลไหม
        const [result] = await pool.query(
            'SELECT id FROM tourist_entities WHERE name = ?',
            [name]
        );

        if (result.length > 0) {
            return res.json({
                isDuplicate: true
            });
        } else {
            return res.json({
                isDuplicate: false
            });
        }
    } catch (error) {
        console.error('Error checking duplicate name:', error);
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