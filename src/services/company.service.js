const Company = require('../models/company.model');

// Business logic for company-related operations
const isUserCompanyHR = async (userId, companyId) => {
  const company = await Company.findById(companyId);
  if (!company) return false;
  
  return company.createdBy.equals(userId) || company.HRs.some(hr => hr.equals(userId));
};

module.exports = {
  isUserCompanyHR
};