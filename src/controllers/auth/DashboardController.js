import pool from '../../config/db.js';

const getEntityCounts = async (req, res) => {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM tourist_entities WHERE category_id = 1) AS total_tourist_spots,
                (SELECT COUNT(*) FROM tourist_entities WHERE category_id = 2) AS total_accommodations,
                (SELECT COUNT(*) FROM tourist_entities WHERE category_id = 3) AS total_restaurants,
                (SELECT COUNT(*) FROM tourist_entities WHERE category_id = 4) AS total_souvenir_shops,
                (SELECT COUNT(*) FROM tourist_entities) AS total_all_places
        `;
        const [rows] = await pool.query(query);
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching entity counts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    getEntityCounts
};
