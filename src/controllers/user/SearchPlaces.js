import pool from '../../config/db.js';

  const getAllFilters = async (req, res) => {
    try {
      const [seasons] = await pool.query('SELECT * FROM seasons');
      const [districts] = await pool.query('SELECT * FROM district');
      const [categories] = await pool.query('SELECT * FROM categories');
  
      res.json({ seasons, districts, categories });
    } catch (error) {
      console.error('Error fetching filters:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
};

const getTouristEntities = async (req, res) => {
  try {
    const {
      q,
      category,
      district,
      season,
      day_of_week,
      opening_time,
      closing_time,
      lat, // User's latitude
      lng, // User's longitude
      radius
    } = req.query;

    // Base query to fetch tourist entities and calculate distance using ST_Distance_Sphere
    let baseQuery = `
      SELECT 
        te.id, 
        te.name, 
        te.description, 
        te.latitude, 
        te.longitude, 
        c.name AS category_name, 
        d.name AS district_name,
        GROUP_CONCAT(DISTINCT s.name ORDER BY s.id) AS season_name,
        GROUP_CONCAT(DISTINCT ti.image_path ORDER BY ti.id) AS images,
        ST_Distance_Sphere(
          point(te.longitude, te.latitude), 
          point(?, ?) -- User's coordinates
        ) AS distance -- Calculate distance in meters
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
    `;

    // Parameters array
    const params = [lng, lat]; // User's longitude and latitude

    // If a search query is provided (q)
    if (q) {
      baseQuery += ` AND (te.name LIKE ? OR te.description LIKE ? OR c.name LIKE ? OR d.name LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    // If a category is selected
    if (category) {
      baseQuery += ` AND c.id = ?`;
      params.push(category);
    }

    // If a district is selected
    if (district) {
      baseQuery += ` AND d.id = ?`;
      params.push(district);
    }

    // If a season is selected, ensure it's in the "สถานที่ท่องเที่ยว" category (ID 1)
    if (season) {
      baseQuery += ` AND s.id = ? AND c.id = 1`; // Category ID 1 for "สถานที่ท่องเที่ยว"
      params.push(season);
    }

    // Filter by day of the week and opening/closing times
    if (day_of_week && opening_time && closing_time) {
      baseQuery += ` AND te.id IN (
          SELECT place_id 
          FROM operating_hours 
          WHERE day_of_week = ? 
            AND opening_time <= ? 
            AND closing_time >= ?
        )`;
      params.push(day_of_week, opening_time, closing_time);
    }

    // If a radius is provided, limit results to the specified distance
    if (radius) {
      baseQuery += ` HAVING distance <= ?`;
      params.push(radius);
    }

    // Group by ID to ensure we don't get duplicate records
    baseQuery += `
      GROUP BY 
        te.id
      ORDER BY 
        distance; -- Order by distance, nearest first
    `;

    // Execute the query with the provided parameters
    const [rows] = await pool.query(baseQuery, params);

    // Process image URLs
    rows.forEach(row => {
      if (row.images) {
        row.images = row.images.split(',').map(imagePath => ({
          image_path: imagePath,
          image_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${imagePath}`
        }));
      }
    });

    // Return the results
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tourist entities:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};


export default {
    getTouristEntities,
    getAllFilters,
};
