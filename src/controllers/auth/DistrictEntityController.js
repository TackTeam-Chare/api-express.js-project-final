import pool from '../../config/db.js';

// Get all districts
const getAllDistricts = async (req, res) => {
    try {
        const query = 'SELECT * FROM district ORDER BY id DESC';
        const [districts] = await pool.query(query);
        res.status(200).json(districts);
    } catch (error) {
        console.error('Error fetching districts:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};


// Get a district by ID
const getDistrictById = async (req, res) => {
    try {
        const id = req.params.id;

        // Validate ID is a positive integer
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid district ID' });
        }

        const query = 'SELECT * FROM district WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        const district = rows[0];

        if (district) {
            res.status(200).json({ status: 'success', data: district });
        } else {
            res.status(404).json({ status: 'error', message: 'District not found' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Create a new district with validation for duplicates
const createDistrict = async (req, res) => {
    const { name } = req.body;

    // Validate that the name is provided
    if (!name) {
        return res.status(400).json({ status: 'error', message: 'District name is required' });
    }

    try {
        // Check if district name already exists
        const checkQuery = 'SELECT COUNT(*) as count FROM district WHERE name = ?';
        const [rows] = await pool.query(checkQuery, [name]);
        const districtExists = rows[0].count > 0;

        if (districtExists) {
            return res.status(409).json({
                status: 'duplicate',
                message: 'District name already exists, please choose a different name.'
            });
        }

        // Insert the district if it doesn't exist
        const query = 'INSERT INTO district SET ?';
        const [result] = await pool.query(query, { name });
        res.status(201).json({
            status: 'success',
            message: 'District created successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating district:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Update a district with validation for duplicates
const updateDistrict = async (req, res) => {
    const id = req.params.id;
    const { name } = req.body;

    // Validate that the name is provided
    if (!name) {
        return res.status(400).json({ status: 'error', message: 'District name is required' });
    }

    try {
        // Check if the new district name already exists, excluding current district
        const checkQuery = 'SELECT COUNT(*) as count FROM district WHERE name = ? AND id != ?';
        const [rows] = await pool.query(checkQuery, [name, id]);
        const districtExists = rows[0].count > 0;

        if (districtExists) {
            return res.status(409).json({
                status: 'duplicate',
                message: 'District name already exists, please choose a different name.'
            });
        }

        // Update the district if it doesn't exist
        const query = 'UPDATE district SET ? WHERE id = ?';
        const [result] = await pool.query(query, [{ name }, id]);

        if (result.affectedRows > 0) {
            res.status(200).json({ status: 'success', message: `District with ID ${id} updated successfully` });
        } else {
            res.status(404).json({ status: 'error', message: 'District not found' });
        }
    } catch (error) {
        console.error('Error updating district:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Delete a district with validation
const deleteDistrict = async (req, res) => {
    const id = req.params.id;

    // Validate that the ID is a positive integer
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({ status: 'error', message: 'Invalid district ID' });
    }

    try {
        // Check if the district exists before deleting
        const checkQuery = 'SELECT * FROM district WHERE id = ?';
        const [rows] = await pool.query(checkQuery, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'District not found' });
        }

        // Proceed with deletion
        const query = 'DELETE FROM district WHERE id = ?';
        const [result] = await pool.query(query, [id]);

        if (result.affectedRows > 0) {
            res.status(200).json({ status: 'success', message: `District with ID ${id} deleted successfully` });
        } else {
            res.status(500).json({ status: 'error', message: 'Failed to delete district' });
        }
    } catch (error) {
        console.error('Error deleting district:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Get tourist entities by district ID
const getTouristEntitiesByDistrict = async (req, res) => {
    try {
        const id = req.params.id;

        // Validate the ID
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid district ID' });
        }

        const query = `SELECT te.id, te.name, te.description, te.location, te.latitude, te.longitude, d.name AS district_name, c.name AS category_name, GROUP_CONCAT(DISTINCT ti.image_path) AS image_url, GROUP_CONCAT(DISTINCT s.name) AS seasons FROM tourist_entities te INNER JOIN district d ON te.district_id = d.id INNER JOIN categories c ON te.category_id = c.id LEFT JOIN tourism_entities_images ti ON te.id = ti.tourism_entities_id LEFT JOIN seasons_relation sr ON te.id = sr.tourism_entities_id LEFT JOIN seasons s ON sr.season_id = s.id WHERE te.district_id = ? GROUP BY te.id;`;
        const [rows] = await pool.query(query, [id]);
        res.status(200).json({ status: 'success', data: rows });
    } catch (error) {
        console.error('Error fetching tourist entities by district:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Get a district ID by name
const getIdByName = async (name) => {
    const [rows] = await pool.query('SELECT id FROM district WHERE name = ?', [name]);
    if (rows.length > 0) {
        return rows[0].id;
    } else {
        throw new Error(`District '${name}' not found`);
    }
};

export default {
    getAllDistricts,
    getDistrictById,
    createDistrict,
    updateDistrict,
    deleteDistrict,
    getTouristEntitiesByDistrict,
    getIdByName
};