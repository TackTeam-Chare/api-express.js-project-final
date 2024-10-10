import pool from '../../config/db.js';

// Controller functions with integrated model code

const getAllCategories = async (req, res) => {
    try {
        const query = 'SELECT * FROM categories';
        const [categories] = await pool.query(query);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

const getCategoryById = async (req, res) => {
    try {
        const id = req.params.id;
        
        // ตรวจสอบว่า id เป็นตัวเลขบวกที่ถูกต้อง
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }

        const query = 'SELECT * FROM categories WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        const category = rows[0];

        if (category) {
            res.json(category);
        } else {
            res.status(404).json({ error: 'Category not found' });
        }
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Create a new category with duplicate validation
const createCategory = async (req, res) => {
    const { name } = req.body;
    try {
        // Check if the category name already exists
        const checkQuery = 'SELECT COUNT(*) as count FROM categories WHERE name = ?';
        const [rows] = await pool.query(checkQuery, [name]);
        const categoryExists = rows[0].count > 0;

        if (categoryExists) {
            return res.status(409).json({  // 409 Conflict
                status: 'duplicate',
                message: 'Category name already exists, please choose a different name.'
            });
        }

        // If the category doesn't exist, insert it
        const query = 'INSERT INTO categories SET ?';
        const [result] = await pool.query(query, { name });
        res.status(201).json({  // 201 Created
            status: 'success',
            message: 'Category created successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update a category with duplicate validation
const updateCategory = async (req, res) => {
    const id = req.params.id;
    const { name } = req.body;

    try {
        // Check if the new name is already taken by another category
        const checkQuery = 'SELECT COUNT(*) as count FROM categories WHERE name = ? AND id != ?';
        const [rows] = await pool.query(checkQuery, [name, id]);
        const categoryExists = rows[0].count > 0;

        if (categoryExists) {
            return res.status(409).json({  // 409 Conflict
                status: 'duplicate',
                message: 'Category name already exists, please choose a different name.'
            });
        }

        // If the category doesn't exist, update it
        const query = 'UPDATE categories SET ? WHERE id = ?';
        const [result] = await pool.query(query, [{ name }, id]);

        if (result.affectedRows > 0) {
            res.json({ status: 'success', message: `Category with ID ${id} updated successfully` });
        } else {
            res.status(404).json({ error: 'Category not found' });
        }
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const deleteCategory = async (req, res) => {
    const id = req.params.id;

    // Validate that the ID is a positive integer
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({ error: 'Invalid category ID' });
    }

    try {
        // Check if the category exists before deleting
        const checkQuery = 'SELECT * FROM categories WHERE id = ?';
        const [rows] = await pool.query(checkQuery, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Proceed with deletion
        const query = 'DELETE FROM categories WHERE id = ?';
        const [result] = await pool.query(query, [id]);

        if (result.affectedRows > 0) {
            res.json({ message: `Category with ID ${id} deleted successfully` });
        } else {
            res.status(500).json({ error: 'Failed to delete category' });
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export default {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};
