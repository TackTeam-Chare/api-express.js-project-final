import express from 'express';
import TouristEntityController from '../../controllers/auth/TouristEntityController.js';
import TourismEntitiesImagesController from '../../controllers/auth/TourismEntitiesImagesController.js';
import SeasonEntityController from '../../controllers/auth/SeasonEntityController.js';
import SeasonsRelationController from '../../controllers/auth/SeasonsRelationController.js';
import CategoryEntityController from '../../controllers/auth/CategoryEntityController.js';
import OperatingHoursEntityController from '../../controllers/auth/OperatingHoursEntityController.js';
import DistrictEntityController from '../../controllers/auth/DistrictEntityController.js';
import upload from '../../config/multer.js';


const router = express.Router();

router.get('/search', TouristEntityController.searchTouristEntities);

// Tourist Entities
router.get('/check-duplicate-name', TouristEntityController.checkDuplicateName);
router.get('/place', TouristEntityController.getAllTouristEntities); // ดึงข้อมูลตารางสถานที่ทั้งหมด
router.get('/place/:id', TouristEntityController.getTouristEntityById); // ดึงข้อมูลตารางสถานที่ด้วยไอดี
router.get('/place/nearby/:id', TouristEntityController.getNearbyTouristEntitiesHandler); // ดึงข้อมูลตารางสถานที่ด้วยไอดีและสถานที่ใกล้เคียง
router.post('/place', upload.array('image_paths', 10), TouristEntityController.createTouristEntity);
router.put('/place/:id', upload.array('image_paths', 10), TouristEntityController.updateTouristEntity);
router.delete('/place/:id', TouristEntityController.deleteTouristEntity); // ลบข้อมูลสถานที่ท่องเที่ยวตามไอดี

// Images routes
router.get('/images', TourismEntitiesImagesController.getAllImages);
router.get('/images/:id', TourismEntitiesImagesController.getImageById);
router.post('/images', upload.single('image_paths'), TourismEntitiesImagesController.createImage);
router.put('/images/:id', upload.single('image_paths'), TourismEntitiesImagesController.updateImages);
router.delete('/images/:id', TourismEntitiesImagesController.deleteImage);

// Operating Hours
router.get('/time', OperatingHoursEntityController.getAllOperatingHours); // ดึงข้อมูลเวลาทำการทั้งหมด
router.get('/time/:id', OperatingHoursEntityController.getOperatingHoursById); // ดึงข้อมูลเวลาทำการตามไอดี
router.get('/time/:day_of_week/:opening_time/:closing_time', OperatingHoursEntityController.getTouristEntitiesByTime); // ดึงข้อมูลสถานที่ท่องเที่ยวตามเวลาที่เปิด-ปิด
router.post('/time', OperatingHoursEntityController.createOperatingHours); // เพิ่มเวลาทำการใหม่
router.put('/time/:id', OperatingHoursEntityController.updateOperatingHours); // อัปเดตเวลาทำการตามไอดี
router.delete('/time/:id', OperatingHoursEntityController.deleteOperatingHours); // ลบเวลาทำการตามไอดี

// Seasons
router.get('/seasons', SeasonEntityController.getAllSeasons); // ดึงข้อมูลฤดูกาลทั้งหมด
router.get('/seasons/real-time', SeasonEntityController.getTouristEntitiesBySeasonRealTime);
router.get('/seasons/:id', SeasonEntityController.getSeasonById); // ดึงข้อมูลสถานที่ท่องเที่ยวตามฤดูกาล
router.get('/seasons/:id/place', SeasonEntityController.getTouristEntitiesBySeason); // ดึงข้อมูลสถานที่ท่องเที่ยวตามฤดูกาล
router.post('/seasons', SeasonEntityController.createSeason); // เพิ่มฤดูกาลใหม่
router.put('/seasons/:id', SeasonEntityController.updateSeason); // อัปเดตฤดูกาลตามไอดี
router.delete('/seasons/:id', SeasonEntityController.deleteSeason); // ลบฤดูกาลตามไอดี

// Seasons Relation
router.get('/seasons-relation', SeasonsRelationController.getAllSeasonsRelations);
router.get('/seasons-relation/:id', SeasonsRelationController.getSeasonsRelationById);
router.post('/seasons-relation', SeasonsRelationController.createSeasonsRelation);
router.put('/seasons-relation/:id', SeasonsRelationController.updateSeasonsRelation);
router.delete('/seasons-relation/:id', SeasonsRelationController.deleteSeasonsRelation);


// Districts
router.get('/districts', DistrictEntityController.getAllDistricts); // ดึงข้อมูลเขตทั้งหมด
router.get('/districts/:id', DistrictEntityController.getDistrictById); // ดึงข้อมูลสถานที่ท่องเที่ยวตามเขต
router.get('/districts/:id/place', DistrictEntityController.getTouristEntitiesByDistrict); // ดึงข้อมูลสถานที่ท่องเที่ยวตามเขต
router.post('/districts', DistrictEntityController.createDistrict); // เพิ่มเขตใหม่
router.put('/districts/:id', DistrictEntityController.updateDistrict); // อัปเดตเขตตามไอดี
router.delete('/districts/:id', DistrictEntityController.deleteDistrict); // ลบเขตตามไอดี

// Categories
router.get('/categories', CategoryEntityController.getAllCategories); // ดึงข้อมูลหมวดหมู่ทั้งหมด
router.get('/categories/:id', CategoryEntityController.getCategoryById); // ดึงข้อมูลตามหมวดหมู่
router.get('/categories/:id/place', CategoryEntityController.getTouristEntitiesByCategory); // ดึงข้อมูลสถานที่ท่องเที่ยวตามหมวดหมู่
router.post('/categories', CategoryEntityController.createCategory); // เพิ่มหมวดหมู่ใหม่
router.put('/categories/:id', CategoryEntityController.updateCategory); // อัปเดตหมวดหมู่ตามไอดี
router.delete('/categories/:id', CategoryEntityController.deleteCategory); // ลบหมวดหมู่ตามไอดี

export default router;
