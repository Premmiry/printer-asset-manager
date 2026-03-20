# Printer Asset Management System

ระบบจัดการข้อมูลเครื่องพิมพ์สำหรับองค์กร พัฒนาด้วย React, Tailwind CSS และ Firebase

## ฟีเจอร์หลัก
- 🔐 เข้าสู่ระบบด้วย Google Authentication
- 🖨️ จัดการข้อมูลเครื่องพิมพ์ (เพิ่ม, แก้ไข, ลบ)
- 🏢 จัดการข้อมูลแผนก (รองรับการนำเข้าไฟล์ Excel)
- 🔍 ค้นหาและกรองข้อมูลตามแผนก, ยี่ห้อ, รุ่น หรือรหัสทรัพย์สิน
- 📊 สรุปสถิติจำนวนเครื่องพิมพ์ทั้งหมดและเครื่องพิมพ์สี

---

## วิธีการติดตั้ง (Installation)

### 1. เตรียมความพร้อม
- ติดตั้ง [Node.js](https://nodejs.org/) (แนะนำเวอร์ชัน 18 ขึ้นไป)
- บัญชี [Firebase](https://console.firebase.google.com/)

### 2. โคลนโปรเจกต์และติดตั้ง Dependencies
```bash
# ติดตั้ง dependencies
npm install
```

### 3. ตั้งค่า Firebase (Configuration)
1. ไปที่ [Firebase Console](https://console.firebase.google.com/) และสร้างโปรเจกต์ใหม่
2. เปิดใช้งาน **Authentication** และเลือกวิธีเข้าสู่ระบบเป็น **Google**
3. สร้าง **Firestore Database**
4. ไปที่ **Project Settings** > **General** และเพิ่ม Web App เพื่อรับค่า Configuration
5. สร้างไฟล์ `firebase-applet-config.json` ที่ root ของโปรเจกต์ และใส่ค่าที่ได้จาก Firebase:

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_AUTH_DOMAIN",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_STORAGE_BUCKET",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "firestoreDatabaseId": "(default)"
}
```

### 4. ตั้งค่า Security Rules
คัดลอกเนื้อหาจากไฟล์ `firestore.rules` ในโปรเจกต์นี้ ไปวางในเมนู **Firestore** > **Rules** ใน Firebase Console เพื่อความปลอดภัยของข้อมูล

### 5. เริ่มใช้งานโปรเจกต์
```bash
# รันในโหมด Development
npm run dev

# สร้างไฟล์สำหรับ Production
npm run build
```

---

## การตั้งค่าเริ่มต้น (Initial Config)
1. เข้าสู่ระบบด้วย Google
2. ไปที่เมนู **Settings (ไอคอนฟันเฟือง)**
3. เพิ่มแผนกด้วยตนเอง หรือใช้ปุ่ม **"นำเข้า Excel"**
   - ไฟล์ Excel ควรมีหัวตาราง (Header) ชื่อ `code` และ `ThaiName`
4. เริ่มเพิ่มข้อมูลเครื่องพิมพ์ได้ทันที!
