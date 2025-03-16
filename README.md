# Job Search Application API

A RESTful API for a job search application built with Node.js, Express, and MongoDB. This application allows users to search for jobs, companies to post job opportunities, and facilitates the job application process.

## Features

- **User Management**: Registration, authentication, profile management
- **Company Management**: Create and manage companies, add HR personnel
- **Job Management**: Post, search, and filter job opportunities
- **Application System**: Apply for jobs, track applications, manage application statuses
- **Chat System**: Communication between HR and job applicants
- **Security**: Authentication, authorization, input validation, rate limiting
- **File Handling**: Upload and manage profile pictures, company logos, and CVs

## Technologies Used

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **File Upload**: Multer and Cloudinary
- **Email Service**: Nodemailer
- **Security**: Helmet, CORS, Express-rate-limit, bcrypt

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- MongoDB (local or Atlas)
- Cloudinary account for file storage

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/job_search_app.git
cd job-search-app
```

2. Install dependencies:
```
npm install
```

3. Set up environment variables:
Copy the `.env.example` file to `.env` and fill in your values.

4. Start the server:
```
npm run dev
```

## API Documentation

### Authentication

- `POST /api/v1/users/register`: Register a new user
- `POST /api/v1/users/confirm-email`: Confirm user email
- `POST /api/v1/users/login`: Login and get authentication token
- `POST /api/v1/users/forgot-password`: Request password reset
- `POST /api/v1/users/reset-password`: Reset password

### User Management

- `GET /api/v1/users/profile`: Get current user profile
- `PATCH /api/v1/users/profile`: Update user profile
- `PATCH /api/v1/users/change-password`: Change password
- `POST /api/v1/users/profile-picture`: Upload profile picture
- `POST /api/v1/users/cover-picture`: Upload cover picture
- `GET /api/v1/users/admin/users`: Admin - Get all users
- `GET /api/v1/users/admin/users/:id`: Admin - Get user by ID
- `PATCH /api/v1/users/admin/users/:id`: Admin - Update user
- `DELETE /api/v1/users/admin/users/:id`: Admin - Delete user
- `PATCH /api/v1/users/admin/users/:id/ban`: Admin - Ban user
- `PATCH /api/v1/users/admin/users/:id/unban`: Admin - Unban user

### Company Management

- `GET /api/v1/companies`: Get all companies
- `GET /api/v1/companies/my-companies`: Get user's companies
- `POST /api/v1/companies`: Create a new company
- `GET /api/v1/companies/:id`: Get company by ID
- `PATCH /api/v1/companies/:id`: Update company
- `DELETE /api/v1/companies/:id`: Delete company
- `POST /api/v1/companies/:id/logo`: Upload company logo
- `POST /api/v1/companies/:id/cover`: Upload company cover picture
- `POST /api/v1/companies/:id/hr`: Add HR to company
- `DELETE /api/v1/companies/:id/hr`: Remove HR from company
- `PATCH /api/v1/companies/:id/approve`: Admin - Approve company

### Job Management

- `GET /api/v1/jobs`: Get all jobs with filtering
- `GET /api/v1/jobs/my-jobs`: Get jobs created by current user
- `GET /api/v1/jobs/company/:companyId`: Get jobs for a specific company
- `POST /api/v1/jobs`: Create a new job
- `GET /api/v1/jobs/:id`: Get job by ID
- `PATCH /api/v1/jobs/:id`: Update job
- `DELETE /api/v1/jobs/:id`: Delete job
- `PATCH /api/v1/jobs/:id/close`: Close job

### Application Management

- `POST /api/v1/applications`: Apply for a job
- `GET /api/v1/applications/my-applications`: Get user's applications
- `GET /api/v1/applications/job/:jobId`: Get applications for a job
- `GET /api/v1/applications/company/:companyId`: Get applications for a company
- `GET /api/v1/applications/:id`: Get application by ID
- `PATCH /api/v1/applications/:id`: Update application status
- `DELETE /api/v1/applications/:id`: Delete application

### Chat System

- `GET /api/v1/chats`: Get user's chats
- `POST /api/v1/chats`: Create or get a chat
- `GET /api/v1/chats/:id`: Get chat by ID
- `DELETE /api/v1/chats/:id`: Delete chat
- `POST /api/v1/chats/:id/messages`: Send a message in a chat


## Acknowledgements

- Express.js
- MongoDB
- Mongoose
- JWT
- Cloudinary
- And all other open-source libraries used in this project