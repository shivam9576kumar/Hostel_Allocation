const fs = require('fs');

const firstNamesMale = [
  'Aryan', 'Rohan', 'Vikram', 'Rahul', 'Arjun', 'Karthik', 'Aditya', 'Dev', 'Ishaan', 'Kabir',
  'Aarav', 'Vivaan', 'Reyansh', 'Vihaan', 'Ansh', 'Krishna', 'Ishant', 'Shaurya', 'Atharv', 'Advait',
  'Pranav', 'Siddharth', 'Yash', 'Harsh', 'Varun', 'Nitin', 'Abhinav', 'Amit', 'Manish', 'Saurabh',
  'Tarun', 'Deepak', 'Gautam', 'Kunal', 'Mayank', 'Pankaj', 'Sachin', 'Tushar', 'Utkarsh', 'Vishal'
];

const firstNamesFemale = [
  'Kavya', 'Meera', 'Aditi', 'Sana', 'Priya', 'Ananya', 'Riya', 'Diya', 'Isha', 'Aanya',
  'Anushka', 'Tara', 'Kiara', 'Sanya', 'Shruti', 'Pooja', 'Neha', 'Sneha', 'Tanvi', 'Vanya',
  'Avani', 'Nisha', 'Bhavna', 'Divya', 'Kriti', 'Megha', 'Payal', 'Rashmi', 'Simran', 'Trisha',
  'Swati', 'Shreya', 'Richa', 'Nandini', 'Komal', 'Deepika', 'Charu', 'Anjali', 'Archana', 'Barkha'
];

const lastNames = [
  'Sharma', 'Desai', 'Gupta', 'Reddy', 'Verma', 'Singh', 'Khan', 'Iyer', 'Nair', 'Patel',
  'Joshi', 'Chowdhury', 'Kumar', 'Shah', 'Mehta', 'Agarwal', 'Bhat', 'Rao', 'Kulkarni', 'Pillai',
  'Banerjee', 'Chatterjee', 'Dutta', 'Sengupta', 'Saxena', 'Mishra', 'Pandey', 'Tripathi', 'Tiwari', 'Shukla',
  'Thakur', 'Bhasin', 'Kapoor', 'Malhotra', 'Khanna', 'Chawla', 'Sood', 'Grom', 'Nanda', 'Bhattacharya'
];

const deptCodes = ['CS', 'EE', 'ME', 'CE', 'CH', 'PH', 'MA', 'BT'];
const programmes = ['B.Tech', 'M.Tech', 'M.Sc', 'PhD'];

const seedData = [
  ['2023CS10145', 'Aryan Sharma', 'aryan.sharma@iit.ac.in', 'Male', 'B.Tech', 3],
  ['2025ME20012', 'Kavya Desai', 'kavya.desai@iit.ac.in', 'Female', 'M.Tech', 2],
  ['2023EE10234', 'Rohan Gupta', 'rohan.gupta@iit.ac.in', 'Male', 'B.Tech', 3],
  ['2022PH30045', 'Meera Reddy', 'meera.reddy@iit.ac.in', 'Female', 'PhD', 4],
  ['2025CH40011', 'Aditi Verma', 'aditi.verma@iit.ac.in', 'Female', 'M.Sc', 1],
  ['2022CS10088', 'Vikram Singh', 'vikram.singh@iit.ac.in', 'Male', 'B.Tech', 4],
  ['2023CE10121', 'Sana Khan', 'sana.khan@iit.ac.in', 'Female', 'B.Tech', 3],
  ['2025EE20005', 'Rahul Iyer', 'rahul.iyer@iit.ac.in', 'Male', 'M.Tech', 1],
  ['2021MA30019', 'Arjun Nair', 'arjun.nair@iit.ac.in', 'Male', 'PhD', 5],
  ['2024PH40022', 'Priya Patel', 'priya.patel@iit.ac.in', 'Female', 'M.Sc', 2],
  ['2023ME10055', 'Karthik Reddy', 'karthik.reddy@iit.ac.in', 'Male', 'B.Tech', 3],
  ['2023CS10189', 'Ananya Sharma', 'ananya.sharma@iit.ac.in', 'Female', 'B.Tech', 3]
];

const rows = ['RollNumber,FullName,Email,Gender,Programme,Year'];
const usedEmails = new Set();
const usedRolls = new Set();

seedData.forEach(([roll, name, email, gender, prog, year]) => {
  rows.push(`${roll},${name},${email},${gender},${prog},${year}`);
  usedEmails.add(email);
  usedRolls.add(roll);
});

let counter = 100;
while (rows.length < 501) {
  const isMale = Math.random() > 0.5;
  const gender = isMale ? 'Male' : 'Female';
  const fnameList = isMale ? firstNamesMale : firstNamesFemale;
  const fname = fnameList[Math.floor(Math.random() * fnameList.length)];
  const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
  const fullName = `${fname} ${lname}`;
  
  const emailName = `${fname.toLowerCase()}.${lname.toLowerCase()}${rows.length}@iit.ac.in`;
  if (usedEmails.has(emailName)) continue;

  const prog = programmes[Math.floor(Math.random() * programmes.length)];
  let year = 1;
  if (prog === 'B.Tech') year = Math.floor(Math.random() * 4) + 1;
  else if (prog === 'M.Tech' || prog === 'M.Sc') year = Math.floor(Math.random() * 2) + 1;
  else if (prog === 'PhD') year = Math.floor(Math.random() * 5) + 1;

  const startYear = 2026 - year;
  const dept = deptCodes[Math.floor(Math.random() * deptCodes.length)];
  const num = String(counter++).padStart(5, '0');
  const rollNumber = `${startYear}${dept}${num}`;

  if (usedRolls.has(rollNumber)) continue;

  usedEmails.add(emailName);
  usedRolls.add(rollNumber);

  rows.push(`${rollNumber},${fullName},${emailName},${gender},${prog},${year}`);
}

fs.writeFileSync('students_500.csv', rows.join('\n'));
console.log(`Generated ${rows.length - 1} student records in students_500.csv`);
