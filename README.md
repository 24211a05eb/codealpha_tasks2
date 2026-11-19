# Mini Social Media Platform

A responsive mini social network built with vanilla HTML, CSS and JavaScript, Express.js, MongoDB 9.0 and Mongoose.

## Architecture

- `frontend/` - static SPA, authentication screens, feed, profiles and search
- `backend/` - Express REST API
- `backend/models/` - Mongoose schemas for users, posts, comments and follow relationships
- `backend/routes/` - auth, user, post and comment endpoints
- `backend/middleware/` - JWT authentication

MongoDB collections:

- `users` - profiles and login credentials
- `posts` - post content and an array of unique liking user references
- `comments` - comments linked to posts and authors
- `followers` - unique follower/following relationships

## Install

Requirements: Node.js 20+ and MongoDB 9.0.

```powershell
npm install
copy .env.example .env
```

Start MongoDB on Windows:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\mongodb-mini-social" | Out-Null
& "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "$env:USERPROFILE\mongodb-mini-social" --bind_ip 127.0.0.1 --port 27017
```

Set the environment values in `.env`, then start the app:

```powershell
npm start
```

Open `http://localhost:3000`.

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users/search?q=term`
- `GET /api/users/:username`
- `PUT /api/users/me/profile`
- `PUT /api/users/:username/follow`
- `DELETE /api/users/:username/follow`
- `GET /api/posts`
- `POST /api/posts`
- `PUT /api/posts/:id/like`
- `DELETE /api/posts/:id/like`
- `DELETE /api/posts/:id`
- `POST /api/comments/:postId`
- `DELETE /api/comments/:id`

Protected endpoints require `Authorization: Bearer <token>`.
