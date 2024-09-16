import pool from '../../config/db.js';

// Controller functions with integrated model code

const getAllSeasons = async (req, res) => {
    try {
        const query = 'SELECT * FROM seasons';
        const [seasons] = await pool.query(query);
        res.json(seasons);
    } catch (error) {
        console.error('Error fetching seasons:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// Get season by ID
const getSeasonById = async (req, res) => {
    try {
        const id = req.params.id;
        const query = 'SELECT * FROM seasons WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        const season = rows[0];

        if (season) {
            res.json(season);
        } else {
            res.status(404).json({ error: 'Season not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a new season
const createSeason = async (req, res) => {
    const season = req.body;
    try {
        const query = 'INSERT INTO seasons SET ?';
        const [result] = await pool.query(query, season);
        res.json({
            message: 'Season created successfully',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update a season
const updateSeason = async (req, res) => {
    const id = req.params.id;
    const season = req.body;
    try {
        const query = 'UPDATE seasons SET ? WHERE id = ?';
        const [result] = await pool.query(query, [season, id]);
        if (result.affectedRows > 0) {
            res.json({ message: `Season with ID ${id} updated successfully` });
        } else {
            res.status(404).json({ error: 'Season not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a season
const deleteSeason = async (req, res) => {
    const id = req.params.id;
    try {
        const query = 'DELETE FROM seasons WHERE id = ?';
        const [result] = await pool.query(query, [id]);
        if (result.affectedRows > 0) {
            res.json({ message: `Season with ID ${id} deleted successfully` });
        } else {
            res.status(404).json({ error: 'Season not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getTouristEntitiesBySeason = async (req, res) => {
    try {
        const id = req.params.id;
        const query = `
            SELECT
                te.*,
                s.name AS season_name, 
                ti.image_path AS image_url,
                d.name AS district_name,
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        oh.day_of_week, ': ',
                        TIME_FORMAT(oh.opening_time, '%h:%i %p'), ' - ',
                        TIME_FORMAT(oh.closing_time, '%h:%i %p')
                    ) ORDER BY oh.day_of_week SEPARATOR '\n'
                ) AS operating_hours
            FROM
                tourist_entities te
                JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
                JOIN seasons s ON sr.season_id = s.id
                LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id
                LEFT JOIN operating_hours oh ON te.id = oh.place_id
                JOIN district d ON te.district_id = d.id
            WHERE 
                sr.season_id = ?
            GROUP BY 
                te.id
        `;
        const [rows] = await pool.query(query, [id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching tourist entities by season:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getTouristEntitiesBySeasonRealTime = async (req, res) => {
    try {
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1; // getMonth() returns 0-11

        let seasonId;
        if (month >= 3 && month <= 5) {
            seasonId = await getIdByName('Summer');
        } else if (month >= 6 && month <= 8) {
            seasonId = await getIdByName('Rainy');
        } else if (month >= 9 && month <= 11) {
            seasonId = await getIdByName('Winter');
        } else {
            seasonId = await getIdByName('Annual');
        }

        const query = `
            SELECT
                te.*, 
                s.name AS season_name,
                GROUP_CONCAT(DISTINCT tei.image_path) AS image_url
            FROM
                tourist_entities te
                JOIN seasons_relation sr ON te.id = sr.tourism_entities_id
                JOIN seasons s ON sr.season_id = s.id
                LEFT JOIN tourism_entities_images tei ON te.id = tei.tourism_entities_id
            WHERE 
                sr.season_id = ?
            GROUP BY 
                te.id
        `;

        const [rows] = await pool.query(query, [seasonId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching tourist entities by season:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getIdByName = async (name) => {
    try {
        const [rows] = await pool.query('SELECT id FROM seasons WHERE name = ?', [name]);
        if (rows.length > 0) {
            return rows[0].id;
        } else {
            throw new Error(`Season '${name}' not found`);
        }
    } catch (error) {
        console.error('Error fetching season id by name:', error);
        throw error;
    }
};


export default {
    getAllSeasons,
    getSeasonById,
    createSeason,
    updateSeason,
    deleteSeason,
    getTouristEntitiesBySeason,
    getTouristEntitiesBySeasonRealTime
};
