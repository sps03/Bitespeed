# Bitespeed

## Features

- ✅ Links customer contacts based on shared email or phone number
- ✅ Maintains primary/secondary contact hierarchy
- ✅ Handles contact consolidation when separate identities are linked
- ✅ RESTful API with comprehensive error handling
- ✅ PostgreSQL database with proper indexing
- ✅ TypeScript for type safety
- ✅ Production-ready with Docker support

## API Usage

### POST /identify

Identifies and consolidates customer contact information.

**Request Body:**
```json
{
  "email": "customer@example.com",
  "phoneNumber": "1234567890"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["customer@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Run development server: `npm run dev`

## Deployment

This service can be deployed on:
- Railway (Free tier)
- Render (Free tier)
- Heroku (Free tier discontinued, paid plans available)

Database can be hosted on:
- Supabase (Free PostgreSQL)
- Railway PostgreSQL (Free tier)
- ElephantSQL (Free tier)

## Testing Examples

```bash
# Test 1: Create new primary contact
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'

# Test 2: Link with new email, same phone
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'

# Test 3: Query with existing info
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"123456"}'
```