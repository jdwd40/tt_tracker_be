# Authentication Middleware

This document explains how to use the authentication middleware to protect your API routes.

## Overview

The authentication middleware verifies JWT access tokens and adds user information to the request object for protected routes. It's designed to work with the existing auth module that handles user registration, login, and token management.

## Available Middleware Functions

### `authenticateToken`

The main authentication middleware that requires a valid JWT access token.

```typescript
import { authenticateToken } from '../middleware/auth';

// Protected route - requires authentication
router.get('/protected', authenticateToken, (req, res) => {
  // req.user is now available with the authenticated user's information
  res.json({
    data: {
      message: `Hello ${req.user!.email}!`,
      user_id: req.user!.id
    }
  });
});
```

### `optionalAuth`

Optional authentication middleware that doesn't fail if no token is provided. Useful for routes that can work with or without authentication.

```typescript
import { optionalAuth } from '../middleware/auth';

// Optional authentication route
router.get('/public', optionalAuth, (req, res) => {
  if (req.user) {
    // User is authenticated
    res.json({ data: { message: `Hello ${req.user.email}!` } });
  } else {
    // No authentication provided
    res.json({ data: { message: 'Hello guest!' } });
  }
});
```

### `requireRole`

Role-based authorization middleware (for future use). Currently just checks if user is authenticated.

```typescript
import { requireRole } from '../middleware/auth';

// Role-based protected route
router.get('/admin', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({ data: { message: 'Admin access granted' } });
});
```

## Request Object Extension

The middleware extends the Express Request interface to include user information:

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

The `req.user` object contains:
- `id`: User's unique identifier
- `email`: User's email address
- `password_hash`: Hashed password (for internal use)
- `timezone`: User's timezone
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

## Error Handling

The middleware provides specific error messages for different authentication failures:

- **No token provided**: `"Access token is required"`
- **Invalid token format**: `"Access token is required"`
- **Invalid token signature**: `"Invalid access token"`
- **Expired token**: `"Access token has expired"`
- **Wrong token type**: `"Invalid token type"` (when using refresh token as access token)

All errors return HTTP status code `401 Unauthorized` with a standardized error format:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token is required"
  }
}
```

## Usage Examples

### Basic Protected Route

```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    data: {
      user_id: req.user!.id,
      email: req.user!.email,
      timezone: req.user!.timezone
    }
  });
});

export { router as profileRouter };
```

### Multiple Middleware Functions

```typescript
import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateInput } from '../middleware/validation';

const router = Router();

router.post('/admin/users', 
  authenticateToken,           // Require authentication
  requireRole('admin'),        // Require admin role
  validateInput(userSchema),   // Validate input
  (req, res) => {
    // Handle admin user creation
    res.json({ data: { message: 'User created' } });
  }
);

export { router as adminRouter };
```

### Conditional Authentication

```typescript
import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/posts', optionalAuth, (req, res) => {
  if (req.user) {
    // Return personalized content for authenticated users
    res.json({
      data: {
        posts: getPersonalizedPosts(req.user.id),
        user: req.user.email
      }
    });
  } else {
    // Return public content for anonymous users
    res.json({
      data: {
        posts: getPublicPosts(),
        user: null
      }
    });
  }
});

export { router as postsRouter };
```

## Security Considerations

1. **Token Expiration**: Access tokens expire after 15 minutes for security
2. **Database Validation**: The middleware verifies that the user still exists in the database
3. **Token Type Validation**: Ensures only access tokens are used for API access
4. **Error Handling**: Provides specific error messages without leaking sensitive information
5. **Request Extension**: Safely extends the Express Request interface with user data

## Testing

The middleware includes comprehensive tests that verify:
- Valid token access
- Missing token rejection
- Invalid token rejection
- Wrong token type rejection
- Malformed authorization header handling
- Empty token handling

Run the tests with:
```bash
npm test -- tests/auth-middleware.test.ts
```

## Integration with Existing Auth Module

The authentication middleware works seamlessly with the existing auth module:

1. **Registration**: Users register and get no tokens initially
2. **Login**: Users login and receive access + refresh tokens
3. **Protected Routes**: Use access tokens with the middleware
4. **Token Refresh**: Use refresh tokens to get new access tokens
5. **Logout**: Invalidate refresh tokens

This creates a complete authentication flow for your time tracking application.
