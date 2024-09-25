-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 24, 2024 at 01:58 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nakhonphanomtraveldb_final`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int(7) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `username`, `password`, `name`) VALUES
(1, 'tackteam_chare', '$2a$10$HImeAc9X3omgyAGbRidpfec6kibyLWViuJItEwdCqp7yNi0EqqdcK', 'Admin_Team');

-- --------------------------------------------------------

--
-- Table structure for table `admin_tokens`
--

CREATE TABLE `admin_tokens` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `token` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`) VALUES
(1, 'สถานที่ท่องเที่ยว'),
(2, 'ที่พัก'),
(3, 'ร้านอาหาร'),
(4, 'ร้านค้าของฝาก');

-- --------------------------------------------------------

--
-- Table structure for table `chatbot_suggestions`
--

CREATE TABLE `chatbot_suggestions` (
  `id` int(11) NOT NULL,
  `category` varchar(255) NOT NULL,
  `suggestion_text` varchar(255) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chatbot_suggestions`
--

INSERT INTO `chatbot_suggestions` (`id`, `category`, `suggestion_text`, `active`, `created_at`, `updated_at`) VALUES
(1, 'สถานที่ท่องเที่ยว', 'สถานที่ท่องเที่ยวใกล้เคียงฉันในตอนนี้', 1, '2024-09-24 11:57:14', '2024-09-24 11:58:40'),
(2, 'ที่พัก', 'แนะนำที่พักที่ดีที่สุดในนครพนม', 1, '2024-09-24 11:57:14', '2024-09-24 11:57:21'),
(3, 'ร้านอาหาร', 'แนะนำร้านอาหารที่น่าสนใจ', 1, '2024-09-24 11:57:14', '2024-09-24 11:57:14'),
(4, 'ร้านค้าของฝาก', 'แนะนำร้านขายของฝากที่ดีที่สุด', 1, '2024-09-24 11:57:14', '2024-09-24 11:57:14'),
(5, 'สถานที่ท่องเที่ยว', 'สถานที่ท่องเที่ยวยอดนิยมในจังหวัดนครพนมมีที่ไหนบ้าง', 1, '2024-09-24 11:57:14', '2024-09-24 11:58:08');

-- --------------------------------------------------------

--
-- Table structure for table `district`
--

CREATE TABLE `district` (
  `id` int(5) NOT NULL,
  `name` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `district`
--

INSERT INTO `district` (`id`, `name`) VALUES
(1, 'เมืองนครพนม'),
(2, 'บ้านแพง'),
(3, 'ท่าอุเทน'),
(4, 'ศรีสงคราม'),
(5, 'นาหว้า'),
(6, 'โพนสวรรค์'),
(7, 'นาทม '),
(8, 'ธาตุพนม'),
(9, 'เรณูนคร'),
(10, 'นาแก'),
(11, 'ปลาปาก'),
(12, 'วังยาง');

-- --------------------------------------------------------

--
-- Table structure for table `operating_hours`
--

CREATE TABLE `operating_hours` (
  `id` int(7) NOT NULL,
  `place_id` int(7) NOT NULL,
  `day_of_week` enum('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  `opening_time` time DEFAULT NULL,
  `closing_time` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `seasons`
--

CREATE TABLE `seasons` (
  `id` int(7) NOT NULL,
  `name` varchar(255) NOT NULL,
  `date_start` date DEFAULT NULL,
  `date_end` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `seasons`
--

INSERT INTO `seasons` (`id`, `name`, `date_start`, `date_end`) VALUES
(1, 'ฤดูร้อน', '2024-02-15', '2024-05-15'),
(2, 'ฤดูฝน', '2024-05-15', '2024-10-15'),
(3, 'ฤดูหนาว', '2024-10-15', '2025-02-15'),
(4, 'ตลอดทั้งปี', '2024-01-01', '2024-12-31');

-- --------------------------------------------------------

--
-- Table structure for table `seasons_relation`
--

CREATE TABLE `seasons_relation` (
  `id` int(7) NOT NULL,
  `season_id` int(7) NOT NULL,
  `tourism_entities_id` int(7) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tourism_entities_images`
--

CREATE TABLE `tourism_entities_images` (
  `id` int(7) NOT NULL,
  `tourism_entities_id` int(7) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tourist_entities`
--

CREATE TABLE `tourist_entities` (
  `id` int(7) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `district_id` int(5) NOT NULL,
  `category_id` int(11) NOT NULL,
  `created_date` datetime DEFAULT current_timestamp(),
  `created_by` int(7) NOT NULL,
  `published` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `admin_tokens`
--
ALTER TABLE `admin_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `chatbot_suggestions`
--
ALTER TABLE `chatbot_suggestions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `district`
--
ALTER TABLE `district`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `operating_hours`
--
ALTER TABLE `operating_hours`
  ADD PRIMARY KEY (`id`),
  ADD KEY `place_id` (`place_id`);

--
-- Indexes for table `seasons`
--
ALTER TABLE `seasons`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `seasons_relation`
--
ALTER TABLE `seasons_relation`
  ADD PRIMARY KEY (`id`),
  ADD KEY `season_id` (`season_id`),
  ADD KEY `tourism_entities_id` (`tourism_entities_id`);

--
-- Indexes for table `tourism_entities_images`
--
ALTER TABLE `tourism_entities_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tourism_entities_id` (`tourism_entities_id`);

--
-- Indexes for table `tourist_entities`
--
ALTER TABLE `tourist_entities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `district_id` (`district_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `created_by` (`created_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `admin_tokens`
--
ALTER TABLE `admin_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `chatbot_suggestions`
--
ALTER TABLE `chatbot_suggestions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `district`
--
ALTER TABLE `district`
  MODIFY `id` int(5) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `operating_hours`
--
ALTER TABLE `operating_hours`
  MODIFY `id` int(7) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seasons`
--
ALTER TABLE `seasons`
  MODIFY `id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `seasons_relation`
--
ALTER TABLE `seasons_relation`
  MODIFY `id` int(7) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tourism_entities_images`
--
ALTER TABLE `tourism_entities_images`
  MODIFY `id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tourist_entities`
--
ALTER TABLE `tourist_entities`
  MODIFY `id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=160;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_tokens`
--
ALTER TABLE `admin_tokens`
  ADD CONSTRAINT `admin_tokens_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `operating_hours`
--
ALTER TABLE `operating_hours`
  ADD CONSTRAINT `operating_hours_ibfk_1` FOREIGN KEY (`place_id`) REFERENCES `tourist_entities` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `seasons_relation`
--
ALTER TABLE `seasons_relation`
  ADD CONSTRAINT `seasons_relation_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`),
  ADD CONSTRAINT `seasons_relation_ibfk_2` FOREIGN KEY (`tourism_entities_id`) REFERENCES `tourist_entities` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tourism_entities_images`
--
ALTER TABLE `tourism_entities_images`
  ADD CONSTRAINT `tourism_entities_images_ibfk_1` FOREIGN KEY (`tourism_entities_id`) REFERENCES `tourist_entities` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tourist_entities`
--
ALTER TABLE `tourist_entities`
  ADD CONSTRAINT `tourist_entities_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `district` (`id`),
  ADD CONSTRAINT `tourist_entities_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `tourist_entities_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `admin` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
