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
        GROUP BY te.id;
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
        GROUP BY te.id;
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
        GROUP BY te.id;
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
        GROUP BY te.id;
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

// Function to fetch nearby tourist entities with image handling
const getNearbyTouristEntitiesHandler = async (req, res) => {
    try {
        const id = req.params.id;
        let {
            radius = 5000
        } = req.query;
        radius = parseInt(radius, 10);
        if (isNaN(radius) || radius <= 0) {
            radius = 5000;
        }
        const entity = await getTouristEntityDetailsById(id);
        if (!entity) {
            return res.status(404).json({
                error: 'Tourist entity not found'
            });
        }
        const nearbyEntities = await getNearbyTouristEntities(entity.latitude, entity.longitude, radius, id);
        res.json({
            entity,
            nearbyEntities: mapImages(nearbyEntities)
        });
    } catch (error) {
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
            GROUP_CONCAT(DISTINCT s.name) AS season_name
        FROM tourist_entities te
        JOIN categories c ON te.category_id = c.id
        JOIN district d ON te.district_id = d.id
        LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
        LEFT JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
        LEFT JOIN seasons s ON sr.season_id = s.id
        WHERE te.id = ? AND te.published = 1
        GROUP BY te.id
    `;

    const hoursQuery = `
        SELECT day_of_week, opening_time, closing_time
        FROM operating_hours
        WHERE place_id = ?
        ORDER BY FIELD(day_of_week, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
    `;

    const [entityRows] = await pool.query(entityQuery, [id]);
    const [hoursRows] = await pool.query(hoursQuery, [id]);

    if (entityRows.length && entityRows[0].images) {
        entityRows[0].images = entityRows[0].images.split(',').map(imagePath => ({
            image_path: imagePath,
            image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
        }));
    }

    entityRows[0].operating_hours = hoursRows;

    return entityRows[0];
};

const getNearbyTouristEntities = async (latitude, longitude, distance, excludeId) => {
    
    const query = `
        SELECT te.*,
            c.name AS category_name,
            d.name AS district_name,
            ST_Distance_Sphere(
                point(te.longitude, te.latitude),
                point(?, ?)
            ) AS distance,
            (SELECT GROUP_CONCAT(image_path)
            FROM tourism_entities_images
            WHERE tourism_entities_id = te.id) AS image_path,
         GROUP_CONCAT(DISTINCT oh.day_of_week ORDER BY oh.day_of_week) AS days_of_week,
GROUP_CONCAT(DISTINCT oh.opening_time ORDER BY oh.day_of_week) AS opening_times,
GROUP_CONCAT(DISTINCT oh.closing_time ORDER BY oh.day_of_week) AS closing_times

        FROM tourist_entities te
        JOIN categories c ON te.category_id = c.id
        JOIN district d ON te.district_id = d.id
        LEFT JOIN operating_hours oh ON te.id = oh.place_id
        WHERE te.id != ? AND te.latitude BETWEEN -90 AND 90 AND te.longitude BETWEEN -180 AND 180
            AND te.published = 1
            AND ST_Distance_Sphere(
                    point(te.longitude, te.latitude), 
                    point(?, ?)
                ) < ?
        GROUP BY te.id
        ORDER BY distance;
    `;
    const [rows] = await pool.query(query, [longitude, latitude, excludeId, longitude, latitude, distance]);
     console.log("Fetched nearby tourist entities with images:", rows.map(row => ({
        name: row.name,
        images: row.images
    })));
    return rows;
};

const getCurrentlyOpenTouristEntities = async (req, res) => {
    try {
        // ตั้งค่าเวลาเป็นเวลาของประเทศไทย
        const now = new Date();
        const bangkokTime = new Date(now.toLocaleString('en-US', {
            timeZone: 'Asia/Bangkok'
        }));
        const dayOfWeek = bangkokTime.toLocaleString('en-US', {
            weekday: 'long'
        });
        const currentTime = bangkokTime.toTimeString().split(' ')[0]; // เวลาในรูปแบบ HH:MM:SS

        const query = `
            SELECT 
                te.*,
                c.name AS category_name,
                d.name AS district_name,
                GROUP_CONCAT(ti.image_path) AS images,
                GROUP_CONCAT(DISTINCT oh.day_of_week) AS days_of_week,
                GROUP_CONCAT(DISTINCT oh.opening_time) AS opening_times,
                GROUP_CONCAT(DISTINCT oh.closing_time) AS closing_times
            FROM
                tourist_entities te
            JOIN categories c ON te.category_id = c.id
            JOIN district d ON te.district_id = d.id
            LEFT JOIN operating_hours oh ON te.id = oh.place_id
            LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
            WHERE
                te.published = 1
                AND oh.day_of_week = ?
                AND oh.opening_time <= ?
                AND oh.closing_time >= ?
            GROUP BY 
                te.id
        `;

        const [rows] = await pool.query(query, [dayOfWeek, currentTime, currentTime]);

        // rows.forEach(row => {
        //     if (row.images) {
        //         row.images = row.images.split(',').map(imagePath => ({
        //             image_path: imagePath,
        //             image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
        //         }));
        //     }
        // });
        if (rows.length && rows[0].images) {
            rows[0].images = rows[0].images.split(',').map(imagePath => ({
                image_path: imagePath,
                image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
            }));
        }
        res.json(rows);
    } catch (error) {
        console.error('Error fetching currently open tourist entities:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Function to fetch tourist entities by time with image handling
const getTouristEntitiesByTime = async (req, res) => {
    try {
        const {
            day_of_week,
            opening_time,
            closing_time
        } = req.params;

        let query = `
          SELECT 
              te.*,
              d.name AS district_name,
              GROUP_CONCAT(
                  DISTINCT CONCAT(
                      oh.day_of_week, ': ', 
                      TIME_FORMAT(oh.opening_time, '%h:%i %p'), ' - ', 
                      TIME_FORMAT(oh.closing_time, '%h:%i %p')
                  ) ORDER BY oh.day_of_week SEPARATOR '\n'
              ) AS operating_hours,
              (SELECT GROUP_CONCAT(image_path) FROM tourism_entities_images WHERE tourism_entities_id = te.id) AS images
          FROM
              tourist_entities te
              JOIN district d ON te.district_id = d.id
              LEFT JOIN operating_hours oh ON te.id = oh.place_id
          WHERE
              1 = 1
      `;
        const params = [];
        if (day_of_week && opening_time && closing_time) {
            query += `
              AND oh.day_of_week = ?
              AND oh.opening_time <= ?
              AND oh.closing_time >= ?
          `;
            params.push(day_of_week, opening_time, closing_time);
        }
        query += `GROUP BY te.id`;

        const [rows] = await pool.query(query, params);
        res.json(mapImages(rows));
    } catch (error) {
        console.error('Error fetching tourist entities by time:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Function to fetch tourist entities by season real-time with image handling
const getTouristEntitiesBySeasonRealTime = async (req, res) => {
    try {
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1;
        const userLat = req.query.lat;  // Get user's latitude from query parameters
        const userLng = req.query.lng;  // Get user's longitude from query parameters

        let seasonId;
        if (month >= 3 && month <= 5) {
            seasonId = await getIdByName('ฤดูร้อน');
        } else if (month >= 6 && month <= 8) {
            seasonId = await getIdByName('ฤดูฝน');
        } else if (month >= 9 && month <= 11) {
            seasonId = await getIdByName('ฤดูหนาว');
        } else {
            seasonId = await getIdByName('ตลอดทั้งปี');
        }

        const query = `
            SELECT
                te.*, 
                MAX(s.name) AS season_name,
                MAX(d.name) AS district_name,
                GROUP_CONCAT(DISTINCT tei.image_path) AS images,
                (6371 * ACOS(COS(RADIANS(?)) * COS(RADIANS(te.latitude)) * COS(RADIANS(te.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(te.latitude)))) AS distance
            FROM
                tourist_entities te
                JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
                JOIN seasons s ON sr.season_id = s.id
                JOIN district d ON te.district_id = d.id
                LEFT JOIN tourism_entities_images tei ON te.id = tei.tourism_entities_id
            WHERE 
                te.category_id = 1  
                AND (sr.season_id = ? OR sr.season_id = (SELECT id FROM seasons WHERE name = 'ตลอดทั้งปี'))
            GROUP BY
                te.id
            ORDER BY distance ASC  -- Order by nearest distance
        `;

        const [rows] = await pool.query(query, [userLat, userLng, userLat, seasonId]);

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
        console.error('Error fetching tourist entities by season:', error);
        res.status(500).json({
            error: 'Internal server error'
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

// อันเก่าที่เกิดปัญหา get ไม่ได้
// const getTouristEntitiesBySeason = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const userLat = req.query.lat;  // Get user's latitude from query parameters
//         const userLng = req.query.lng;  // Get user's longitude from query parameters
        
//         const query = `
//             SELECT
//                 te.*,
//                 s.name AS season_name, 
//                 ti.image_path AS images,
//                 d.name AS district_name,
//                 GROUP_CONCAT(
//                     DISTINCT CONCAT(
//                         oh.day_of_week, ': ',
//                         TIME_FORMAT(oh.opening_time, '%h:%i %p'), ' - ',
//                         TIME_FORMAT(oh.closing_time, '%h:%i %p')
//                     ) ORDER BY oh.day_of_week SEPARATOR '\n'
//                 ) AS operating_hours,
//                 (6371 * ACOS(COS(RADIANS(?)) * COS(RADIANS(te.latitude)) * COS(RADIANS(te.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(te.latitude)))) AS distance
//             FROM
//                 tourist_entities te
//                 JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
//                 JOIN seasons s ON sr.season_id = s.id
//                 LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
//                 LEFT JOIN operating_hours oh ON te.id = oh.place_id
//                 JOIN district d ON te.district_id = d.id
//                 JOIN categories c ON te.category_id = c.id
//             WHERE 
//                 sr.season_id = ?
//                 AND c.name = 'สถานที่ท่องเที่ยว'
//             GROUP BY 
//                 te.id
//             ORDER BY distance ASC
//         `;
//         const [rows] = await pool.query(query, [userLat, userLng, userLat, id]);
        
//         rows.forEach(row => {
//             if (row.images) {
//                 row.images = row.images.split(',').map(imagePath => ({
//                     image_path: imagePath,
//                     image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
//                 }));
//             }
//         });
//         res.json(rows);
//     } catch (error) {
//         console.error('Error fetching tourist entities by season:', error);
//         res.status(500).json({
//             error: 'Internal server error'
//         });
//     }
// };

const getTouristEntitiesBySeason = async (req, res) => {
    try {
        const id = req.params.id;
        const query = `
            SELECT
                te.*,
                s.name AS season_name,
                GROUP_CONCAT(DISTINCT ti.image_path) AS images,
                d.name AS district_name
            FROM
                tourist_entities te
                JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
                JOIN seasons s ON sr.season_id = s.id
                LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
                LEFT JOIN operating_hours oh ON te.id = oh.place_id
                JOIN district d ON te.district_id = d.id
                JOIN categories c ON te.category_id = c.id
            WHERE 
                sr.season_id = ?
                AND c.id = 1
            GROUP BY
                te.id, s.name, d.name
        `;
        const [rows] = await pool.query(query, [id]);
         rows.forEach(row => {
            if (row.images) {
                row.images = row.images.split(',').map(imagePath => ({
                    image_path: imagePath,
                    image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
                }));
            }
        });
        console.log('Executing query:', query);
        console.log('With parameters:', [id]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching tourist entities by season:', error);
        res.status(500).json({
            error: error.message
        });
    }
};

const getTouristEntitiesByCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const query = `
            SELECT 
                te.*, 
                c.name AS category_name,
                GROUP_CONCAT(DISTINCT tei.image_path) AS image_url,
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.date_start) AS seasons
            FROM 
                tourist_entities te
                JOIN categories c ON te.category_id = c.id
                LEFT JOIN tourism_entities_images tei ON te.id = tei.tourism_entities_id
                LEFT JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
                LEFT JOIN seasons s ON sr.season_id = s.id
            WHERE 
                te.category_id = ?
            GROUP BY 
                te.id
        `;

        const hoursQuery = `
            SELECT 
                oh.place_id, 
                oh.day_of_week, 
                oh.opening_time, 
                oh.closing_time 
            FROM 
                operating_hours oh 
            JOIN tourist_entities te ON oh.place_id = te.id
            WHERE 
                te.category_id = ?
        `;

        const [rows] = await pool.query(query, [id]);
        const [hoursRows] = await pool.query(hoursQuery, [id]);

        rows.forEach(row => {
            row.operating_hours = hoursRows.filter(hour => hour.place_id === row.id);
        });

        res.json(rows);
    } catch (error) {
        console.error('Error fetching tourist entities by category:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getTouristEntitiesByDistrict = async (req, res) => {
    try {
        const id = req.params.id;
        const query = `
            SELECT
                te.id,
                te.name,
                te.description,
                te.location,
                te.latitude,
                te.longitude,
                d.name AS district_name,
                c.name AS category_name,
                GROUP_CONCAT(DISTINCT ti.image_path) AS images,
                GROUP_CONCAT(DISTINCT s.name) AS seasons
            FROM
                tourist_entities te
            INNER JOIN
                district d ON te.district_id = d.id
            INNER JOIN
                categories c ON te.category_id = c.id
            LEFT JOIN
                tourism_entities_images ti ON te.id = ti.tourism_entities_id
            LEFT JOIN
                seasons_relation sr ON te.id = sr.tourism_entities_id
            LEFT JOIN
                seasons s ON sr.season_id = s.id
            WHERE
                te.district_id = ?
            GROUP BY
                te.id;
        `;
        const [rows] = await pool.query(query, [id]);
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
        console.error('Error fetching tourist entities by district:', error);
        res.status(500).json({
            error: 'Internal server error'
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
                te.id;
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
            GROUP BY te.id;
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
                te.id;
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
                te.id;
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

// const getNearbyPlacesByCoordinates = async (req, res) => {
//     try {
//         const { lat, lng, radius = 5000 } = req.query;

//         // ตรวจสอบว่าพิกัดที่ส่งมาถูกต้องหรือไม่ (ต้องไม่เป็น undefined หรือ null)
//         if (!lat || !lng) {
//             return res.status(400).json({ error: "Invalid coordinates" });
//         }

//         // ตรวจสอบว่า radius เป็นตัวเลขที่ถูกต้องหรือไม่
//         let radiusValue = parseInt(radius, 10);
//         if (isNaN(radiusValue) || radiusValue <= 0) {
//             radiusValue = 5000; // Default to 5000 meters
//         }

//         console.log(`Fetching nearby places with coordinates lat: ${lat}, lng: ${lng}, radius: ${radiusValue} meters`);

//         const query = `
//             SELECT 
//                 te.*, 
//                 c.name AS category_name, 
//                 d.name AS district_name,
//                 GROUP_CONCAT(DISTINCT s.name ORDER BY s.id) AS season_name,
//                 GROUP_CONCAT(DISTINCT ti.image_path ORDER BY ti.id) AS images,
//                 (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
//             FROM 
//                 tourist_entities te
//             JOIN 
//                 categories c ON te.category_id = c.id
//             JOIN 
//                 district d ON te.district_id = d.id
//             LEFT JOIN 
//                 seasons_relation sr ON te.id = sr.tourism_entities_id
//             LEFT JOIN 
//                 seasons s ON sr.season_id = s.id
//             LEFT JOIN 
//                 tourism_entities_images ti ON te.id = ti.tourism_entities_id
//             WHERE 
//                 te.published = 1
//             GROUP BY 
//                 te.id
//             HAVING 
//                 distance < ?
//             ORDER BY 
//                 distance
//             LIMIT 0, 20;
//         `;

//         // Execute the query with the provided lat, lng, and radius
//         const [rows] = await pool.query(query, [lat, lng, lat, radiusValue]);

//         console.log(`Fetched ${rows.length} places within the radius.`);

//         // Process rows to format images and construct full URLs
//         rows.forEach(row => {
//             if (row.images) {
//                 row.images = row.images.split(',').map(imagePath => ({
//                     image_path: imagePath,
//                     image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
//                 }));
//             }
//         });

//         // Return the results as JSON
//         res.json(rows);
//     } catch (error) {
//         console.error('Error fetching nearby places by coordinates:', error.message, error.stack);
//         res.status(500).json({
//             error: 'Internal server error',
//             details: error.message
//         });
//     }
// };
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
            LIMIT 0, 20;
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