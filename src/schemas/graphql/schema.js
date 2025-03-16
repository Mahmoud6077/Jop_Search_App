const { makeExecutableSchema } = require('@graphql-tools/schema');
const User = require('../../models/user.model');
const Company = require('../../models/company.model');
const Job = require('../../models/job.model');
const Application = require('../../models/application.model');

// Define the GraphQL schema
const typeDefs = `
  type File {
    secure_url: String
    public_id: String
  }

  type OTP {
    code: String
    type: String
    expiresIn: String
  }
  
  type User {
    id: ID!
    firstName: String
    lastName: String
    username: String
    email: String
    provider: String
    gender: String
    DOB: String
    mobileNumber: String
    role: String
    isConfirmed: Boolean
    deletedAt: String
    bannedAt: String
    updatedBy: User
    changeCredentialTime: String
    profilePic: File
    coverPic: File
    OTP: [OTP]
    createdAt: String
    updatedAt: String
  }
  
  type Company {
    id: ID!
    companyName: String
    description: String
    industry: String
    address: String
    numberOfEmployees: String
    companyEmail: String
    createdBy: User
    Logo: File
    coverPic: File
    HRs: [User]
    bannedAt: String
    deletedAt: String
    legalAttachment: File
    approvedByAdmin: Boolean
    createdAt: String
    updatedAt: String
    jobs: [Job]
  }
  
  type Job {
    id: ID!
    jobTitle: String
    jobLocation: String
    workingTime: String
    seniorityLevel: String
    jobDescription: String
    technicalSkills: [String]
    softSkills: [String]
    addedBy: User
    updatedBy: User
    closed: Boolean
    companyId: Company
    createdAt: String
    updatedAt: String
    applications: [Application]
  }
  
  type Application {
    id: ID!
    jobId: Job
    userId: User
    userCV: File
    status: String
    notes: String
    reviewedBy: User
    reviewedAt: String
    createdAt: String
    updatedAt: String
  }
  
  type Query {
    users(includeDeleted: Boolean): [User]
    user(id: ID!): User
    companies(includeDeleted: Boolean): [Company]
    company(id: ID!): Company
    jobs(companyId: ID): [Job]
    job(id: ID!): Job
    applications(jobId: ID, companyId: ID): [Application]
    application(id: ID!): Application
    dashboard: DashboardData
  }
  
  type DashboardData {
    users: [User]
    companies: [Company]
    jobs: [Job]
    applications: [Application]
    stats: Stats
  }
  
  type Stats {
    totalUsers: Int
    totalCompanies: Int
    totalJobs: Int
    totalApplications: Int
    pendingCompanies: Int
    bannedUsers: Int
    bannedCompanies: Int
  }
  
  type Mutation {
    banUser(id: ID!): User
    unbanUser(id: ID!): User
    banCompany(id: ID!): Company
    unbanCompany(id: ID!): Company
    approveCompany(id: ID!): Company
  }
`;

// Define the resolvers
const resolvers = {
  Query: {
    // User queries
    users: async (_, { includeDeleted }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      const query = includeDeleted ? {} : { deletedAt: null };
      return await User.find(query).populate('updatedBy');
    },
    
    user: async (_, { id }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      return await User.findById(id).populate('updatedBy');
    },
    
    // Company queries
    companies: async (_, { includeDeleted }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      const query = includeDeleted ? {} : { deletedAt: null };
      return await Company.find(query)
        .populate('createdBy')
        .populate('HRs');
    },
    
    company: async (_, { id }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      return await Company.findById(id)
        .populate('createdBy')
        .populate('HRs');
    },
    
    // Job queries
    jobs: async (_, { companyId }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      const query = companyId ? { companyId } : {};
      return await Job.find(query)
        .populate('addedBy')
        .populate('updatedBy')
        .populate('companyId');
    },
    
    job: async (_, { id }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      return await Job.findById(id)
        .populate('addedBy')
        .populate('updatedBy')
        .populate('companyId');
    },
    
    // Application queries
    applications: async (_, { jobId, companyId }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      let query = {};
      if (jobId) {
        query.jobId = jobId;
      } else if (companyId) {
        const jobs = await Job.find({ companyId });
        const jobIds = jobs.map(job => job._id);
        query.jobId = { $in: jobIds };
      }
      
      return await Application.find(query)
        .populate('jobId')
        .populate('userId')
        .populate('reviewedBy');
    },
    
    application: async (_, { id }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      return await Application.findById(id)
        .populate('jobId')
        .populate('userId')
        .populate('reviewedBy');
    },
    
    // Dashboard data (gets all data in one query)
    dashboard: async (_, args, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      const [users, companies, jobs, applications] = await Promise.all([
        User.find({}).populate('updatedBy'),
        Company.find({}).populate('createdBy').populate('HRs'),
        Job.find({}).populate('addedBy').populate('updatedBy').populate('companyId'),
        Application.find({}).populate('jobId').populate('userId').populate('reviewedBy')
      ]);
      
      // Calculate stats
      const stats = {
        totalUsers: users.length,
        totalCompanies: companies.length,
        totalJobs: jobs.length,
        totalApplications: applications.length,
        pendingCompanies: companies.filter(c => !c.approvedByAdmin).length,
        bannedUsers: users.filter(u => u.bannedAt).length,
        bannedCompanies: companies.filter(c => c.bannedAt).length
      };
      
      return {
        users,
        companies,
        jobs,
        applications,
        stats
      };
    }
  },
  
  // Define relationships between types
  Company: {
    jobs: async (company) => {
      return await Job.find({ companyId: company._id });
    }
  },
  
  Job: {
    applications: async (job) => {
      return await Application.find({ jobId: job._id });
    }
  },
  
  // Mutations for admin actions
  Mutation: {
    banUser: async (_, { id }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      
      user.bannedAt = new Date();
      user.updatedBy = context.user._id;
      await user.save();
      
      return user;
    },
    
    unbanUser: async (_, { id }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      
      user.bannedAt = null;
      user.updatedBy = context.user._id;
      await user.save();
      
      return user;
    },
    
    banCompany: async (_, { id }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      const company = await Company.findById(id);
      if (!company) {
        throw new Error('Company not found');
      }
      
      company.bannedAt = new Date();
      await company.save();
      
      return company;
    },
    
    unbanCompany: async (_, { id }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      const company = await Company.findById(id);
      if (!company) {
        throw new Error('Company not found');
      }
      
      company.bannedAt = null;
      await company.save();
      
      return company;
    },
    
    approveCompany: async (_, { id }, context) => {
      // Check if user is admin
      if (context.user?.role !== 'Admin') {
        throw new Error('Not authorized');
      }
      
      const company = await Company.findById(id);
      if (!company) {
        throw new Error('Company not found');
      }
      
      company.approvedByAdmin = true;
      await company.save();
      
      return company;
    }
  }
};

// Create the executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

module.exports = schema;