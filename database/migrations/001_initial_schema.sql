-- Initial Database Schema for IIT Hostel Booking System

DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS floors CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS hostels CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Admins Table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Students Table (imported from CSV)
CREATE TABLE students (
    roll_number VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    programme VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    booking_status VARCHAR(20) DEFAULT 'Pending',
    booked_room_id INTEGER NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Hostels Table
CREATE TABLE hostels (
    hostel_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    allowed_gender VARCHAR(10) NOT NULL,
    allowed_programme VARCHAR(20) NOT NULL,
    allowed_year INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Blocks Table
CREATE TABLE blocks (
    block_id SERIAL PRIMARY KEY,
    hostel_id INTEGER REFERENCES hostels(hostel_id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    is_reserved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Floors Table
CREATE TABLE floors (
    floor_id SERIAL PRIMARY KEY,
    block_id INTEGER REFERENCES blocks(block_id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    is_reserved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Rooms Table
CREATE TABLE rooms (
    room_id SERIAL PRIMARY KEY,
    floor_id INTEGER REFERENCES floors(floor_id) ON DELETE CASCADE,
    room_number VARCHAR(10) NOT NULL,
    capacity INTEGER DEFAULT 2,
    current_occupancy INTEGER DEFAULT 0,
    is_reserved BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Vacant',
    pairing_code VARCHAR(50) NULL,
    code_expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings Table
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(room_id) ON DELETE CASCADE,
    student_roll VARCHAR(20) REFERENCES students(roll_number) ON DELETE CASCADE,
    booking_date TIMESTAMP DEFAULT NOW(),
    is_primary BOOLEAN DEFAULT FALSE,
    paired_with VARCHAR(20) NULL REFERENCES students(roll_number)
);

-- Foreign Key Link for Student Booked Room
ALTER TABLE students 
ADD CONSTRAINT fk_students_booked_room 
FOREIGN KEY (booked_room_id) REFERENCES rooms(room_id) ON DELETE SET NULL;

-- Index for Fast Pairing Code Lookups
CREATE INDEX IF NOT EXISTS idx_rooms_pairing_code ON rooms(pairing_code);

-- Unique Index on rooms (floor_id, room_number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_floor_room ON rooms(floor_id, room_number);

