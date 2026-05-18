# Names & Schools Directory

A beautiful web interface for displaying and managing a list of names and their associated schools with persistent data storage.

## Features

- 📝 Add new people with their schools
- 🔍 Search by name or school
- 🗑️ Delete entries easily
- 📱 Mobile-responsive design
- ✨ Beautiful, modern UI
- 💾 **Persistent data storage** - Works on web servers!

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open your browser to: `http://localhost:3000`

## Configuration

### Default Data

You can set the initial data in two ways:

1. **Recommended**: Edit `default-data.json` - Clean, structured JSON format
2. **Alternative**: Keep your original `list` file - The server will parse it automatically

When the server starts for the first time, it will:

- Look for `default-data.json` first
- If not found, parse the `list` file
- If neither exists, start with an empty list

### Changing Default Data

- **Easy way**: Edit [default-data.json](default-data.json)
- **Reset to defaults**: Use the "Reset to Original List" button in the web interface

### Option 1: Node.js Server (Recommended)

- Upload all files to your web server
- Run `npm install` on the server
- Run `npm start`
- Data is stored in a `people-data.json` file

### Option 2: Static Hosting (Heroku, Netlify, Vercel)

- For Heroku: Include the `package.json` and `server.js`
- For Netlify/Vercel: Use their Node.js functions for the API

### Option 3: Database Backend

- Replace the JSON file storage with a database (PostgreSQL, MySQL, etc.)
- Modify the API endpoints in `server.js`

## File Structure

- `index.html` - Main webpage
- `server.js` - Node.js backend API
- `package.json` - Dependencies and scripts
- `people-data.json` - Data storage (created automatically)
- `README.md` - This file

## API Endpoints

- `GET /api/people` - Get all people
- `POST /api/people` - Add a new person
- `DELETE /api/people/:id` - Delete a person
- `POST /api/reset` - Reset to original data
