import pool from '../config/db.js';
import axios from 'axios';

/**
 * Processes user questions, queries the database, and fetches external data if necessary.
 */
const processChatbotQuestion = async (questionData, socket) => {
  let dbResponse = ''; // Response from the database
  let hasRelevantData = false; // Flag to track if relevant data was found

  const question = questionData.text; // Extract the text part of the question
  const userLocation = questionData.location || null; // Extract the location if available

  try {
    // 1. Handle queries for tourist-related categories in the database
    if (["สถานที่ท่องเที่ยว", "ที่พัก", "ร้านอาหาร", "ร้านค้าของฝาก"].some(q => question.includes(q))) {
      let category = '';
      if (question.includes("สถานที่ท่องเที่ยว")) category = 'สถานที่ท่องเที่ยว';
      else if (question.includes("ที่พัก")) category = 'ที่พัก';
      else if (question.includes("ร้านอาหาร")) category = 'ร้านอาหาร';
      else if (question.includes("ร้านค้าของฝาก")) category = 'ร้านค้าของฝาก';

      // Query the database
      const [rows] = await pool.query(
        `SELECT te.name, te.description, te.id 
         FROM tourist_entities te 
         JOIN categories c ON te.category_id = c.id 
         WHERE c.name = ?`, [category]);

      if (rows.length > 0) {
        dbResponse = `ข้อมูลที่พบสำหรับ "${category}":\n`;
        rows.forEach((row, index) => {
          dbResponse += `${index + 1}. ${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
        });
        hasRelevantData = true;
        socket.emit('botMessage', dbResponse);
      } else {
        dbResponse = `ไม่พบข้อมูลที่เกี่ยวข้องสำหรับ "${category}" ในฐานข้อมูล`;
        socket.emit('botMessage', dbResponse);
      }
    }

    // 2. Tourist Attractions, Restaurants, and Souvenir Shops Closing Soon
    if (question.includes("ใกล้ปิด")) {
      if (question.includes("สถานที่ท่องเที่ยวที่จะปิดเวลาทำการเเล้ว")) {
        await getTouristAttractionsClosingSoon(socket);
      } else if (question.includes("ร้านอาหารที่จะปิดเวลาทำการเเล้ว")) {
        await getRestaurantsClosingSoon(socket);
      } else if (question.includes("ร้านค้าของฝากที่จะปิดเวลาทำการเเล้ว")) {
        await getSouvenirShopsClosingSoon(socket);
      }
      hasRelevantData = true;
    }

    // 3. Tourist Attractions, Restaurants, and Souvenir Shops Opening Soon
    if (question.includes("ใกล้เปิด")) {
      if (question.includes("สถานที่ท่องเที่ยวที่ใกล้จะเปิดเวลาทำการให้เยี่ยมชมเเล้ว")) {
        await getTouristAttractionsOpeningSoon(socket);
      } else if (question.includes("ร้านอาหารที่ใกล้จะเปิดเวลาทำการเเล้ว")) {
        await getRestaurantsOpeningSoon(socket);
      } else if (question.includes("ร้านค้าของฝาก")) {
        await getSouvenirShopsOpeningSoon(socket);
      }
      hasRelevantData = true;
    }

    // 4. Handle nearby places based on location
    if (userLocation) {
      const { latitude, longitude } = userLocation;
    
      // 1. Check if the question is about nearby tourist attractions
      if (question.includes("สถานที่ท่องเที่ยวใกล้เคียงฉันตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           WHERE c.name = 'สถานที่ท่องเที่ยว'
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `สถานที่ท่องเที่ยวใกล้พิกัดของคุณภายใน 10 กิโลเมตร:\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบสถานที่ท่องเที่ยวใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    
      // 2. Check if the question is about nearby shops
      else if (question.includes("ร้านค้าใกล้เคียงฉันตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           WHERE c.name = 'ร้านค้าของฝาก'
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `ร้านค้าใกล้พิกัดของคุณภายใน 10 กิโลเมตร:\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบร้านค้าใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    
      // 3. Check if the question is about nearby hotels
      else if (question.includes("ที่พักใกล้เคียงฉันตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           WHERE c.name = 'ที่พัก'
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `ที่พักใกล้พิกัดของคุณภายใน 10 กิโลเมตร:\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบที่พักใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    
      // 4. Check if the question is about nearby restaurants
      else if (question.includes("ร้านอาหารใกล้เคียงฉันตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           WHERE c.name = 'ร้านอาหาร'
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `ร้านอาหารใกล้พิกัดของคุณภายใน 10 กิโลเมตร:\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบร้านอาหารใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    
      // 5. If no category specified, return all nearby places within 10km
      else if (question.includes("สถานที่ใกล้เคียงตอนนี้")) {
        const [rows] = await pool.query(
          `SELECT te.name, te.description, te.id, c.name AS category_name,
           (6371 * acos(cos(radians(?)) * cos(radians(te.latitude)) 
           * cos(radians(te.longitude) - radians(?)) + sin(radians(?)) * sin(radians(te.latitude)))) AS distance
           FROM tourist_entities te
           JOIN categories c ON te.category_id = c.id
           HAVING distance < 10
           ORDER BY distance LIMIT 10`, 
          [latitude, longitude, latitude]
        );
    
        if (rows.length > 0) {
          dbResponse = `สถานที่ใกล้พิกัดของคุณภายใน 10 กิโลเมตร (รวมทุกประเภท):\n`;
          rows.forEach((row, index) => {
            dbResponse += `${index + 1}. ${row.name} (${row.category_name}) - ${row.description}\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
          });
          socket.emit('botMessage', dbResponse);
        } else {
          socket.emit('botMessage', 'ไม่พบสถานที่ใกล้เคียงในระยะ 10 กิโลเมตร');
        }
      }
    }

    // 5. Fallback to Google Places API if no relevant data found
    if (!hasRelevantData) {
      const externalPlaces = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: { query: question, key: process.env.GOOGLE_PLACES_API_KEY }
      });

      if (externalPlaces.data.results.length > 0) {
        let externalResponse = 'ข้อมูลจาก Google Places:\n';
        externalPlaces.data.results.forEach((place, index) => {
          externalResponse += `${index + 1}. ${place.name}\n ลิ้งค์ไปยัง Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}\n\n`;
        });
        socket.emit('botMessage', externalResponse);
        hasRelevantData = true;
      }

      // 6. Fallback to GPT-4 if no Google Places data found
      if (!hasRelevantData) {
        const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: question }],
        }, {
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
        });

        if (gptResponse.data && gptResponse.data.choices) {
          const aiMessage = gptResponse.data.choices[0].message.content;
          socket.emit('botMessage', aiMessage);
        } else {
          socket.emit('botMessage', 'ไม่สามารถตอบคำถามได้ในขณะนี้');
        }
      }
    }

  } catch (error) {
    console.error('Error processing chatbot question:', error);
    socket.emit('botMessage', 'เกิดข้อผิดพลาดในการประมวลผลคำถาม');
  }
};

/**
 * Get tourist attractions that are closing soon (within 30 minutes).
 */
const getTouristAttractionsClosingSoon = async (socket) => {
  const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM format
  const query = `
    SELECT te.name, te.description, te.id, oh.closing_time
    FROM tourist_entities te
    JOIN categories c ON te.category_id = c.id
    JOIN operating_hours oh ON te.id = oh.place_id
    WHERE c.name = 'สถานที่ท่องเที่ยว'
    AND oh.closing_time > ?
    AND TIMEDIFF(oh.closing_time, ?) <= '00:30:00'`; // Within 30 minutes of closing

  const [rows] = await pool.query(query, [currentTime, currentTime]);

  if (rows.length > 0) {
    let response = 'สถานที่ท่องเที่ยวที่ใกล้ปิดในขณะนี้:\n';
    rows.forEach((row, index) => {
      response += `${index + 1}. ${row.name} - ${row.description} (เวลาปิด: ${row.closing_time})\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
    });
    socket.emit('botMessage', response);
  } else {
    socket.emit('botMessage', 'ไม่พบสถานที่ท่องเที่ยวใกล้ปิดในขณะนี้');
  }
};

/**
 * Get restaurants that are closing soon (within 30 minutes).
 */
const getRestaurantsClosingSoon = async (socket) => {
  const currentTime = new Date().toTimeString().slice(0, 5);
  const query = `
    SELECT te.name, te.description, te.id, oh.closing_time
    FROM tourist_entities te
    JOIN categories c ON te.category_id = c.id
    JOIN operating_hours oh ON te.id = oh.place_id
    WHERE c.name = 'ร้านอาหาร'
    AND oh.closing_time > ?
    AND TIMEDIFF(oh.closing_time, ?) <= '00:30:00'`;

  const [rows] = await pool.query(query, [currentTime, currentTime]);

  if (rows.length > 0) {
    let response = 'ร้านอาหารที่ใกล้ปิดในขณะนี้:\n';
    rows.forEach((row, index) => {
      response += `${index + 1}. ${row.name} - ${row.description} (เวลาปิด: ${row.closing_time})\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
    });
    socket.emit('botMessage', response);
  } else {
    socket.emit('botMessage', 'ไม่พบร้านอาหารใกล้ปิดในขณะนี้');
  }
};

/**
 * Get souvenir shops that are closing soon (within 30 minutes).
 */
const getSouvenirShopsClosingSoon = async (socket) => {
  const currentTime = new Date().toTimeString().slice(0, 5);
  const query = `
    SELECT te.name, te.description, te.id, oh.closing_time
    FROM tourist_entities te
    JOIN categories c ON te.category_id = c.id
    JOIN operating_hours oh ON te.id = oh.place_id
    WHERE c.name = 'ร้านค้าของฝาก'
    AND oh.closing_time > ?
    AND TIMEDIFF(oh.closing_time, ?) <= '00:30:00'`;

  const [rows] = await pool.query(query, [currentTime, currentTime]);

  if (rows.length > 0) {
    let response = 'ร้านค้าของฝากที่ใกล้ปิดในขณะนี้:\n';
    rows.forEach((row, index) => {
      response += `${index + 1}. ${row.name} - ${row.description} (เวลาปิด: ${row.closing_time})\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
    });
    socket.emit('botMessage', response);
  } else {
    socket.emit('botMessage', 'ไม่พบร้านค้าของฝากใกล้ปิดในขณะนี้');
  }
};

/**
 * Get tourist attractions that are opening soon (within 30 minutes).
 */
const getTouristAttractionsOpeningSoon = async (socket) => {
  const currentTime = new Date().toTimeString().slice(0, 5);
  const query = `
    SELECT te.name, te.description, te.id, oh.opening_time
    FROM tourist_entities te
    JOIN categories c ON te.category_id = c.id
    JOIN operating_hours oh ON te.id = oh.place_id
    WHERE c.name = 'สถานที่ท่องเที่ยว'
    AND oh.opening_time > ?
    AND TIMEDIFF(oh.opening_time, ?) <= '00:30:00'`;

  const [rows] = await pool.query(query, [currentTime, currentTime]);

  if (rows.length > 0) {
    let response = 'สถานที่ท่องเที่ยวที่ใกล้เปิดในขณะนี้:\n';
    rows.forEach((row, index) => {
      response += `${index + 1}. ${row.name} - ${row.description} (เวลาเปิด: ${row.opening_time})\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
    });
    socket.emit('botMessage', response);
  } else {
    socket.emit('botMessage', 'ไม่พบสถานที่ท่องเที่ยวใกล้เปิดในขณะนี้');
  }
};

/**
 * Get restaurants that are opening soon (within 30 minutes).
 */
const getRestaurantsOpeningSoon = async (socket) => {
  const currentTime = new Date().toTimeString().slice(0, 5);
  const query = `
    SELECT te.name, te.description, te.id, oh.opening_time
    FROM tourist_entities te
    JOIN categories c ON te.category_id = c.id
    JOIN operating_hours oh ON te.id = oh.place_id
    WHERE c.name = 'ร้านอาหาร'
    AND oh.opening_time > ?
    AND TIMEDIFF(oh.opening_time, ?) <= '00:30:00'`;

  const [rows] = await pool.query(query, [currentTime, currentTime]);

  if (rows.length > 0) {
    let response = 'ร้านอาหารที่ใกล้เปิดในขณะนี้:\n';
    rows.forEach((row, index) => {
      response += `${index + 1}. ${row.name} - ${row.description} (เวลาเปิด: ${row.opening_time})\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
    });
    socket.emit('botMessage', response);
  } else {
    socket.emit('botMessage', 'ไม่พบร้านอาหารใกล้เปิดในขณะนี้');
  }
};

/**
 * Get souvenir shops that are opening soon (within 30 minutes).
 */
const getSouvenirShopsOpeningSoon = async (socket) => {
  const currentTime = new Date().toTimeString().slice(0, 5);
  const query = `
    SELECT te.name, te.description, te.id, oh.opening_time
    FROM tourist_entities te
    JOIN categories c ON te.category_id = c.id
    JOIN operating_hours oh ON te.id = oh.place_id
    WHERE c.name = 'ร้านค้าของฝาก'
    AND oh.opening_time > ?
    AND TIMEDIFF(oh.opening_time, ?) <= '00:30:00'`;

  const [rows] = await pool.query(query, [currentTime, currentTime]);

  if (rows.length > 0) {
    let response = 'ร้านค้าของฝากที่ใกล้เปิดในขณะนี้:\n';
    rows.forEach((row, index) => {
      response += `${index + 1}. ${row.name} - ${row.description} (เวลาเปิด: ${row.opening_time})\n ลิ้งค์ไปยังที่ตั้ง: http://localhost:3000/place/${row.id}\n\n`;
    });
    socket.emit('botMessage', response);
  } else {
    socket.emit('botMessage', 'ไม่พบร้านค้าของฝากใกล้เปิดในขณะนี้');
  }
};

export default processChatbotQuestion;
