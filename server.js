const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'people-data.json');

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Load default data from file
const loadDefaultData = async () => {
    try {
        // Option 1: Load from default-data.json (clean and easily editable)
        const defaultDataFile = path.join(__dirname, 'default-data.json');
        try {
            const content = await fs.readFile(defaultDataFile, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.log('No default-data.json found, trying to parse list file...');
        }

        // Option 2: Parse the original list file (fallback)
        const listContent = await fs.readFile(path.join(__dirname, 'list'), 'utf8');
        const lines = listContent.split('\n').filter(line => line.trim());
        
        const people = [];
        let currentName = null;
        let id = 1;
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('*')) continue;
            
            // Check if this looks like a school code (all caps, short)
            if (trimmed === trimmed.toUpperCase() && trimmed.length <= 6) {
                if (currentName) {
                    people.push({
                        id: id++,
                        name: currentName,
                        school: trimmed
                    });
                    currentName = null;
                }
            } else {
                // This is a name
                if (currentName) {
                    console.warn(`No school found for: ${currentName}`);
                }
                currentName = trimmed;
            }
        }
        
        return { people, nextId: id };
    } catch (error) {
        console.error('Could not load default data, starting with empty list:', error);
        return { people: [], nextId: 1 };
    }
};

// Initialize data file if it doesn't exist
const initDataFile = async () => {
    try {
        await fs.access(DATA_FILE);
    } catch (error) {
        const defaultData = await loadDefaultData();
        await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
    }
};

// API Routes
app.get('/api/people', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

app.post('/api/people', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const jsonData = JSON.parse(data);
        
        const { name, school } = req.body;
        const newPerson = {
            id: jsonData.nextId++,
            name,
            school
        };
        
        jsonData.people.push(newPerson);
        await fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2));
        
        res.json(newPerson);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add person' });
    }
});

app.delete('/api/people/:id', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const jsonData = JSON.parse(data);
        
        const id = parseInt(req.params.id);
        jsonData.people = jsonData.people.filter(person => person.id !== id);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete person' });
    }
});

app.post('/api/reset', async (req, res) => {
    try {
        const defaultData = await loadDefaultData();
        await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
        res.json(defaultData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset data' });
    }
});

// Start server
initDataFile().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});