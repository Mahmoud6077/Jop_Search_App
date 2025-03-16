const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const schema = require('../schemas/graphql/schema');
const { graphqlContext } = require('../middlewares/graphql.middleware');
const { verifyToken, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

// GraphQL endpoint with authentication and admin-only access
router.use('/',
  // First verify the token
  verifyToken,
  // Then restrict to admin only
  restrictTo('Admin'),
  // Then set up GraphQL
  async (req, res, next) => {
    // Create context with user information
    const context = await graphqlContext(req);
    
    // Set up GraphQL HTTP endpoint
    return graphqlHTTP({
      schema,
      context,
      graphiql: process.env.NODE_ENV === 'development', // Enable GraphiQL in development
      customFormatErrorFn: (err) => {
        console.error(err);
        return {
          message: err.message,
          locations: err.locations,
          stack: process.env.NODE_ENV === 'development' ? err.stack.split('\n') : null,
          path: err.path,
        };
      }
    })(req, res, next);
  }
);

module.exports = router;