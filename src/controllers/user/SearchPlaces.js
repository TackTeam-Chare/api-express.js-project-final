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
        lat,
        lng,
        radius
      } = req.query;
  
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
            (6371 * ACOS(COS(RADIANS(?)) * COS(RADIANS(te.latitude)) * COS(RADIANS(te.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(te.latitude)))) AS distance
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
  
      const params = [lat, lng, lat];
  
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
  
      // If a season is selected, only show entities from the "สถานที่ท่องเที่ยว" category (ID 1)
      if (season) {
        baseQuery += ` AND s.id = ? AND c.id = 1`; // Category ID 1 represents "สถานที่ท่องเที่ยว"
        params.push(season);
      }
  
      // Filter by day of the week and opening/closing times
      if (day_of_week && opening_time && closing_time) {
        baseQuery += ` AND te.id IN (SELECT place_id FROM operating_hours WHERE day_of_week = ? AND opening_time <= ? AND closing_time >= ?)`;
        params.push(day_of_week, opening_time, closing_time);
      }
  
      // If a radius is specified, filter results within the given radius
      if (radius) {
        baseQuery += ` HAVING distance <= ?`;
        params.push(radius);
      }
  
      baseQuery += `
        GROUP BY 
            te.id
        ORDER BY 
            te.name;
      `;
  
      // Execute the query
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
  
      res.json(rows);
    } catch (error) {
      console.error('Error in unified search:', error.message, error.stack);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  };

export default {
    getTouristEntities,
    getAllFilters,
};
