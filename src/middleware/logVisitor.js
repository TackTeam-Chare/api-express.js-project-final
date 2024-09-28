import pool from '../config/db.js';

// Middleware to log visitor information
const logVisitor = async (req, res, next) => {
    try {
        // Get the user's IP address and user agent
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Query to insert visitor information into the visitors table
        const query = 'INSERT INTO visitors (ip_address, user_agent) VALUES (?, ?)';
        await pool.query(query, [ipAddress, userAgent]);
        
        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Error logging visitor:', error);
        next();  // Ensure that the request continues even if logging fails
    }
};

export default logVisitor;
