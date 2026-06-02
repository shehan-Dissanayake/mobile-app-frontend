# mobile-app-frontend
# 🏥 Clinic Management & Health Vault System

A comprehensive, full-stack mobile application designed to streamline clinic operations, manage patient health records, and facilitate secure communication between doctors and patients. 

* **Frontend Repository:** [Link to frontend repo]
* **Backend Repository:** [Link to backend repo]

## 📋 Overview

This system provides a secure, role-based platform with distinct interfaces for **Admins, Doctors, and Patients**. It modernizes the clinic experience by allowing doctors to issue digital prescriptions and diagnoses, while patients can track their active health tasks, view their medical history, and receive real-time notifications for updates to their care.

## ✨ Key Features

* **Role-Based Access Control:** Distinct UI flows and data access layers for Patients, Doctors, and Clinic Admins.
* **Secure Authentication:** JWT-based login system with encrypted password hashing (bcrypt) and protected mobile routing.
* **Medical Record Management (CRUD):** Complete lifecycle management of patient records, including diagnoses, lab reports, and doctor notes.
* **Automated Notifications:** Smart database triggers that automatically generate and send in-app notifications to patients when a doctor updates their medical status.
* **Document & File Handling:** Integrated base64 image and document uploading for attaching X-rays, lab results, and external files directly to patient profiles.
* **Automated Invoicing:** System for admins to generate, track, and link medical bills to specific health records.
* **Robust Form Validation:** Multi-layered security with frontend user-interface checks and strict backend Mongoose schema validation.

## 🛠️ Technology Stack

**Frontend (Mobile App):**
* React Native
* Expo (Expo Router for navigation)
* Axios (API communication)
* AsyncStorage (Local token management)

**Backend (REST API):**
* Node.js & Express.js
* MongoDB & Mongoose (Database & ODM)
* JSON Web Tokens (JWT) for Authorization
* MVC Architecture Pattern

## 🚀 Local Installation & Setup

### 1. Clone the Repositories
```bash
git clone [https://github.com/shehan-Dissanayake/mobile-app-frontend.git](https://github.com/shehan-Dissanayake/mobile-app-frontend.git)
git clone [https://github.com/shehan-Dissanayake/mobile-app-backend.git](https://github.com/shehan-Dissanayake/mobile-app-backend.git)
