const nodemailer = require('nodemailer');
const { AppError } = require('../middlewares/error.middleware');

// Create email transporter
const createTransporter = () => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    return transporter;
  } catch (error) {
    throw new AppError(`Email service configuration error: ${error.message}`, 500);
  }
};

// Send email
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    // Define email options
    const mailOptions = {
      from: `"Job Search App" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new AppError(`Failed to send email: ${error.message}`, 500);
  }
};

// Send welcome email with confirmation code
const sendWelcomeEmail = async (user, otp) => {
  const subject = 'Welcome to Job Search App - Email Confirmation';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a4a4a;">Welcome to Job Search App!</h2>
      <p>Hi ${user.firstName},</p>
      <p>Thank you for registering with Job Search App. We're excited to have you on board!</p>
      <p>To complete your registration, please use the following confirmation code:</p>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 60 minutes.</p>
      <p>If you did not create an account, please ignore this email.</p>
      <p>Thank you,<br>The Job Search App Team</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html
  });
};

// Send password reset email
const sendPasswordResetEmail = async (user, otp) => {
  const subject = 'Job Search App - Password Reset';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a4a4a;">Password Reset Request</h2>
      <p>Hi ${user.firstName},</p>
      <p>We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
      <p>To reset your password, use the following code:</p>
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 15 minutes.</p>
      <p>Thank you,<br>The Job Search App Team</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html
  });
};

// Send application confirmation email
const sendApplicationConfirmationEmail = async (user, job, company) => {
  const subject = 'Job Search App - Application Submitted';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a4a4a;">Application Submitted Successfully</h2>
      <p>Hi ${user.firstName},</p>
      <p>Your application for the position of <strong>${job.jobTitle}</strong> at <strong>${company.companyName}</strong> has been successfully submitted.</p>
      <p>Application Details:</p>
      <ul>
        <li>Position: ${job.jobTitle}</li>
        <li>Company: ${company.companyName}</li>
        <li>Job Location: ${job.jobLocation}</li>
        <li>Working Time: ${job.workingTime}</li>
        <li>Seniority Level: ${job.seniorityLevel}</li>
      </ul>
      <p>The company will review your application and get back to you soon.</p>
      <p>Thank you,<br>The Job Search App Team</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html
  });
};

// Send acceptance email to applicant
const sendAcceptanceEmail = async (user, job, company, notes) => {
  const subject = 'Congratulations! Your Job Application Has Been Accepted';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a4a4a;">Application Accepted!</h2>
      <p>Hi ${user.firstName},</p>
      <p>Congratulations! We are pleased to inform you that your application for the position of <strong>${job.jobTitle}</strong> at <strong>${company.companyName}</strong> has been accepted.</p>
      <p>Job Details:</p>
      <ul>
        <li>Position: ${job.jobTitle}</li>
        <li>Company: ${company.companyName}</li>
        <li>Location: ${job.jobLocation}</li>
      </ul>
      ${notes ? `<p>Additional Notes: ${notes}</p>` : ''}
      <p>Someone from our HR team will contact you soon with more details about the next steps.</p>
      <p>Thank you for your interest in joining our team!</p>
      <p>Best regards,<br>The ${company.companyName} Team</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html
  });
};

// Send rejection email to applicant
const sendRejectionEmail = async (user, job, company, notes) => {
  const subject = 'Update on Your Job Application';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a4a4a;">Application Status Update</h2>
      <p>Hi ${user.firstName},</p>
      <p>Thank you for your interest in the ${job.jobTitle} position at ${company.companyName}.</p>
      <p>After careful consideration of your application, we regret to inform you that we have decided to move forward with other candidates who more closely match our current requirements.</p>
      ${notes ? `<p>Additional Feedback: ${notes}</p>` : ''}
      <p>We appreciate the time you invested in applying and encourage you to apply for future positions that match your skills and experience.</p>
      <p>We wish you the best in your job search and future career endeavors.</p>
      <p>Best regards,<br>The ${company.companyName} Team</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html
  });
};

// Send application status update email
const sendApplicationStatusEmail = async (user, job, company, status) => {
  const statusMessages = {
    'viewed': 'Your application has been reviewed',
    'in consideration': 'Your application is being considered',
    'accepted': 'Congratulations! Your application has been accepted',
    'rejected': 'Your application has been declined'
  };
  
  const subject = `Job Search App - Application Status Update: ${statusMessages[status] || 'Status Updated'}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a4a4a;">Application Status Update</h2>
      <p>Hi ${user.firstName},</p>
      <p>${statusMessages[status] || 'Your application status has been updated'} for the position of <strong>${job.jobTitle}</strong> at <strong>${company.companyName}</strong>.</p>
      <p>Current Status: <strong>${status.charAt(0).toUpperCase() + status.slice(1)}</strong></p>
      <p>If you have any questions, please don't hesitate to contact the HR team.</p>
      <p>Thank you,<br>The Job Search App Team</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html
  });
};

// Send notification to HR about new application
const sendNewApplicationNotificationEmail = async (hr, applicant, job) => {
  const subject = 'Job Search App - New Job Application';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a4a4a;">New Job Application Received</h2>
      <p>Hi ${hr.firstName},</p>
      <p>A new application has been submitted for the <strong>${job.jobTitle}</strong> position.</p>
      <p>Applicant Details:</p>
      <ul>
        <li>Name: ${applicant.firstName} ${applicant.lastName}</li>
        <li>Email: ${applicant.email}</li>
      </ul>
      <p>Please log in to the Job Search App to review this application.</p>
      <p>Thank you,<br>The Job Search App Team</p>
    </div>
  `;
  
  return await sendEmail({
    email: hr.email,
    subject,
    html
  });
};



// Export all email functions
module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendApplicationConfirmationEmail,
  sendApplicationStatusEmail,
  sendNewApplicationNotificationEmail,
  sendAcceptanceEmail,
  sendRejectionEmail
};