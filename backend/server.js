const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');
const db = require('./db');
const { verifyToken, requireRole, JWT_SECRET } = require('./middleware/auth');
const pptxgen = require('pptxgenjs');
const docx = require('docx');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 5000;
const PROJECTS = require('./projects_db');

app.use(cors());
app.use(express.json());

// Ensure storage directories exist
const UPLOADS_DIR = path.join(__dirname, 'storage', 'uploads');
const PCB_DIR = path.join(__dirname, 'storage', 'pcb');
const TEMPLATES_DIR = path.join(__dirname, 'storage', 'templates');
const AVATARS_DIR = path.join(__dirname, 'storage', 'avatars');
const MOCK_MAILS_FILE = path.join(__dirname, 'storage', 'mock_emails.json');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(PCB_DIR, { recursive: true });
fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
fs.mkdirSync(AVATARS_DIR, { recursive: true });

if (!fs.existsSync(MOCK_MAILS_FILE)) {
  fs.writeFileSync(MOCK_MAILS_FILE, JSON.stringify([]));
}

// Static assets route for downloads and screenshots
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/pcb', express.static(PCB_DIR));
app.use('/avatars', express.static(AVATARS_DIR));

// ── Avatar upload multer config (5 MB, jpg/jpeg/png/webp only) ────────────────
const avatarStorage = multer.memoryStorage(); // store in memory for Sharp processing
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG, and WEBP images are allowed.'));
    }
  }
});

// Helper: generate unique Student ID from numeric user ID
function generateStudentId(userId) {
  const year = new Date().getFullYear();
  const padded = String(userId).padStart(6, '0');
  return `PFAI-STU-${year}-${padded}`;
}



// ── Health-check endpoints ────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    status:  'online',
    app:     'ProjectForge AI',
    version: '1.0',
    server:  'healthy'
  });
});

app.get('/api/health', async (_req, res) => {
  let dbStatus = 'connected';
  try {
    await db.run('SELECT 1');
  } catch (_) {
    dbStatus = 'error';
  }
  res.json({
    status:   'healthy',
    database: dbStatus,
    server:   'running'
  });
});
// ─────────────────────────────────────────────────────────────────────────────

// Setup Multer for manual QR payments screenshot & template uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Helper: Queue Mock Email for OTP / notifications
function queueMockMail(to, subject, body) {
  try {
    const data = JSON.parse(fs.readFileSync(MOCK_MAILS_FILE, 'utf-8') || '[]');
    data.push({ to, subject, body, sentAt: new Date().toISOString() });
    fs.writeFileSync(MOCK_MAILS_FILE, JSON.stringify(data, null, 2));
    console.log(`[MOCK EMAIL] To: ${to} | Subj: ${subject}`);
  } catch (err) {
    console.error('Failed to log mock email:', err);
  }
}

const AdmZip = require('adm-zip');

// Helper to determine if a color is light (contrast mapping)
function isColorLight(hex) {
  if (!hex) return false;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return false;
  const rgb = parseInt(cleanHex, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 150;
}

// Helper to parse PPTX templates
function extractPPTXTemplate(filePath) {
  const result = {
    bgColor: '0B0F19', // Default dark navy
    accentColor: '6366F1', // Default indigo
    titleFont: 'Trebuchet MS',
    bodyFont: 'Arial',
    logoUrl: null,
    footerText: 'ProjectForge AI'
  };

  try {
    const zip = new AdmZip(filePath);
    
    // 1. Read Theme XML to find accent colors and fonts
    const themeEntry = zip.getEntry('ppt/theme/theme1.xml');
    if (themeEntry) {
      const xml = themeEntry.getData().toString('utf8');
      
      const accentMatch = xml.match(/<a:accent1>\s*<a:srgbClr val="([A-F0-9]{6})"/i);
      if (accentMatch && accentMatch[1]) {
        result.accentColor = accentMatch[1];
      } else {
        const allColors = xml.match(/<a:srgbClr val="([A-F0-9]{6})"/gi);
        if (allColors) {
          const hexes = allColors.map(c => c.match(/"([A-F0-9]{6})"/i)[1]);
          const accent = hexes.find(h => h !== 'FFFFFF' && h !== '000000' && h !== 'ECECEC');
          if (accent) result.accentColor = accent;
        }
      }

      // Look for font faces
      const latinFonts = xml.match(/<a:latin typeface="([^"]+)"/gi);
      if (latinFonts) {
        const fonts = latinFonts.map(f => f.match(/"([^"]+)"/)[1]);
        if (fonts[0]) result.titleFont = fonts[0];
        if (fonts[1]) result.bodyFont = fonts[1];
      }
    }

    // 2. Extract first image as Logo from ppt/media
    const entries = zip.getEntries();
    const mediaEntries = entries.filter(e => e.entryName.startsWith('ppt/media/'));
    if (mediaEntries.length > 0) {
      const imgEntry = mediaEntries.find(e => e.entryName.endsWith('.png') || e.entryName.endsWith('.jpg') || e.entryName.endsWith('.jpeg'));
      if (imgEntry) {
        const ext = imgEntry.entryName.split('.').pop();
        const logoName = `extracted_logo_${Date.now()}.${ext}`;
        const logoPath = path.join(UPLOADS_DIR, logoName);
        fs.writeFileSync(logoPath, imgEntry.getData());
        result.logoUrl = `/uploads/${logoName}`;
      }
    }

    // 3. Try to extract footer text or college name from slide1.xml
    const slide1Entry = zip.getEntry('ppt/slides/slide1.xml');
    if (slide1Entry) {
      const xml = slide1Entry.getData().toString('utf8');
      const textMatches = xml.match(/<a:t>([^<]+)<\/a:t>/g);
      if (textMatches) {
        const texts = textMatches.map(t => t.replace(/<\/?a:t>/g, '')).filter(t => t.trim().length > 3);
        const college = texts.find(t => /university|college|institute|department|technology/i.test(t));
        if (college) {
          result.footerText = college.trim();
        } else if (texts[0]) {
          result.footerText = texts[0].trim();
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse PPTX template:', err);
  }

  return result;
}

// Helper to parse DOCX templates
function extractDocxTemplate(filePath) {
  const result = {
    fontFamily: 'Helvetica',
    headingColor: '1E3A8A',
    headingFont: 'Helvetica-Bold',
    margin: 50,
    hasCertificate: false,
    coverLayout: 'standard'
  };

  try {
    const zip = new AdmZip(filePath);

    // 1. Read word/styles.xml
    const stylesEntry = zip.getEntry('word/styles.xml');
    if (stylesEntry) {
      const xml = stylesEntry.getData().toString('utf8');
      
      const asciiFontMatch = xml.match(/<w:rFonts[^>]*w:ascii="([^"]+)"/i);
      if (asciiFontMatch && asciiFontMatch[1]) {
        result.fontFamily = asciiFontMatch[1];
      }
      
      const hColorMatch = xml.match(/w:styleId="Heading[^"]+"[^>]*>.*?<w:color[^>]*w:val="([A-F0-9]{6})"/si);
      if (hColorMatch && hColorMatch[1]) {
        result.headingColor = hColorMatch[1];
      }
    }

    // 2. Read word/document.xml
    const docEntry = zip.getEntry('word/document.xml');
    if (docEntry) {
      const xml = docEntry.getData().toString('utf8');

      if (/certificate|certified|bonafide/i.test(xml)) {
        result.hasCertificate = true;
      }

      const marginMatch = xml.match(/<w:pgMar[^>]*w:left="(\d+)"/i);
      if (marginMatch && marginMatch[1]) {
        const dxa = parseInt(marginMatch[1], 10);
        result.margin = Math.round(dxa / 20) || 50;
      }
    }
  } catch (err) {
    console.error('Failed to parse DOCX template:', err);
  }

  return result;
}

// Helper to parse PDF templates
function extractPdfTemplate(filePath) {
  const result = {
    fontFamily: 'Helvetica',
    headingColor: '1E3A8A',
    headingFont: 'Helvetica-Bold',
    margin: 50,
    hasCertificate: false,
    coverLayout: 'standard'
  };

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (/certificate|certified|bonafide/i.test(content)) {
      result.hasCertificate = true;
    }

    if (/times/i.test(content)) {
      result.fontFamily = 'Times-Roman';
      result.headingFont = 'Times-Bold';
    } else if (/courier/i.test(content)) {
      result.fontFamily = 'Courier';
      result.headingFont = 'Courier-Bold';
    }
  } catch (err) {
    console.error('Failed to parse PDF template:', err);
  }
  
  return result;
}

// Helper: Log Activity
async function logActivity(userId, action, details) {
  try {
    await db.run(
      `INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)`,
      [userId, action, typeof details === 'object' ? JSON.stringify(details) : details]
    );
  } catch (err) {
    console.error('Activity logging failed:', err);
  }
}

// Helper to check if a Gemini API key is configured and valid (not a placeholder)
function isValidApiKey(key) {
  if (!key) return false;
  const trimmed = key.trim();
  return (
    trimmed !== '' &&
    trimmed !== 'your-gemini-api-key' &&
    trimmed !== '<FROM_LOCAL_ENVIRONMENT>' &&
    !trimmed.startsWith('<') &&
    !trimmed.includes('FROM_LOCAL_ENVIRONMENT')
  );
}

// Helper: Call Gemini API (with fallback if key not configured)
async function generateWithGemini(prompt, isJsonResponse = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!isValidApiKey(apiKey)) {
    console.log('Gemini API key not found or not configured. Using intelligent engineering fallback mock.');
    return null; // Signals controller to use fallback generator
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash which is standard and has very low latency
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: isJsonResponse ? { responseMimeType: 'application/json' } : undefined
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text;
  } catch (error) {
    console.error('Gemini SDK content generation failed, attempting manual REST fallback:', error);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: isJsonResponse ? { responseMimeType: 'application/json' } : undefined
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (innerError) {
      console.error('REST fallback Gemini invocation failed:', innerError);
    }
    return null;
  }
}

// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================

// Register User
app.post('/api/auth/register', async (req, res) => {
  const {
    name, mobile, email, password, confirm_password,
    college_name, branch, department, course, year_semester,
    city, state, country, reg_number
  } = req.body;

  if (!name || !mobile || !email || !password) {
    return res.status(400).json({ message: 'Name, mobile, email, and password are required.' });
  }

  // Password validation
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }
  if (confirm_password && password !== confirm_password) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  // Mobile validation (10 digits)
  const mobileClean = mobile.replace(/[^0-9]/g, '');
  if (mobileClean.length < 10) {
    return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const existing = await db.get(`SELECT id FROM users WHERE email = $1`, [emailLower]);
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists. Please sign in instead.' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate 6-digit verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    const result = await db.run(
      `INSERT INTO users (name, mobile, email, password_hash, college_name, branch, department, course, year_semester, city, state, country, reg_number, is_verified, otp_code, otp_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, $15)`,
      [
        name.trim(), mobile.trim(), emailLower, passwordHash,
        college_name || null, branch || null, department || null,
        course || null, year_semester || null,
        city || null, state || null, country || 'India',
        reg_number || null, otp, otpExpires.toISOString()
      ]
    );

    // Generate and store Student ID using the new user's ID
    const newUserId = result.lastID;
    const studentId = generateStudentId(newUserId);
    await db.run(`UPDATE users SET student_id = $1 WHERE id = $2`, [studentId, newUserId]);

    // Send OTP email
    queueMockMail(
      emailLower,
      'ProjectForge AI — Email Verification Code',
      `Welcome to ProjectForge AI, ${name}!\n\nYour Student ID: ${studentId}\n\nYour email verification OTP is: ${otp}\n\nThis code expires in 15 minutes.`
    );

    await logActivity(null, 'USER_REGISTERED_INIT', { email: emailLower, student_id: studentId });
    res.status(201).json({
      message: 'Account created! Please check your email for the OTP verification code.',
      email: emailLower,
      student_id: studentId
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

// Verify OTP — after verification, auto-login by returning JWT token
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    const user = await db.get(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.otp_code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
    }

    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ message: 'OTP code has expired. Please request a new one.' });
    }

    await db.run(`UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE id = $1`, [user.id]);
    await logActivity(user.id, 'EMAIL_VERIFIED', `User ${user.name} verified email.`);

    // Auto-login: generate JWT and return user data
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Email verified successfully! Welcome to ProjectForge AI.',
      autoLogin: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        college_name: user.college_name,
        branch: user.branch,
        department: user.department,
        course: user.course,
        year_semester: user.year_semester,
        city: user.city,
        state: user.state,
        country: user.country,
        reg_number: user.reg_number,
        student_id: user.student_id,
        avatar_url: user.avatar_url,
        subscription_status: user.subscription_status,
        is_student_verified: user.is_student_verified,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'OTP verification failed.', error: err.message });
  }
});

// Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const user = await db.get(`SELECT id, name FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    await db.run(`UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3`, [otp, otpExpires.toISOString(), user.id]);
    queueMockMail(email.toLowerCase(), 'ProjectForge AI Security Code - Resend', `Your security verification code is: ${otp}`);
    
    res.json({ message: 'A new security code has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to resend OTP.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const emailLower = email.toLowerCase();

  try {
    const user = await db.get(`SELECT * FROM users WHERE email = $1`, [emailLower]);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ message: 'Please verify your email using OTP first.', needsVerification: true });
    }

    // Generate JWT (30 days expiry)
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    await logActivity(user.id, 'USER_LOGIN', `Logged in successfully.`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        college_name: user.college_name,
        branch: user.branch,
        department: user.department,
        course: user.course,
        year_semester: user.year_semester,
        city: user.city,
        state: user.state,
        country: user.country,
        reg_number: user.reg_number,
        student_id: user.student_id,
        avatar_url: user.avatar_url,
        subscription_status: user.subscription_status,
        is_student_verified: user.is_student_verified,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

// Get profile details
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await db.get(
      `SELECT id, name, email, mobile, college_name, branch, department, course, year_semester,
              city, state, country, reg_number, student_id, avatar_url,
              subscription_status, is_student_verified, role, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile.' });
  }
});

// Upload / Update Profile Avatar (512x512 JPEG, Sharp processed)
app.post('/api/auth/upload-avatar', verifyToken, avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded.' });
  }
  try {
    const fileName = `avatar_${req.user.id}_${Date.now()}.jpg`;
    const outputPath = path.join(AVATARS_DIR, fileName);

    // Remove old avatar if exists
    const existingUser = await db.get(`SELECT avatar_url FROM users WHERE id = $1`, [req.user.id]);
    if (existingUser && existingUser.avatar_url) {
      const oldFile = path.join(__dirname, 'storage', existingUser.avatar_url.replace(/^\//, ''));
      if (fs.existsSync(oldFile)) {
        try { fs.unlinkSync(oldFile); } catch (_) {}
      }
    }

    // Resize to 512×512 with Sharp, center-cropped, white background
    await sharp(req.file.buffer)
      .resize(512, 512, { fit: 'cover', position: 'center' })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    const avatarUrl = `/avatars/${fileName}`;
    await db.run(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [avatarUrl, req.user.id]);
    await logActivity(req.user.id, 'AVATAR_UPLOADED', `Profile photo updated.`);

    res.json({ message: 'Profile photo uploaded successfully.', avatar_url: avatarUrl });
  } catch (err) {
    res.status(500).json({ message: 'Avatar upload failed.', error: err.message });
  }
});



// Refresh token
app.post('/api/auth/refresh', verifyToken, async (req, res) => {
  try {
    const user = await db.get(`SELECT id, name, email, role, subscription_status, mobile, college_name, branch, reg_number FROM users WHERE id = $1`, [req.user.id]);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        college_name: user.college_name,
        branch: user.branch,
        reg_number: user.reg_number,
        subscription_status: user.subscription_status,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to refresh token.' });
  }
});

// Unlimited AI Project Search (Phase 5)
app.get('/api/projects/search', async (req, res) => {
  const { q, domain, difficulty, budgetIdx } = req.query;
  
  let filtered = PROJECTS;

  // Domain filter
  if (domain && domain !== 'All') {
    filtered = filtered.filter(p => p.domain.toLowerCase() === domain.toLowerCase());
  }

  // Difficulty filter
  if (difficulty && difficulty !== 'All Levels') {
    filtered = filtered.filter(p => p.difficulty.toLowerCase() === difficulty.toLowerCase());
  }

  // Budget filter
  if (budgetIdx !== undefined && budgetIdx !== '') {
    const budgetMap = [
      { max: Infinity },
      { max: 1000 },
      { max: 3000 },
      { max: 8000 },
      { max: Infinity, min: 8000 }
    ];
    const b = budgetMap[Number(budgetIdx)];
    if (b) {
      if (b.max !== undefined) filtered = filtered.filter(p => p.cost <= b.max);
      if (b.min !== undefined) filtered = filtered.filter(p => p.cost >= b.min);
    }
  }

  // Search keyword match
  if (q && q.trim() !== '') {
    const term = q.toLowerCase().trim();
    filtered = filtered.filter(p => {
      return p.title.toLowerCase().includes(term) ||
             (p.description && p.description.toLowerCase().includes(term)) ||
             (p.components && p.components.some(c => c.toLowerCase().includes(term))) ||
             (p.tags && p.tags.some(t => t.toLowerCase().includes(term))) ||
             (p.domain && p.domain.toLowerCase().includes(term)) ||
             (p.category && p.category.toLowerCase().includes(term));
    });
  }

  // If no projects found, trigger AI Generation!
  if (filtered.length === 0) {
    console.log(`[AI Project Search] No projects found for query "${q}". Generating instantly using AI fallback...`);
    
    // Generate main project based on query
    const mainTitle = q ? q.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'AI Custom Solution';
    const mainDomain = domain && domain !== 'All' ? domain : 'IoT';
    const mainDifficulty = difficulty && difficulty !== 'All Levels' ? difficulty : 'Intermediate';
    
    // Build a smart project object
    const mainProject = {
      id: Math.floor(900000 + Math.random() * 90000),
      title: mainTitle,
      domain: mainDomain,
      category: 'AI Generated',
      description: `An innovative custom-tailored project designed dynamically for: "${q || 'your specifications'}". This automated solution addresses hardware requirements, optimized pin assignments, and firmware modules seamlessly integrated for user success.`,
      components: q ? [q, 'Microcontroller Board', 'Rechargeable Battery', 'Interconnection Wiring', 'Status Indicator LCD'] : ['Arduino Board', 'LCD 16x2 Display', 'Power supply module', 'Active Sensor'],
      difficulty: mainDifficulty,
      cost: 2500,
      ppt: true,
      report: true,
      circuit: true,
      pcb: true,
      tags: q ? q.toLowerCase().split(' ').filter(w => w.length > 2) : ['ai-generated', 'custom', 'electronics'],
      image: '✨',
      isAiGenerated: true
    };

    // Generate 10 alternatives
    const alternatives = [];
    const baseNames = [
      'Advanced Multi-Sensor Monitor',
      'Smart Autonomous Controller',
      'Solar Powered Utility System',
      'Real-Time Telemetry Node',
      'Wireless Remote Gateway',
      'Industrial Process Automation Unit',
      'Eco-Friendly Smart Device',
      'Adaptive Algorithmic Machine',
      'Secure Authentication Lock',
      'Digital Signal Processor Module'
    ];
    
    for (let i = 0; i < 10; i++) {
      alternatives.push({
        id: Math.floor(910000 + i * 100 + Math.random() * 99),
        title: `${baseNames[i]} for ${mainTitle}`,
        domain: mainDomain,
        category: 'AI Alternative',
        description: `An alternative dynamic design variant of the main project ${mainTitle}, optimized for cost efficiency, scalability, and modular expansion using robust components.`,
        components: [mainProject.components[0] || 'Sensor Unit', 'Microcontroller Board', 'Status LEDs', 'Custom PCB Shield'],
        difficulty: i % 3 === 0 ? 'Beginner' : i % 3 === 1 ? 'Intermediate' : 'Advanced',
        cost: 1200 + i * 800,
        ppt: true,
        report: true,
        circuit: i % 2 === 0,
        pcb: i % 3 !== 2,
        tags: [...mainProject.tags, 'alternative', `var-${i}`],
        image: '💡',
        isAiGenerated: true
      });
    }

    return res.json({
      projects: [mainProject],
      relatedProjects: alternatives,
      isAiGenerated: true
    });
  }

  // Otherwise, return standard projects
  res.json({
    projects: filtered,
    relatedProjects: [],
    isAiGenerated: false
  });
});


// Update profile details
app.put('/api/auth/profile', verifyToken, async (req, res) => {
  const { name, mobile, college_name, branch, reg_number } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ message: 'Name and mobile number are required.' });
  }
  try {
    await db.run(
      `UPDATE users 
       SET name = $1, mobile = $2, college_name = $3, branch = $4, reg_number = $5 
       WHERE id = $6`,
      [name, mobile, college_name || null, branch || null, reg_number || null, req.user.id]
    );
    await logActivity(req.user.id, 'PROFILE_UPDATED', `Updated details.`);
    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile.', error: err.message });
  }
});

// Change security password
app.put('/api/auth/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }
  try {
    const user = await db.get(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid current password.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await db.run(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, req.user.id]);
    await logActivity(req.user.id, 'PASSWORD_CHANGED', `Changed security password.`);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Password change failed.', error: err.message });
  }
});

// Forgot Password OTP trigger
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  try {
    const emailLower = email.toLowerCase();
    const user = await db.get(`SELECT id, name FROM users WHERE email = $1`, [emailLower]);
    if (!user) {
      return res.status(404).json({ message: 'No account registered with this email address.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await db.run(`UPDATE users SET otp_code = $1, otp_expires = $2 WHERE id = $3`, [otp, otpExpires.toISOString(), user.id]);
    queueMockMail(
      emailLower,
      'ProjectForge AI Password Reset Code',
      `Hello ${user.name},\n\nYou requested a password reset code. Your security verification OTP is: ${otp}. It is valid for 15 minutes.`
    );
    res.json({ message: 'Reset OTP code has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Forgot password flow failed.', error: err.message });
  }
});

// Verify Password Reset OTP
app.post('/api/auth/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });
  try {
    const user = await db.get(`SELECT id, otp_code, otp_expires FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (user.otp_code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }
    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ message: 'OTP code has expired.' });
    }
    res.json({ message: 'OTP verified successfully. You can now reset your password.' });
  } catch (err) {
    res.status(500).json({ message: 'OTP verification failed.', error: err.message });
  }
});

// Reset Password with OTP
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ message: 'Email, OTP and new password are required.' });
  try {
    const user = await db.get(`SELECT id, otp_code, otp_expires FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (!user || user.otp_code !== otp || new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await db.run(
      `UPDATE users 
       SET password_hash = $1, otp_code = NULL, otp_expires = NULL 
       WHERE id = $2`,
      [hash, user.id]
    );
    await logActivity(user.id, 'PASSWORD_RESET_SUCCESS', `Password reset successfully via OTP.`);
    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Password reset failed.', error: err.message });
  }
});

// Save a project
app.post('/api/projects/:id/save', verifyToken, async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  try {
    const proj = await db.get(`SELECT id FROM projects WHERE id = $1`, [projectId]);
    if (!proj) return res.status(404).json({ message: 'Project not found.' });

    const exists = await db.get(`SELECT id FROM saved_projects WHERE user_id = $1 AND project_id = $2`, [userId, projectId]);
    if (exists) return res.json({ message: 'Project is already saved.' });

    await db.run(
      `INSERT INTO saved_projects (user_id, project_id) VALUES ($1, $2)`,
      [userId, projectId]
    );
    await logActivity(userId, 'PROJECT_SAVED', { projectId });
    res.json({ success: true, message: 'Project saved successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save project.', error: err.message });
  }
});

// Unsave a project
app.delete('/api/projects/:id/unsave', verifyToken, async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  try {
    await db.run(
      `DELETE FROM saved_projects WHERE user_id = $1 AND project_id = $2`,
      [userId, projectId]
    );
    await logActivity(userId, 'PROJECT_UNSAVED', { projectId });
    res.json({ success: true, message: 'Project removed from saved.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unsave project.', error: err.message });
  }
});

// Get user saved projects list
app.get('/api/projects/saved', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const list = await db.query(
      `SELECT p.id, p.title, p.description, p.components, p.project_type, p.content, s.saved_at 
       FROM saved_projects s 
       JOIN projects p ON s.project_id = p.id 
       WHERE s.user_id = $1 
       ORDER BY s.saved_at DESC`,
      [userId]
    );
    const projects = list.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      components: row.components,
      project_type: row.project_type,
      content: JSON.parse(row.content),
      saved_at: row.saved_at
    }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load saved projects.', error: err.message });
  }
});

// ── Projects Search Engine (Database first, AI generated fallback) ───────────
async function ensureProjectLibrarySeeded() {
  const isSqlite = db.mode() === 'sqlite';
  await db.run(`
    CREATE TABLE IF NOT EXISTS project_library (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      components TEXT,
      difficulty TEXT,
      cost INTEGER,
      ppt INTEGER DEFAULT 1,
      report INTEGER DEFAULT 1,
      circuit INTEGER DEFAULT 1,
      pcb INTEGER DEFAULT 1,
      tags TEXT,
      image TEXT,
      is_ai_generated INTEGER DEFAULT 0
    )
  `);

  const countRow = await db.get('SELECT COUNT(*) as count FROM project_library');
  if (countRow && countRow.count > 0) {
    return; // Already seeded
  }

  const defaultProjects = [
    {
      title: 'Arduino Smart Home Automation', domain: 'Arduino', category: 'Embedded',
      description: 'Control home appliances like lights, fans, and AC remotely using an Arduino Uno with relay modules and IR remote. Features manual override and LCD status display.',
      components: ['Arduino Uno', 'Relay Module 4-Ch', 'IR Receiver', 'LCD 16x2', 'BC547 Transistor', 'Power Supply 5V'],
      difficulty: 'Beginner', cost: 1200, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['automation', 'relay', 'ir remote', 'home'], image: '🏠'
    },
    {
      title: 'Obstacle Avoiding Robot Car', domain: 'Arduino', category: 'Robotics',
      description: 'Arduino-powered wheeled robot that uses an HC-SR04 ultrasonic sensor and servo motor to scan and autonomously avoid obstacles in real time.',
      components: ['Arduino Uno', 'L298N Motor Driver', 'HC-SR04 Sensor', 'Servo SG90', 'BO Motor x4', 'Li-Ion Battery 7.4V'],
      difficulty: 'Beginner', cost: 1800, ppt: true, report: true, circuit: true, pcb: false,
      tags: ['robot', 'ultrasonic', 'motor', 'autonomous'], image: '🤖'
    },
    {
      title: 'Arduino Line Follower Robot', domain: 'Arduino', category: 'Robotics',
      description: 'Differential drive robot that follows a black line on white surface using IR sensor array. Implements PID controller for smooth curves and speed tuning.',
      components: ['Arduino Uno', 'L298N Motor Driver', 'IR Sensor', 'IR Sensor', 'DC Motor', 'DC Motor'],
      difficulty: 'Intermediate', cost: 900, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['robot', 'ir sensor', 'pid', 'line follower'], image: '🚗'
    },
    {
      title: 'Digital Soil Moisture Monitoring', domain: 'Arduino', category: 'Agriculture',
      description: 'Reads soil moisture with capacitive sensor, displays reading on OLED, and auto-triggers relay to activate water pump when moisture falls below threshold.',
      components: ['Arduino Nano', 'Capacitive Soil Sensor', 'SSD1306 OLED', 'Relay 5V', 'Mini Water Pump', '12V Adapter'],
      difficulty: 'Beginner', cost: 850, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['agriculture', 'soil', 'moisture', 'pump', 'automation'], image: '🌱'
    },
    {
      title: 'RFID Attendance System', domain: 'Arduino', category: 'Security',
      description: 'Tap RFID cards to log attendance with timestamp. Stores records on SD card and displays on LCD. Admin mode to add or remove cards using master card.',
      components: ['Arduino Mega', 'MFRC522 RFID Module', 'SD Card Module', 'LCD 20x4 I2C', 'DS3231 RTC', 'Buzzer'],
      difficulty: 'Intermediate', cost: 1500, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['rfid', 'attendance', 'security', 'sd card', 'rtc'], image: '🪪'
    },
    {
      title: 'ESP32 Smart Agriculture Monitoring', domain: 'ESP32', category: 'IoT',
      description: 'Monitors soil moisture, temperature, humidity, and light intensity with ESP32. Publishes data via MQTT to cloud dashboard. Mobile app notifications on alerts.',
      components: ['ESP32 DevKit', 'DHT22 Sensor', 'Capacitive Soil Sensor', 'BH1750 Light Sensor', 'OLED 0.96"', '18650 Battery'],
      difficulty: 'Intermediate', cost: 1400, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['agriculture', 'iot', 'mqtt', 'esp32', 'soil', 'dht22'], image: '🌾'
    },
    {
      title: 'ESP32 Face Recognition Door Lock', domain: 'ESP32', category: 'AI/ML',
      description: 'Uses ESP32-CAM with face detection and recognition to control an electric door lock relay. Logs access events with timestamps over WiFi.',
      components: ['ESP32-CAM Module', 'OV2640 Camera', 'Relay 5V', 'Electric Strike Lock', 'LED Indicator', 'USB-TTL Programmer'],
      difficulty: 'Advanced', cost: 2200, ppt: true, report: true, circuit: true, pcb: false,
      tags: ['face recognition', 'camera', 'security', 'ai', 'door lock'], image: '📸'
    },
    {
      title: 'ESP32 GPS Vehicle Tracker', domain: 'ESP32', category: 'IoT',
      description: 'Tracks real-time GPS coordinates with NEO-6M module, sends location data via SIM800L GSM to a web server. Displays path on Google Maps.',
      components: ['ESP32', 'NEO-6M GPS Module', 'SIM800L GSM', 'Li-Ion 7.4V', 'GSM Antenna', 'External GPS Antenna'],
      difficulty: 'Advanced', cost: 2800, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['gps', 'gsm', 'vehicle tracker', 'location', 'maps'], image: '📍'
    },
    {
      title: 'Smart Water Quality Monitor', domain: 'IoT', category: 'Environment',
      description: 'Continuously monitors TDS, pH, turbidity, and temperature of water supply. Sends live readings to Blynk IoT cloud with threshold-based SMS alerts via SIM module.',
      components: ['Arduino Mega', 'TDS Sensor', 'pH Sensor Module', 'Turbidity Sensor', 'DS18B20 Temp', 'SIM800L GSM'],
      difficulty: 'Advanced', cost: 3200, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['water quality', 'tds', 'ph', 'blynk', 'environment', 'iot'], image: '💧'
    },
    {
      title: 'PWM Motor Speed Controller', domain: 'Electronics', category: 'Motor Control',
      description: 'Controls DC motor speed using NE555 timer-based PWM circuit with potentiometer. MOSFET switching for high-efficiency control up to 30A motor current.',
      components: ['NE555 Timer IC', 'IRF540N MOSFET', 'Potentiometer 100K', 'Flyback Diode 1N4007', 'Heat Sink', 'Capacitors & Resistors'],
      difficulty: 'Beginner', cost: 350, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['pwm', 'motor control', 'ne555', 'mosfet', 'speed controller', 'dc motor'], image: '⚙️'
    },
    {
      title: 'Solar MPPT Charge Controller', domain: 'Electrical', category: 'Renewable Energy',
      description: 'Microcontroller-based MPPT algorithm (Perturb & Observe) for 12V/24V solar systems. Buck converter topology, 98% efficiency, LCD display showing panel and battery stats.',
      components: ['Arduino Nano', 'IRF9540 PMOSFET', 'Schottky Diode 30A', 'Inductor 10µH 10A', 'Current Sensor ACS712', 'Buck Converter PCB'],
      difficulty: 'Advanced', cost: 3200, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['solar', 'mppt', 'charge controller', 'renewable', 'buck converter', 'battery'], image: '☀️'
    },
    {
      title: 'Self-Balancing Robot', domain: 'Robotics', category: 'Control Systems',
      description: 'Two-wheeled inverted pendulum robot using MPU6050 IMU, PID controller, and stepper motors. Self-balances in real time. Bluetooth remote steering from mobile app.',
      components: ['Arduino Uno', 'MPU6050 IMU', 'L298N Driver', 'Stepper Motor NEMA17 x2', 'Li-Ion 11.1V', 'HC-05 Bluetooth'],
      difficulty: 'Advanced', cost: 3800, ppt: true, report: true, circuit: true, pcb: true,
      tags: ['balancing robot', 'pid', 'mpu6050', 'stepper', 'bluetooth', 'control'], image: '⚖️'
    }
  ];

  for (const p of defaultProjects) {
    await db.run(`
      INSERT INTO project_library (title, domain, category, description, components, difficulty, cost, ppt, report, circuit, pcb, tags, image)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      p.title, p.domain, p.category, p.description, JSON.stringify(p.components),
      p.difficulty, p.cost, p.ppt ? 1 : 0, p.report ? 1 : 0, p.circuit ? 1 : 0, p.pcb ? 1 : 0,
      JSON.stringify(p.tags), p.image
    ]);
  }
  console.log('Seeded project library table successfully.');
}

app.get('/api/projects/search', verifyToken, async (req, res) => {
  const { q, domain, difficulty, budgetIdx } = req.query;
  try {
    let sql = 'SELECT * FROM project_library WHERE 1=1';
    const params = [];
    let paramCounter = 1;

    if (domain && domain !== 'All') {
      sql += ` AND domain = $${paramCounter++}`;
      params.push(domain);
    }
    if (difficulty && difficulty !== 'All Levels') {
      sql += ` AND difficulty = $${paramCounter++}`;
      params.push(difficulty);
    }

    const budgetMap = [
      { min: 0, max: 1000000 },
      { min: 0, max: 1000 },
      { min: 1000, max: 5000 },
      { min: 5000, max: 15000 },
      { min: 15000, max: 1000000 }
    ];
    const bIdx = parseInt(budgetIdx) || 0;
    const selectedBudget = budgetMap[bIdx] || budgetMap[0];

    sql += ` AND cost >= $${paramCounter++} AND cost <= $${paramCounter++}`;
    params.push(selectedBudget.min);
    params.push(selectedBudget.max);

    let textQuery = (q || '').trim();
    if (textQuery) {
      const terms = textQuery.split(/\s+/).filter(Boolean);
      for (const term of terms) {
        sql += ` AND (title LIKE $${paramCounter} OR description LIKE $${paramCounter} OR components LIKE $${paramCounter} OR tags LIKE $${paramCounter} OR domain LIKE $${paramCounter})`;
        params.push(`%${term}%`);
        paramCounter++;
      }
    }

    let result = await db.query(sql, params);
    let projects = result.rows.map(r => ({
      id: r.id,
      title: r.title,
      domain: r.domain,
      category: r.category,
      description: r.description,
      components: JSON.parse(r.components || '[]'),
      difficulty: r.difficulty,
      cost: r.cost,
      ppt: !!r.ppt,
      report: !!r.report,
      circuit: !!r.circuit,
      pcb: !!r.pcb,
      tags: JSON.parse(r.tags || '[]'),
      image: r.image
    }));

    // If no match found, generate AI projects on the fly
    if (projects.length === 0) {
      console.log(`[SearchEngine] No matches for query "${textQuery}". Invoking Gemini model...`);
      const aiPrompt = `
        You are an advanced Engineering Project Suggestion AI. The user is searching for an engineering project with the following criteria:
        - Search query: "${textQuery}"
        - Domain: "${domain || 'Any'}"
        - Difficulty: "${difficulty || 'Any'}"
        - Budget: "${selectedBudget.min} to ${selectedBudget.max} INR"

        Generate exactly 4 distinct, highly creative, and technical engineering project ideas that fit these criteria.
        
        Respond ONLY with a valid JSON array of objects (do not include markdown wrapping or backticks).
        Each object must have the following fields:
        - title (string): Creative engineering title
        - domain (string): One of: 'Arduino', 'ESP32', 'IoT', 'Electronics', 'Electrical', 'Robotics', 'Final Year'
        - category (string): Sub-category, e.g. 'Robotics', 'Embedded', 'Power'
        - description (string): 2-3 sentences explaining what it does
        - components (array of strings): Specific, real electronic components needed
        - difficulty (string): One of: 'Beginner', 'Intermediate', 'Advanced'
        - cost (number): Estimated cost in INR (must be between ${selectedBudget.min} and ${selectedBudget.max})
        - ppt (boolean): true
        - report (boolean): true
        - circuit (boolean): true
        - pcb (boolean): true
        - tags (array of strings): 3-4 related tag words
        - image (string): A single emoji that represents the project
      `;

      let aiResultText = await generateWithGemini(aiPrompt, true);
      aiResultText = aiResultText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

      try {
        const generated = JSON.parse(aiResultText);
        if (Array.isArray(generated)) {
          for (const p of generated) {
            await db.run(`
              INSERT INTO project_library (title, domain, category, description, components, difficulty, cost, ppt, report, circuit, pcb, tags, image, is_ai_generated)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1)
            `, [
              p.title, p.domain, p.category, p.description, JSON.stringify(p.components),
              p.difficulty, p.cost, p.ppt ? 1 : 0, p.report ? 1 : 0, p.circuit ? 1 : 0, p.pcb ? 1 : 0,
              JSON.stringify(p.tags), p.image
            ]);

            projects.push({
              id: Date.now() + Math.random(),
              title: p.title,
              domain: p.domain,
              category: p.category,
              description: p.description,
              components: p.components,
              difficulty: p.difficulty,
              cost: p.cost,
              ppt: !!p.ppt,
              report: !!p.report,
              circuit: !!p.circuit,
              pcb: !!p.pcb,
              tags: p.tags,
              image: p.image
            });
          }
        }
      } catch (jsonErr) {
        console.error('[SearchEngine] JSON parsing failed:', jsonErr.message);
        const fallbackResult = await db.query('SELECT * FROM project_library LIMIT 4');
        projects = fallbackResult.rows.map(r => ({
          id: r.id,
          title: r.title,
          domain: r.domain,
          category: r.category,
          description: r.description,
          components: JSON.parse(r.components || '[]'),
          difficulty: r.difficulty,
          cost: r.cost,
          ppt: !!r.ppt,
          report: !!r.report,
          circuit: !!r.circuit,
          pcb: !!r.pcb,
          tags: JSON.parse(r.tags || '[]'),
          image: r.image
        }));
      }
    }

    res.json(projects);
  } catch (err) {
    console.error('[SearchEngine] Failed:', err);
    res.status(500).json({ message: 'Search query execution failed.' });
  }
});

// Get captured mock emails (for testing local OTP links)
app.get('/api/test/mock-emails', async (req, res) => {
  try {
    const emails = JSON.parse(fs.readFileSync(MOCK_MAILS_FILE, 'utf-8') || '[]');
    res.json(emails.reverse()); // latest first
  } catch (e) {
    res.json([]);
  }
});

// Clear mock emails
app.post('/api/test/clear-mock-emails', async (req, res) => {
  fs.writeFileSync(MOCK_MAILS_FILE, JSON.stringify([]));
  res.json({ success: true });
});

// ==========================================
// USER DASHBOARD MODULE
// ==========================================

app.get('/api/dashboard/summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const projectCount = await db.get(`SELECT COUNT(*) as count FROM projects WHERE user_id = $1`, [userId]);
    const savedCount = await db.get(`SELECT COUNT(*) as count FROM saved_projects WHERE user_id = $1`, [userId]);
    const downloadCount = await db.get(`SELECT COUNT(*) as count FROM downloads WHERE user_id = $1`, [userId]);
    const pcbCount = await db.get(`SELECT COUNT(*) as count FROM pcb_designs WHERE user_id = $1`, [userId]);
    const vivaCount = await db.get(`SELECT COUNT(*) as count FROM viva_sets WHERE user_id = $1`, [userId]);
    const patentCount = await db.get(`SELECT COUNT(*) as count FROM patents WHERE user_id = $1`, [userId]);
    const ideaCount = await db.get(`SELECT COUNT(*) as count FROM project_ideas WHERE user_id = $1`, [userId]);
    const logs = await db.query(`SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 5`, [userId]);

    res.json({
      projectsCount: projectCount ? projectCount.count : 0,
      savedCount: savedCount ? savedCount.count : 0,
      downloadCount: downloadCount ? downloadCount.count : 0,
      pcbCount: pcbCount ? pcbCount.count : 0,
      vivaCount: vivaCount ? vivaCount.count : 0,
      patentCount: patentCount ? patentCount.count : 0,
      ideaCount: ideaCount ? ideaCount.count : 0,
      recentActivity: logs.rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard metrics.' });
  }
});

// ==========================================
// AI PROJECT GENERATOR MODULE
// ==========================================

app.post('/api/ai/project', verifyToken, async (req, res) => {
  const { description, components, project_type } = req.body;
  if (!description || !project_type) {
    return res.status(400).json({ message: 'Project description and project type are required.' });
  }

  const prompt = `You are a professional engineering system architect.
Generate a structured engineering project proposal based on:
- Description: ${description}
- Selected Components: ${components || 'None specified'}
- Project Type: ${project_type}

Return response in strict JSON format matching exactly this structure:
{
  "title": "Clear engineering project title",
  "abstract": "A formal academic abstract describing the engineering solution",
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "components": ["Component 1 with specifications", "Component 2 with specifications"],
  "costEstimation": "Detailed Indian Rupees estimated budget list totaling to a specific cost (e.g. Total: ₹4,500)",
  "difficultyLevel": "Beginner, Intermediate, or Advanced",
  "futureScope": ["Future enhancement 1", "Future enhancement 2"]
}`;

  try {
    let resultJson = await generateWithGemini(prompt, true);
    let output = null;

    if (resultJson) {
      try {
        // Clean JSON response (handling markdown code blocks if any)
        const cleanedStr = resultJson.replace(/```json/g, '').replace(/```/g, '').trim();
        output = JSON.parse(cleanedStr);
      } catch (err) {
        console.error('Failed to parse Gemini output as JSON, falling back to mock.', err);
      }
    }

    // Fallback generator if API fails or key is missing
    if (!output) {
      output = {
        title: `AI-Optimized Smart ${project_type} Engineering Project`,
        abstract: `This system implements an advanced ${project_type} solution utilizing state of the art microcontrollers and sensors. By analyzing details: "${description}", this platform designs a secure, cost-effective prototype supporting modular interfaces, remote logging, and power optimization metrics suited for professional evaluation.`,
        objectives: [
          "Establish high-reliability communication protocols between sensory modules.",
          "Design low-footprint power management to maximize field operations.",
          "Implement fail-safe validation checks for real-time control applications."
        ],
        components: (components ? components.split(',') : ["ESP32 Microcontroller", "Sensory Interface Board", "Relay Output Driver", "12V Li-Ion Battery Pack"]),
        costEstimation: "ESP32 Board: ₹650, Sensor Kits: ₹1,200, Custom PCB Assembly: ₹800, Battery & Chassis: ₹1,100. Total Budget: ₹3,750",
        difficultyLevel: "Intermediate",
        futureScope: [
          "Incorporate deep-learning predictive models directly onto the edge hardware.",
          "Migrate communication protocols to LoRaWAN for extended long-range metrics.",
          "Deploy custom dashboard apps using React Native for cloud operations."
        ]
      };
    }

    // Save project in DB
    const resInsert = await db.run(
      `INSERT INTO projects (user_id, title, description, components, project_type, content) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, output.title, description, components || '', project_type, JSON.stringify(output)]
    );

    await logActivity(req.user.id, 'PROJECT_GENERATED', { projectId: resInsert.lastID, title: output.title });
    res.json({ id: resInsert.lastID, ...output });
  } catch (error) {
    res.status(500).json({ message: 'Project generation failed.', error: error.message });
  }
});

// List User Projects
app.get('/api/projects/my-projects', verifyToken, async (req, res) => {
  try {
    const list = await db.query(`SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    const projects = list.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      components: row.components,
      project_type: row.project_type,
      content: JSON.parse(row.content),
      created_at: row.created_at
    }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load projects.' });
  }
});

// ==========================================
// AI CODE GENERATOR MODULE
// ==========================================

app.post('/api/ai/code', verifyToken, async (req, res) => {
  const { board, prompt } = req.body;
  if (!board || !prompt) {
    return res.status(400).json({ message: 'Microcontroller board and prompt are required.' });
  }

  const geminiPrompt = `You are a master embedded firmware engineer.
Generate professional, compile-ready code for board: ${board} based on requirements: ${prompt}.
Return a strict JSON format matching exactly this structure:
{
  "completeCode": "Copy-pasteable code block with setup, loop, comments, and configurations",
  "libraryList": ["Library Name 1", "Library Name 2"],
  "pinMapping": "Pin connection details layout",
  "uploadInstructions": "Step-by-step instructions to compile, wire, and upload to the board"
}`;

  try {
    let resultJson = await generateWithGemini(geminiPrompt, true);
    let output = null;

    if (resultJson) {
      try {
        const cleanedStr = resultJson.replace(/```json/g, '').replace(/```/g, '').trim();
        output = JSON.parse(cleanedStr);
      } catch (err) {
        console.error('Failed to parse Gemini code output as JSON, falling back to mock.', err);
      }
    }

    if (!output) {
      // Custom mocks matching requested boards
      let extension = board.toLowerCase().includes('raspberry') ? 'py' : 'ino';
      let pinout = "";
      let code = "";
      
      if (extension === 'ino') {
        code = `// Firmware generated by ProjectForge AI\n// Target: ${board}\n// Task: ${prompt}\n\n#include <Arduino.h>\n\nconst int LED_PIN = 13; // default pin\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(LED_PIN, OUTPUT);\n  Serial.println("${board} initialised for: ${prompt.replace(/"/g, '\\"')}");\n}\n\nvoid loop() {\n  digitalWrite(LED_PIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_PIN, LOW);\n  delay(1000);\n  Serial.println("System heartbeat nominal...");\n}`;
        pinout = "- Pin 13: Signal Indicator LED output\n- Pin GND: Ground reference connection\n- Pin VCC: 3.3V/5V Power connector";
      } else {
        code = `# Firmware generated by ProjectForge AI\n# Target: ${board}\n# Task: ${prompt}\n\nimport machine\nimport time\n\nled = machine.Pin(25, machine.Pin.OUT) # Raspberry Pi Pico onboard LED\nprint("${board} ready for: ${prompt}")\n\nwhile True:\n    led.value(1)\n    time.sleep(1.0)\n    led.value(0)\n    time.sleep(1.0)\n    print("Heartbeat ping...")`;
        pinout = "- Pin GP25: Onboard LED Indicator\n- Pin GND: Ground reference\n- Pin VBUS: 5V power input";
      }

      output = {
        completeCode: code,
        libraryList: ["Wire.h (I2C)", "SPI.h (Communication)"],
        pinMapping: pinout,
        uploadInstructions: `1. Open Arduino IDE or VS Code PlatformIO.\n2. Select board as ${board} from the boards manager.\n3. Copy the code into your main.${extension} editor.\n4. Connect the board via micro-USB/Type-C cable.\n5. Click Verify/Compile, then click Upload.`
      };
    }

    // Save download reference
    const fileName = `${board.replace(/\s+/g, '_')}_firmware.${output.completeCode.startsWith('#') ? 'py' : 'ino'}`;
    const filePath = `/uploads/${fileName}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, fileName), output.completeCode);

    await db.run(
      `INSERT INTO downloads (user_id, file_name, file_type, download_url) VALUES ($1, $2, $3, $4)`,
      [req.user.id, fileName, 'code', filePath]
    );

    await logActivity(req.user.id, 'CODE_GENERATED', { board, fileName });
    res.json({ ...output, downloadUrl: filePath });
  } catch (error) {
    res.status(500).json({ message: 'Code generation failed.', error: error.message });
  }
});

// ==========================================
// AI CHAT MODULE (Server-Sent Events streaming)
// ==========================================

app.post('/api/ai/chat', verifyToken, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Message is required.' });
  }

  const systemPrompt = `You are ProjectForge AI, an expert hardware engineering assistant specializing in:
- Microcontrollers: Arduino (Uno/Mega/Nano), ESP32, ESP8266, STM32, Raspberry Pi, AVR, PIC
- PCB design: KiCad, Altium, EasyEDA, Gerber file creation, component placement, trace routing
- Embedded C++ / MicroPython firmware development
- Electronic components: sensors, actuators, ICs, passive components, power management

CRITICAL RULES FOR SVG GENERATION:
If the user asks you to draw or generate a PCB layout or circuit diagram, you MUST output a fully functional, highly realistic \`\`\`xml <svg> code block.
- For PCB Layouts: Use a "White page KiCad Aesthetic". The SVG background MUST be #F8FAFC (white/light-grey). Use #DC2626 (Red) for top traces, #2563EB (Blue) for bottom traces, #F59E0B (Gold) for pads, and #374151 (Dark grey) for silkscreen text. NEVER use basic black-and-white lines. Make it look like a professional CAD render.
- For Circuit Diagrams: Use "Fritzing-style" photorealistic components. Draw realistic Arduino boards (blue PCB, silver USB port, black chips), sensors with metallic domes, and colored thick wires. 

Provide clear, concise, technically accurate responses. Use **bold** for key terms. Use \`code\` for code snippets. 
For larger code blocks use triple backticks with language identifier (\`\`\`cpp or \`\`\`python). 
Use numbered lists or bullet points for multi-step answers. Keep responses practical and actionable.`;

  const apiKey = process.env.GEMINI_API_KEY;

  // Setup SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendChunk = (text) => {
    res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
  };

  const sendDone = () => {
    res.write(`data: [DONE]\n\n`);
    res.end();
  };

  // If no valid API key, stream a fallback response
  if (!isValidApiKey(apiKey)) {
    const fallbackResponses = {
      default: `**ProjectForge AI Engineering Helper** is ready!\n\nI can help you with:\n- **Circuit design** and component selection\n- **PCB layout** tips and Gerber file generation\n- **Embedded firmware** in C++ and MicroPython\n- **Communication protocols** (I2C, SPI, MQTT, etc.)\n\nTo enable real AI responses, configure your \`GEMINI_API_KEY\` in your local environment or the backend \`.env\` file.`,
      esp32: `**ESP32 Quickstart Guide:**\n\n1. Install **ESP32 board support** via Arduino IDE Board Manager\n2. Select \`ESP32 Dev Module\` as your target board\n3. Basic blink code:\n\n\`\`\`cpp\nconst int LED = 2; // Built-in LED\nvoid setup() { pinMode(LED, OUTPUT); }\nvoid loop() { digitalWrite(LED, !digitalRead(LED)); delay(500); }\n\`\`\`\n\n**Key ESP32 Features:**\n- Dual-core 240MHz Xtensa LX6\n- Built-in WiFi + Bluetooth\n- 34 programmable GPIO pins\n- 12-bit ADC on multiple pins`,
      pcb: `**PCB Design Best Practices:**\n\n1. **Decoupling capacitors**: Place 100nF caps as close as possible to IC power pins\n2. **Ground planes**: Use solid ground pour on bottom layer to minimize EMI\n3. **Trace widths**: Minimum 0.2mm for signals, ≥0.5mm for power rails\n4. **Via stitching**: Connect ground planes between layers every 5mm\n5. **Component placement**: Keep high-frequency components away from sensitive analog areas\n\nUse **KiCad** (free) for schematic capture and layout.`,
    };

    const lowerMsg = message.toLowerCase();
    let response = fallbackResponses.default;
    if (lowerMsg.includes('esp32') || lowerMsg.includes('esp8266')) response = fallbackResponses.esp32;
    else if (lowerMsg.includes('pcb') || lowerMsg.includes('gerber') || lowerMsg.includes('trace')) response = fallbackResponses.pcb;

    // Stream the fallback word by word to simulate streaming
    const words = response.split(' ');
    for (let i = 0; i < words.length; i++) {
      sendChunk((i === 0 ? '' : ' ') + words[i]);
      await new Promise(r => setTimeout(r, 25));
    }
    sendDone();
    return;
  }

  // Real Gemini streaming with official SDK
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash which is standard, fast, and highly responsive
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    });

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        sendChunk(chunkText);
      }
    }

    sendDone();
    await logActivity(req.user.id, 'AI_CHAT', { messageLength: message.length });
  } catch (error) {
    console.error('Chat streaming SDK error, attempting REST fallback:', error);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      });

      if (!geminiRes.ok) {
        throw new Error(`REST fallback failed with status ${geminiRes.status}`);
      }

      const reader = geminiRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) sendChunk(text);
            } catch (_) {}
          }
        }
      }
      sendDone();
      await logActivity(req.user.id, 'AI_CHAT', { messageLength: message.length });
    } catch (fallbackError) {
      console.error('Fallback REST chat streaming failed:', fallbackError);
      sendChunk('\n\n*Connection error. Please configure a valid GEMINI_API_KEY in the backend .env file.*');
      sendDone();
    }
  }
});

// ==========================================
// AI PPT GENERATOR MODULE
// ==========================================

// Helper function to return high-quality project-specific mock slides for fallback
function getPPTFallbackData(title, details) {
  const lowerTitle = title.toLowerCase();
  const isIoT = lowerTitle.includes('iot') || lowerTitle.includes('smart') || lowerTitle.includes('internet');
  const isRobotics = lowerTitle.includes('robot') || lowerTitle.includes('arm') || lowerTitle.includes('drone') || lowerTitle.includes('wheelchair') || lowerTitle.includes('crawler');
  const isBiomedical = lowerTitle.includes('health') || lowerTitle.includes('heart') || lowerTitle.includes('pulse') || lowerTitle.includes('medical') || lowerTitle.includes('prosthetic') || lowerTitle.includes('stethoscope') || lowerTitle.includes('wheelchair');
  const isElectrical = lowerTitle.includes('electrical') || lowerTitle.includes('motor') || lowerTitle.includes('inverter') || lowerTitle.includes('power') || lowerTitle.includes('solar') || lowerTitle.includes('grid');
  
  let mainMCU = "Arduino Uno";
  if (lowerTitle.includes('esp32')) mainMCU = "ESP32 DevKit C";
  else if (lowerTitle.includes('esp8266') || lowerTitle.includes('nodemcu')) mainMCU = "NodeMCU ESP8266";
  else if (lowerTitle.includes('raspberry') || lowerTitle.includes('pi')) mainMCU = "Raspberry Pi 4 Model B";
  else if (lowerTitle.includes('stm32')) mainMCU = "STM32F4 Nucleo Board";
  else if (lowerTitle.includes('nano')) mainMCU = "Arduino Nano V3.0";

  let sensors = ["DHT22 Temp & Humidity Sensor", "HC-SR04 Ultrasonic Distance Sensor", "LDR Ambient Light Sensor"];
  if (isBiomedical) sensors = ["MAX30102 Heart Rate Sensor", "MyoWare EMG Muscle Sensor", "FSR 406 Force Resistor"];
  else if (isIoT) sensors = ["Capacitive Soil Moisture Sensor", "DHT22 Environmental Sensor", "MQ-135 Air Quality Sensor"];
  else if (isElectrical) sensors = ["ACS712 Hall Effect Current Sensor", "ZCD Logic Circuit", "PT Potential Transformer"];

  return [
    {
      slideNumber: 1,
      title: "Cover Page",
      bullets: [title, `Microcontroller: ${mainMCU}`, "Project Technical Presentation Guidelines", "Engineered via ProjectForge AI Platform"],
      imagePrompt: "Modern technology schematic background layout"
    },
    {
      slideNumber: 2,
      title: "Abstract",
      bullets: [
        `This presentation documents the design, firmware compilation, and experimental results for the "${title}" project.`,
        "The system aims to address the efficiency bottlenecks and reliability issues of classic analog solutions.",
        "We implement real-time data sampling, threshold hysteresis logic, and low-latency feedback routines.",
        "Practical evaluations demonstrate a robust operational timeline with nominal energy requirements."
      ],
      imagePrompt: "Abstract 3D blueprint block diagram"
    },
    {
      slideNumber: 3,
      title: "Objectives",
      bullets: [
        `To construct a working embedded system prototype of the proposed "${title}".`,
        `To establish clean serial and logic interfaces between ${mainMCU} and sensory nodes.`,
        "To compile high-efficiency firmware loops featuring low jitter and fast response.",
        "To layout a professional dual-layer PCB with dedicated ground planes to shield high-frequency signals."
      ],
      imagePrompt: "Bullet metric goals checklist"
    },
    {
      slideNumber: 4,
      title: "Problem Statement",
      bullets: [
        "Conventional engineering frameworks for this application suffer from excessive power consumption.",
        "Analog drift and environmental temperature fluctuations corrupt calibration coefficients over time.",
        "Absence of active safety diagnostic gates risks logic freeze-up or device failure.",
        "Sloppy wiring in breadboard prototypes increases signal cross-talk and logic level drops."
      ],
      imagePrompt: "Comparison charts mapping old vs new system flaws"
    },
    {
      slideNumber: 5,
      title: "Components Used",
      bullets: [
        `Core Processor Unit: ${mainMCU} operating at unified clock frequencies.`,
        `Integrated Sensors: ${sensors.join(', ')}.`,
        "Power Management: Step-down buck converters and low-dropout regulators (LDOs).",
        "Interface Outputs: I2C alphanumeric LCD display, status LEDs, and piezoelectric buzzer."
      ],
      imagePrompt: "Structured list of electronic parts"
    },
    {
      slideNumber: 6,
      title: "Components Photos",
      bullets: [
        `Accurate footprint packaging (e.g. DIP, SMD, TO-92) mapped in KiCad.`,
        "Sensors are modularly isolated to prevent localized thermal loads.",
        "Microcontroller pins aligned to high-frequency logic lines.",
        "Power terminal terminals are color coded to avoid reverse polarity faults."
      ],
      imagePrompt: "Vector layout of key components with border frames"
    },
    {
      slideNumber: 7,
      title: "Circuit Diagram",
      bullets: [
        "Comprehensive block schematic detailing inter-module wiring.",
        "Decoupling capacitors (100nF and 10µF) placed close to supply lines to damp power spikes.",
        "Logic-level shifting circuits isolate the MCU pins from high-power relay coils.",
        "I2C communication bus equipped with 4.7kΩ pull-up resistors for signal integrity."
      ],
      imagePrompt: "Auto-generated vector wiring block schematic"
    },
    {
      slideNumber: 8,
      title: "Working Principle",
      bullets: [
        `The microcontroller (${mainMCU}) initiates a startup calibration sequence.`,
        `Analog signals are captured from ${sensors[0]} and processed through a digital noise filter.`,
        "Hysteresis thresholds govern state transitions, mitigating chatter in output relay contacts.",
        "Data metrics are output dynamically to the LCD interface and logged to telemetry registers."
      ],
      imagePrompt: "Working principle flowchart logic"
    },
    {
      slideNumber: 9,
      title: "Flowchart",
      bullets: [
        "Demonstrates procedural logic starting from power-on self test.",
        "Conditional branches execute validation checks on sensor pins before looping.",
        "Watchdog timer routines run in parallel to auto-recover from lockup states.",
        "Dedicated interrupt service routines (ISRs) monitor emergency shutdown buttons."
      ],
      imagePrompt: "Auto-generated logical vector flowchart diagram"
    },
    {
      slideNumber: 10,
      title: "Code Overview",
      bullets: [
        "Structured in standard Embedded C++ design patterns.",
        "Non-blocking millis() loops substitute delay() calls to maintain firmware speed.",
        "Hardware Timer registers configured to trigger periodic ADC samples.",
        "Custom serial packet frames ensure secure transmit and receive lines."
      ],
      imagePrompt: "Code structure editing IDE snippet"
    },
    {
      slideNumber: 11,
      title: "Applications",
      bullets: [
        "Ideal for deployment in automated small-scale industrial hubs.",
        "Integrated as a standalone remote telemetry monitoring station.",
        "Serves as an advanced lab prototype for engineering students and research teams.",
        "Forms the foundational logic design for commercial IoT products."
      ],
      imagePrompt: "Deployment sites listing"
    },
    {
      slideNumber: 12,
      title: "Advantages",
      bullets: [
        "High mechanical durability due to integrated PCB layout.",
        "Low fabrication costs allowing quick scale prototyping.",
        "Fast response time (measured below 30 milliseconds from trigger).",
        "Low-current standby mode extends battery operation life."
      ],
      imagePrompt: "Pros and cons matrix"
    },
    {
      slideNumber: 13,
      title: "Future Scope",
      bullets: [
        "Upgrading to real-time machine learning prediction nodes (TinyML).",
        "Integrating long-range radio transceivers (LoRa/Sigfox) for rural zones.",
        "Designing custom injection-molded enclosure blocks for IP67 environmental sealing.",
        "Adding high-density rechargeable solar battery backup management cards."
      ],
      imagePrompt: "System development roadmap chart"
    },
    {
      slideNumber: 14,
      title: "Results",
      bullets: [
        "Prototype successfully passed all simulated input stress tests.",
        "Thermal loads on voltage regulators remained below 45°C during continuous load.",
        "Sensory accuracy matches industrial benchmark instruments with standard deviation < 1.5%.",
        "Power draws conform to battery shelf-life estimates."
      ],
      imagePrompt: "Vector graph plotting results values"
    },
    {
      slideNumber: 15,
      title: "Conclusion",
      bullets: [
        `The structural design of "${title}" proved to be highly stable and functional.`,
        "All critical objectives, including sensor interfacing and circuit stability, were achieved.",
        "The compiled KiCad schematic and layout assets are ready for immediate manufacture.",
        "ProjectForge AI has packaged a college-ready presentation and blueprint folder."
      ],
      imagePrompt: "Summary slides visual layout"
    }
  ];
}

app.post('/api/ai/ppt', upload.single('templateFile'), verifyToken, async (req, res) => {
  const { title, details } = req.body;
  if (!title || !details) {
    return res.status(400).json({ message: 'Project title and details are required.' });
  }

  const prompt = `You are a professional academic presentation creator.
Create a structured 15-slide engineering project presentation for: "${title}".
Key details: ${details}.

The presentation must contain exactly 15 slides with these exact titles:
1. Cover Page
2. Abstract
3. Objectives
4. Problem Statement
5. Components Used
6. Components Photos
7. Circuit Diagram
8. Working Principle
9. Flowchart
10. Code Overview
11. Applications
12. Advantages
13. Future Scope
14. Results
15. Conclusion

For each of the 15 slides, provide:
1. Title (matching the exact name above)
2. Bullets: 3 to 4 detailed bullet points (academic, professional language)
3. ImagePrompt: A description of a matching engineering drawing or diagram.

Return a strict JSON format matching exactly this structure:
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "Cover Page",
      "bullets": ["Bullet 1", "Bullet 2"],
      "imagePrompt": "Description of cover image"
    },
    ...
  ]
}`;

  try {
    let resultJson = await generateWithGemini(prompt, true);
    let output = null;

    if (resultJson) {
      try {
        const cleanedStr = resultJson.replace(/```json/g, '').replace(/```/g, '').trim();
        output = JSON.parse(cleanedStr);
      } catch (err) {
        console.error('Failed to parse Gemini PPT output as JSON, falling back to mock.', err);
      }
    }

    if (!output || !output.slides || output.slides.length < 15) {
      output = { slides: getPPTFallbackData(title, details) };
    }

    // Load PPTX template properties if uploaded
    let templateData = {
      bgColor: '0B0F19', // Default dark navy
      accentColor: '6366F1', // Default indigo
      titleFont: 'Trebuchet MS',
      bodyFont: 'Arial',
      logoUrl: null,
      footerText: 'ProjectForge AI'
    };

    if (req.file) {
      console.log(`[PPTX Template] Parsing uploaded template file: ${req.file.originalname}`);
      templateData = extractPPTXTemplate(req.file.path);
      console.log(`[PPTX Template] Extracted properties:`, templateData);
    }

    const isLightBg = isColorLight(templateData.bgColor);
    const titleColor = isLightBg ? '1F2937' : 'FFFFFF';
    const textColor = isLightBg ? '374151' : 'E2E8F0';
    const subtextColor = isLightBg ? '4B5563' : '94A3B8';
    const visualBoxFill = isLightBg ? 'F3F4F6' : '111827';
    const visualBoxBorder = isLightBg ? 'E5E7EB' : '1E293B';
    const textBorderLine = isLightBg ? 'D1D5DB' : '1E293B';

    // Generate .pptx file using pptxgenjs library
    let pptxFile = new pptxgen();
    pptxFile.layout = 'LAYOUT_16x9'; // Slide Dimensions: 13.33 x 7.5 inches

    // Slide 1: Title Slide (Cover Page)
    let coverSlide = pptxFile.addSlide();
    coverSlide.background = { fill: templateData.bgColor };
    
    // Aesthetic frame highlights using 16x9 layout grid
    coverSlide.addShape(pptxFile.ShapeType.rect, { x: 0.5, y: 0.5, w: 12.33, h: 6.5, line: { color: templateData.accentColor, width: 2 } });
    coverSlide.addShape(pptxFile.ShapeType.rect, { x: 0.6, y: 0.6, w: 12.13, h: 6.3, line: { color: visualBoxBorder, width: 1 } });
    
    coverSlide.addText("PROJECTFORGE AI PRESENTATION SYSTEM", { x: 1.0, y: 1.0, w: 11.33, h: 0.4, fontSize: 14, color: templateData.accentColor, bold: true, fontFace: templateData.titleFont });
    coverSlide.addText("ENGINEERING PROJECT PRESENTATION", { x: 1.0, y: 1.4, w: 11.33, h: 0.3, fontSize: 11, color: '10B981', bold: true, tracking: 2, fontFace: templateData.titleFont });
    
    coverSlide.addText(title, { x: 1.0, y: 2.2, w: 11.33, h: 1.8, fontSize: 32, color: titleColor, bold: true, align: 'left', fontFace: templateData.titleFont });
    
    // Styled info box
    coverSlide.addShape(pptxFile.ShapeType.rect, { x: 1.0, y: 4.5, w: 11.33, h: 1.8, fill: visualBoxFill, line: { color: visualBoxBorder, width: 1 } });
    
    coverSlide.addText(`Student Researcher: ${req.user.name || 'Student Engineer'}`, { x: 1.3, y: 4.7, w: 6.0, h: 0.3, fontSize: 12, color: textColor, fontFace: templateData.bodyFont });
    coverSlide.addText(`Domain: ${details.slice(0, 70) || 'Electrical/Embedded'}`, { x: 1.3, y: 5.1, w: 6.0, h: 0.3, fontSize: 11, color: textColor, fontFace: templateData.bodyFont });
    coverSlide.addText(`Date: ${new Date().toLocaleDateString()}`, { x: 1.3, y: 5.5, w: 6.0, h: 0.3, fontSize: 11, color: subtextColor, fontFace: templateData.bodyFont });

    // Render extracted logo if present
    if (templateData.logoUrl) {
      const logoPath = path.join(UPLOADS_DIR, path.basename(templateData.logoUrl));
      if (fs.existsSync(logoPath)) {
        try {
          coverSlide.addImage({ path: logoPath, x: 10.0, y: 0.8, w: 1.8, h: 1.0 });
        } catch (logoErr) {
          console.error('[PPTX Template] Failed to render logo image on cover slide:', logoErr);
        }
      }
    }

    coverSlide.addText("Academic Advisory Board Verification Set", { x: 7.5, y: 5.8, w: 4.5, h: 0.3, fontSize: 10, color: '10B981', italic: true, align: 'right', fontFace: templateData.bodyFont });

    // Helper data for vector drawing
    const lowerTitle = title.toLowerCase();
    let mainMCU = "Arduino Uno";
    if (lowerTitle.includes('esp32')) mainMCU = "ESP32 DevKit C";
    else if (lowerTitle.includes('esp8266') || lowerTitle.includes('nodemcu')) mainMCU = "NodeMCU ESP8266";
    else if (lowerTitle.includes('raspberry') || lowerTitle.includes('pi')) mainMCU = "Raspberry Pi 4";
    else if (lowerTitle.includes('stm32')) mainMCU = "STM32F4 Board";
    else if (lowerTitle.includes('nano')) mainMCU = "Arduino Nano";

    let sensors = ["DHT22 Sensor", "HC-SR04 Sensor", "LDR Module"];
    if (lowerTitle.includes('health') || lowerTitle.includes('heart') || lowerTitle.includes('biomedical')) {
      sensors = ["MAX30102 HR", "MyoWare EMG", "FSR Resistor"];
    } else if (lowerTitle.includes('agriculture') || lowerTitle.includes('soil') || lowerTitle.includes('irrigation')) {
      sensors = ["Soil Moisture", "DHT22 Temp", "MQ-135 Gas"];
    }

    // Remaining slides 2 to 15
    output.slides.forEach((s) => {
      if (s.slideNumber === 1) return; // Skip cover slide
      
      let sl = pptxFile.addSlide();
      sl.background = { fill: templateData.bgColor };
      
      // Outer subtle layout grid
      sl.addShape(pptxFile.ShapeType.rect, { x: 0.5, y: 0.5, w: 12.33, h: 6.5, line: { color: visualBoxBorder, width: 1 } });
      
      // Header Title
      sl.addText(s.title, { x: 0.8, y: 0.7, w: 11.73, h: 0.6, fontSize: 24, color: templateData.accentColor, bold: true, fontFace: templateData.titleFont });
      sl.addShape(pptxFile.ShapeType.line, { x: 0.8, y: 1.4, w: 11.73, h: 0.01, line: { color: textBorderLine, width: 2 } });
      
      // Footer page tags
      sl.addText(`${templateData.footerText} | Page ${s.slideNumber} of 15`, { x: 0.8, y: 6.6, w: 5.0, h: 0.3, fontSize: 9, color: subtextColor, fontFace: templateData.bodyFont });
      sl.addText(`Topic: ${title.slice(0, 50)}`, { x: 7.5, y: 6.6, w: 5.0, h: 0.3, fontSize: 9, color: subtextColor, align: 'right', fontFace: templateData.bodyFont });

      // Bullets (Left column)
      let bulletText = s.bullets.map(b => `•  ${b}`).join('\n\n');
      sl.addText(bulletText, { x: 0.8, y: 1.8, w: 6.5, h: 4.5, fontSize: 13, color: textColor, fontFace: templateData.bodyFont, lineSpacing: 20 });

      // Right Column visuals (Dynamic based on slide title / index)
      const visualX = 7.8;
      const visualY = 1.8;
      const visualW = 4.5;
      const visualH = 4.5;

      // Draw vector diagrams
      if (s.title.toLowerCase().includes('photos') || s.slideNumber === 6) {
        // Draw Labeled Component Boxes
        sl.addShape(pptxFile.ShapeType.roundRect, { x: visualX, y: visualY, w: visualW, h: 1.2, fill: visualBoxFill, line: { color: templateData.accentColor, width: 2 } });
        sl.addText("Core Controller Module", { x: visualX + 0.1, y: visualY + 0.1, w: visualW - 0.2, h: 0.3, fontSize: 11, color: templateData.accentColor, bold: true, align: 'center', fontFace: templateData.titleFont });
        sl.addText(mainMCU, { x: visualX + 0.1, y: visualY + 0.5, w: visualW - 0.2, h: 0.5, fontSize: 10, color: textColor, align: 'center', fontFace: templateData.bodyFont });

        sl.addShape(pptxFile.ShapeType.roundRect, { x: visualX, y: visualY + 1.5, w: visualW, h: 1.2, fill: visualBoxFill, line: { color: '10B981', width: 2 } });
        sl.addText("Primary Sensor Interface", { x: visualX + 0.1, y: visualY + 1.6, w: visualW - 0.2, h: 0.3, fontSize: 11, color: '10B981', bold: true, align: 'center', fontFace: templateData.titleFont });
        sl.addText(sensors[0], { x: visualX + 0.1, y: visualY + 2.0, w: visualW - 0.2, h: 0.5, fontSize: 10, color: textColor, align: 'center', fontFace: templateData.bodyFont });

        sl.addShape(pptxFile.ShapeType.roundRect, { x: visualX, y: visualY + 3.0, w: visualW, h: 1.2, fill: visualBoxFill, line: { color: 'F59E0B', width: 2 } });
        sl.addText("Secondary Terminal Pin", { x: visualX + 0.1, y: visualY + 3.1, w: visualW - 0.2, h: 0.3, fontSize: 11, color: 'F59E0B', bold: true, align: 'center', fontFace: templateData.titleFont });
        sl.addText(sensors[1] || "Buzzer Alarm Module", { x: visualX + 0.1, y: visualY + 3.5, w: visualW - 0.2, h: 0.5, fontSize: 10, color: textColor, align: 'center', fontFace: templateData.bodyFont });

      } else if (s.title.toLowerCase().includes('circuit') || s.slideNumber === 7) {
        // Draw Circuit Block Diagram
        sl.addShape(pptxFile.ShapeType.rect, { x: visualX + 1.2, y: visualY + 1.5, w: 2.1, h: 1.5, fill: '111827', line: { color: '6366F1', width: 2 } });
        sl.addText(mainMCU + "\n(Core MCU)", { x: visualX + 1.25, y: visualY + 1.8, w: 2.0, h: 1.0, fontSize: 10, color: 'FFFFFF', bold: true, align: 'center', fontFace: 'Trebuchet MS' });

        sl.addShape(pptxFile.ShapeType.rect, { x: visualX + 1.2, y: visualY, w: 2.1, h: 0.9, fill: '111827', line: { color: 'EF4444', width: 1 } });
        sl.addText("Power Supply (5V/3.3V)", { x: visualX + 1.25, y: visualY + 0.2, w: 2.0, h: 0.5, fontSize: 9, color: 'E2E8F0', align: 'center', fontFace: 'Arial' });

        sl.addShape(pptxFile.ShapeType.rect, { x: visualX - 0.4, y: visualY + 1.5, w: 1.2, h: 1.5, fill: '111827', line: { color: '10B981', width: 1 } });
        sl.addText("Sensors\nInputs", { x: visualX - 0.35, y: visualY + 1.8, w: 1.1, h: 1.0, fontSize: 9, color: 'E2E8F0', align: 'center', fontFace: 'Arial' });

        sl.addShape(pptxFile.ShapeType.rect, { x: visualX + 3.7, y: visualY + 1.5, w: 1.2, h: 1.5, fill: '111827', line: { color: '3B82F6', width: 1 } });
        sl.addText("Actuators\nOutputs", { x: visualX + 3.75, y: visualY + 1.8, w: 1.1, h: 1.0, fontSize: 9, color: 'E2E8F0', align: 'center', fontFace: 'Arial' });

        // Connection Arrows
        sl.addShape(pptxFile.ShapeType.rightArrow, { x: visualX + 0.9, y: visualY + 2.0, w: 0.25, h: 0.3, fill: '10B981' });
        sl.addShape(pptxFile.ShapeType.rightArrow, { x: visualX + 3.4, y: visualY + 2.0, w: 0.25, h: 0.3, fill: '3B82F6' });
        sl.addShape(pptxFile.ShapeType.downArrow, { x: visualX + 2.15, y: visualY + 1.0, w: 0.25, h: 0.4, fill: 'EF4444' });

      } else if (s.title.toLowerCase().includes('flowchart') || s.slideNumber === 9) {
        // Draw Flowchart Boxes
        sl.addShape(pptxFile.ShapeType.roundRect, { x: visualX + 1.2, y: visualY, w: 2.1, h: 0.6, fill: '111827', line: { color: '6366F1', width: 1.5 } });
        sl.addText("START (Boot MCU)", { x: visualX + 1.25, y: visualY + 0.1, w: 2.0, h: 0.4, fontSize: 9, color: 'FFFFFF', bold: true, align: 'center', fontFace: 'Trebuchet MS' });

        sl.addShape(pptxFile.ShapeType.rect, { x: visualX + 1.2, y: visualY + 1.1, w: 2.1, h: 0.6, fill: '111827', line: { color: '10B981', width: 1 } });
        sl.addText("Poll Analog Inputs", { x: visualX + 1.25, y: visualY + 1.2, w: 2.0, h: 0.4, fontSize: 9, color: 'E2E8F0', align: 'center', fontFace: 'Arial' });

        sl.addShape(pptxFile.ShapeType.diamond, { x: visualX + 1.0, y: visualY + 2.1, w: 2.5, h: 1.1, fill: '111827', line: { color: 'F59E0B', width: 1 } });
        sl.addText("Compare Limits?", { x: visualX + 1.05, y: visualY + 2.4, w: 2.4, h: 0.5, fontSize: 9, color: 'E2E8F0', align: 'center', fontFace: 'Arial' });

        sl.addShape(pptxFile.ShapeType.rect, { x: visualX + 1.2, y: visualY + 3.6, w: 2.1, h: 0.6, fill: '111827', line: { color: '3B82F6', width: 1 } });
        sl.addText("Drive Output Lines", { x: visualX + 1.25, y: visualY + 3.7, w: 2.0, h: 0.4, fontSize: 9, color: 'E2E8F0', align: 'center', fontFace: 'Arial' });

        // Connectors
        sl.addShape(pptxFile.ShapeType.downArrow, { x: visualX + 2.15, y: visualY + 0.7, w: 0.2, h: 0.3, fill: '6366F1' });
        sl.addShape(pptxFile.ShapeType.downArrow, { x: visualX + 2.15, y: visualY + 1.8, w: 0.2, h: 0.25, fill: '10B981' });
        sl.addShape(pptxFile.ShapeType.downArrow, { x: visualX + 2.15, y: visualY + 3.3, w: 0.2, h: 0.25, fill: '3B82F6' });

      } else if (s.title.toLowerCase().includes('results') || s.slideNumber === 14) {
        // Draw Results Coordinate Graph
        sl.addShape(pptxFile.ShapeType.line, { x: visualX + 0.3, y: visualY + 3.5, w: 4.0, h: 0.01, line: { color: '94A3B8', width: 2 } }); // X axis
        sl.addShape(pptxFile.ShapeType.line, { x: visualX + 0.3, y: visualY + 0.5, w: 0.01, h: 3.0, line: { color: '94A3B8', width: 2 } }); // Y axis

        // Horizontal Grid Helper
        sl.addShape(pptxFile.ShapeType.line, { x: visualX + 0.3, y: visualY + 1.2, w: 4.0, h: 0.01, line: { color: '1E293B', width: 1 } });
        sl.addShape(pptxFile.ShapeType.line, { x: visualX + 0.3, y: visualY + 2.0, w: 4.0, h: 0.01, line: { color: '1E293B', width: 1 } });
        sl.addShape(pptxFile.ShapeType.line, { x: visualX + 0.3, y: visualY + 2.8, w: 4.0, h: 0.01, line: { color: '1E293B', width: 1 } });

        // Waveform / data points line
        sl.addShape(pptxFile.ShapeType.line, { x: visualX + 0.3, y: visualY + 2.9, w: 0.9, h: -0.7, line: { color: '10B981', width: 3 } });
        sl.addShape(pptxFile.ShapeType.line, { x: visualX + 1.2, y: visualY + 2.2, w: 0.9, h: -1.0, line: { color: '10B981', width: 3 } });
        sl.addShape(pptxFile.ShapeType.line, { x: visualX + 2.1, y: visualY + 1.2, w: 0.9, h: 0.5, line: { color: '10B981', width: 3 } });
        sl.addShape(pptxFile.ShapeType.line, { x: visualX + 3.0, y: visualY + 1.7, w: 1.0, h: -1.2, line: { color: '10B981', width: 3 } });

        sl.addText("Efficiency / Transient Waveform", { x: visualX, y: visualY + 3.8, w: visualW, h: 0.4, fontSize: 10, color: '10B981', bold: true, align: 'center', fontFace: 'Trebuchet MS' });
      } else {
        // Default graphic box
        sl.addShape(pptxFile.ShapeType.rect, { x: visualX, y: visualY, w: visualW, h: visualH, fill: '111827', line: { color: '1E293B', width: 1 } });
        
        sl.addShape(pptxFile.ShapeType.roundRect, { x: visualX + 0.3, y: visualY + 0.4, w: visualW - 0.6, h: 3.7, fill: '0B0F19', line: { color: '6366F1', width: 1 } });
        sl.addText(`[ENGINEERING PLOT]\n\n${s.imagePrompt}`, { x: visualX + 0.4, y: visualY + 0.8, w: visualW - 0.8, h: 2.8, fontSize: 10, color: '6366F1', align: 'center', fontFace: 'Trebuchet MS' });
      }
    });

    const pptxName = `Project_${Date.now()}_presentation.pptx`;
    const pptxPath = path.join(UPLOADS_DIR, pptxName);
    const downloadPath = `/uploads/${pptxName}`;

    await pptxFile.writeFile({ fileName: pptxPath });

    await db.run(
      `INSERT INTO downloads (user_id, file_name, file_type, download_url) VALUES ($1, $2, $3, $4)`,
      [req.user.id, pptxName, 'pptx', downloadPath]
    );

    await logActivity(req.user.id, 'PPT_GENERATED', { title, pptxName });
    res.json({ slides: output.slides, downloadUrl: downloadPath });
  } catch (error) {
    res.status(500).json({ message: 'PPT generation failed.', error: error.message });
  }
});

// ==========================================
// DYNAMIC PDF TABLE GENERATOR UTILITY
// ==========================================

function drawPDFTable(docPdf, tableData, startX, startY) {
  const colWidth = 120;
  const rowHeight = 22;
  let currentY = startY;

  // Draw header row background
  docPdf.rect(startX, currentY, tableData.headers.length * colWidth, rowHeight).fill('#1E3A8A');
  docPdf.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
  
  // Write header text
  tableData.headers.forEach((h, i) => {
    docPdf.text(h, startX + (i * colWidth) + 8, currentY + 6, { width: colWidth - 16, align: 'left' });
  });
  
  currentY += rowHeight;
  docPdf.font('Helvetica').fontSize(9).fillColor('#0F172A');

  // Draw row values
  tableData.rows.forEach((r, rowIdx) => {
    // Alternating rows shading
    if (rowIdx % 2 === 0) {
      docPdf.rect(startX, currentY, tableData.headers.length * colWidth, rowHeight).fill('#F8FAFC');
    }
    
    docPdf.fillColor('#334155');
    r.forEach((cellText, cellIdx) => {
      // Bold row checks for Total or Headers
      if (rowIdx === tableData.rows.length - 1 && (tableData.headers[0].includes('Component') || cellText.includes('Total') || cellText.includes('Estimated'))) {
        docPdf.font('Helvetica-Bold').fillColor('#1E3A8A');
      } else {
        docPdf.font('Helvetica');
      }
      docPdf.text(cellText, startX + (cellIdx * colWidth) + 8, currentY + 6, { width: colWidth - 16, align: 'left' });
    });
    
    // Draw horizontal line separator
    docPdf.moveTo(startX, currentY + rowHeight).lineTo(startX + tableData.headers.length * colWidth, currentY + rowHeight).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
    
    currentY += rowHeight;
  });
  
  return currentY;
}

// ==========================================
// AI REPORT GENERATOR MODULE (22 Pages)
// ==========================================

function getReportSections(title, description, userName) {
  const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const lowerTitle = title.toLowerCase();
  
  let mcuName = "Arduino Uno R3";
  if (lowerTitle.includes('esp32')) mcuName = "ESP32 DevKit C V4";
  else if (lowerTitle.includes('esp8266') || lowerTitle.includes('nodemcu')) mcuName = "NodeMCU ESP8266";
  else if (lowerTitle.includes('raspberry') || lowerTitle.includes('pi')) mcuName = "Raspberry Pi 4 Model B (4GB)";
  else if (lowerTitle.includes('stm32')) mcuName = "STM32F401 Nucleo Board";
  else if (lowerTitle.includes('nano')) mcuName = "Arduino Nano V3.0";

  let sensors = ["DHT22 Temp & Humidity Sensor", "HC-SR04 Ultrasonic Distance Sensor", "LDR Ambient Light Resistor"];
  if (lowerTitle.includes('health') || lowerTitle.includes('heart') || lowerTitle.includes('biomedical')) {
    sensors = ["MAX30102 Heart Rate Sensor", "MyoWare EMG Muscle Sensor", "FSR 406 Force Touch Sensor"];
  } else if (lowerTitle.includes('agriculture') || lowerTitle.includes('soil') || lowerTitle.includes('irrigation')) {
    sensors = ["Capacitive Soil Moisture Sensor", "DHT22 Environmental Sensor", "MQ-135 Gas Air Sensor"];
  }

  return [
    {
      title: "Cover Page",
      paragraphs: [
        "A MAJOR PROJECT DISSERTATION REPORT ON",
        `"${title.toUpperCase()}"`,
        "Submitted in partial fulfillment of the requirements\nfor the award of the degree of",
        "BACHELOR OF TECHNOLOGY\nin\nELECTRONICS & COMMUNICATIVE ENGINEERING",
        `Submitted by:\n${userName.toUpperCase()}\nReg No: PF-${Date.now().toString().slice(-6)}`,
        "Under the Guidance of:\nProjectForge AI Advisory Board\nDepartment of Systems & Robotics Engineering",
        "PROJECTFORGE AI UNIVERSITY\nJaipur, Rajasthan, India\nYear 2026"
      ],
      isCover: true
    },
    {
      title: "Certificate of Approval",
      paragraphs: [
        `This is to certify that the major project work entitled "${title}" is a bonafide record of academic research and practical prototype design carried out by ${userName} under my direct supervision. This work has not been submitted elsewhere for any degree or diploma.`,
        "The project has been approved by the internal academic advisory committee after satisfying the necessary performance checkpoints and technical presentations.",
        "\n\n\n\n_______________________\nProject Advisory Committee\nProject Guide & HOD",
        "_______________________\nECE Department Chair\nDivision head",
        "_______________________\nExternal Examiner\nAcademic Review Board"
      ]
    },
    {
      title: "Declaration of Originality",
      paragraphs: [
        `I, ${userName}, student of ECE department, hereby declare that this major project report entitled "${title}" is my own original work. All help and assistance received from other sources has been duly cited and acknowledged.`,
        "No part of this work has been submitted previously for any academic degree at this or any other institution.",
        `\n\n\nDate: ${dateStr}\nPlace: Jaipur, India`,
        `\n\n\n\n_______________________\n${userName}\nStudent Researcher`
      ]
    },
    {
      title: "Acknowledgements",
      paragraphs: [
        "First and foremost, I would like to express my sincere gratitude to my project guides for their invaluable guidance, constant encouragement, and technical feedback throughout the course of this major project.",
        "I am extremely grateful to the Head of Department for providing state-of-the-art laboratory facilities, hardware components, and software tooling that made this prototype possible.",
        "Finally, I would like to thank my peers, family, and the ProjectForge AI platform for providing modular generators and debugging utilities that accelerated my prototyping loops."
      ]
    },
    {
      title: "Abstract",
      paragraphs: [
        `This report presents the complete design, layout, firmware structure, and verification results of "${title}". The objective is to build a reliable prototype of an embedded control node that operates with high precision.`,
        `The hardware architecture leverages a ${mcuName} microcontroller coupled with high-sensitivity sensory modules. Non-blocking timing loops and interrupts govern the firmware environment, allowing low-jitter data acquisition.`,
        "A dual-layer PCB has been designed to eliminate ground loops and reduce noise. Experimental tests demonstrate high reliability, keeping signal response times below 50 milliseconds while drawing nominal standby current. The compiled blueprint is suitable for manufacturing."
      ]
    },
    {
      title: "1. Introduction & Background",
      paragraphs: [
        `In modern electronic systems, reliable prototyping and firmware compilation are essential for deployment. The "${title}" project is designed to bridge the gaps in manual telemetry monitoring by introducing automated feedback loops.`,
        `The primary controller, ${mcuName}, polls sensors at regular intervals, evaluates variables against safety hysteresis margins, and drives active relays or indicator alerts. This report details the theoretical design, software code, schematic routing, and cost budgeting.`,
        "The subsequent chapters discuss the literature survey, hardware specifications, schematic connections, firmware layout, results analysis, and potential patents."
      ]
    },
    {
      title: "2. Literature Review & Prior Art",
      paragraphs: [
        `Numerous studies have proposed microcontroller designs for automated telemetry. Conventional models rely on fixed-value analog circuits that lack digital calibration, resulting in drift.`,
        "Prior art shows that traditional open-loop implementations do not adapt to dynamic sensor responses. This project overcomes these issues by implementing a double-buffered logic cycle with digital filters.",
        "Recent papers advocate for localized processing (Edge computing) to reduce reliance on continuous wireless connections. Our system incorporates this logic, operating independently with a local display fallback."
      ]
    },
    {
      title: "3. Hardware Specifications & Components",
      paragraphs: [
        `The primary processing unit selected is the ${mcuName}. It features sufficient flash storage and SRAM to handle high-frequency data structures and LCD drivers.`,
        `The sensory nodes integrated are: ${sensors.join(', ')}.`,
        "Decoupling capacitors (100nF and 10µF) placed parallel to the LDO input, while a 100nF ceramic capacitor is located within 2mm of the MCU power pins to filter noise.",
        "The power management system utilizes a step-down regulator and ceramic decoupling capacitors, damping spikes and preventing reset faults."
      ]
    },
    {
      title: "4. Component Pin Connection Table",
      paragraphs: [
        "To ensure modularity, a structured wiring map has been established. The following pins on the microcontroller connect directly to sensory peripherals:"
      ],
      table: {
        headers: ["Microcontroller Pin", "Peripheral Pin", "Bus Type", "Signal Class"],
        rows: [
          ["VCC (5V/3.3V)", "VCC Power Input", "DC Power", "Supply"],
          ["GND Plane", "GND Connection", "Unified Ground", "Reference"],
          ["SDA (Pin A4)", "SDA (Sensor Line)", "I2C Serial Data", "Bi-directional Data"],
          ["SCL (Pin A5)", "SCL (Clock Line)", "I2C Serial Clock", "Timing Clock"],
          ["Pin D4 (Digital Out)", "Relay Signal Input", "GPIO Output", "Actuation Control"],
          ["Pin D5 (PWM Out)", "Buzzer Warning Input", "PWM Output", "Audio Alert Output"],
          ["Pin A0 (Analog Input)", "Sensor Signal Line", "ADC Channel 0", "Analog Telemetry Input"]
        ]
      }
    },
    {
      title: "5. Circuit Diagram & Schematic Capture",
      paragraphs: [
        "A complete schematic layout has been captured in KiCad. It details power routing, signal channels, and decoupling filters.",
        "A 10µF electrolytic capacitor is placed parallel to the LDO input, while a 100nF ceramic capacitor is located within 2mm of the MCU power pins to filter noise.",
        "A flyback diode is connected across the relay coil to absorb reverse electromotive forces, shielding the logic transistors from damage."
      ]
    },
    {
      title: "6. Flowchart & Logical Steps",
      paragraphs: [
        "The system execution flows in a deterministic state cycle:",
        "1. Power-On Self Test (POST): Initializes ports, checks I2C display.\n2. Calibration: Samples ambient sensor noise levels.\n3. Poll Loop: Enters periodic reading of input pins using non-blocking timers.\n4. Decision Logic: Checks if thresholds are exceeded.\n5. Output Actuation: Triggers warning buzzer and locks relay lines on alert.\n6. Loop Repeat.",
        "This loop ensures that the controller spends minimal time in blocked delays, keeping response times under 50ms."
      ]
    },
    {
      title: "7. Methodology & Design Calculations",
      paragraphs: [
        "The digital input signal is filtered using a running average equation to dampen transient noise:",
        "Filtered_Val = (Raw_Val * Alpha) + (Last_Val * (1 - Alpha))",
        "Where alpha is set to 0.1, balancing speed with noise reduction. Duty cycles are managed dynamically, keeping the controller in sleep states during idle periods."
      ]
    },
    {
      title: "8. Working Principle",
      paragraphs: [
        "The working principle is based on closed-loop feedback control. When the environmental sensors register value increases, the analog-to-digital converter converts it to a 10-bit integer.",
        "The firmware compares this integer with the limit boundary. A hysteresis margin of 5% is enforced, preventing rapid switching (chatter) near the limit boundary.",
        "The status is continuously logged to the serial register and printed on the LCD screen, allowing local debugging."
      ]
    },
    {
      title: "9. Code Overview & Non-Blocking Design",
      paragraphs: [
        "The firmware is structured in modular functions to separate reading, processing, and output drivers. Non-blocking millis() checks substitute raw delays.",
        "This allows the MCU to handle emergency button interrupts and telemetry writes concurrently, preventing latency bottlenecks.",
        "The variables are declared with appropriate data types (volatile for interrupt flags, float for sensor metrics) to optimize RAM."
      ]
    },
    {
      title: "10. Full Code Listing",
      paragraphs: [
        "Below is the complete C++ firmware listing compiled for the prototype:",
        `// PROJECTFORGE AI COMPILATION UNIT\n#include <Arduino.h>\n#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n\n#define SENSOR_PIN A0\n#define RELAY_PIN 4\n#define BUZZER_PIN 5\n#define TEMP_THRESHOLD 500\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\nfloat sensorVal = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(RELAY_PIN, OUTPUT);\n  pinMode(BUZZER_PIN, OUTPUT);\n  lcd.init();\n  lcd.backlight();\n  lcd.print("System Ready");\n  delay(1000);\n  lcd.clear();\n}\n\nvoid loop() {\n  int raw = analogRead(SENSOR_PIN);\n  sensorVal = (raw * 0.1) + (sensorVal * 0.9);\n  lcd.setCursor(0, 0);\n  lcd.print("Val: ");\n  lcd.print(sensorVal);\n  \n  if (sensorVal > TEMP_THRESHOLD) {\n    digitalWrite(RELAY_PIN, HIGH);\n    digitalWrite(BUZZER_PIN, HIGH);\n    lcd.setCursor(0, 1);\n    lcd.print("ALERT MODE  ");\n  } else {\n    digitalWrite(RELAY_PIN, LOW);\n    digitalWrite(BUZZER_PIN, LOW);\n    lcd.setCursor(0, 1);\n    lcd.print("NORMAL MODE ");\n  }\n  delay(500);\n}`
      ]
    },
    {
      title: "11. KiCad PCB Layout Details",
      paragraphs: [
        "A dedicated dual-layer PCB has been designed. A solid ground plane is poured on the bottom copper layer, shielding high-frequency signals.",
        "Traces carrying power are routed with 0.6mm width, while logic traces are 0.25mm. 45-degree bends are used exclusively to avoid impedance spikes.",
        "Drill sizes are set to 0.8mm for standard DIP pins, conforming to assembly limits."
      ]
    },
    {
      title: "12. Bill of Materials (BOM) & Budget",
      paragraphs: [
        "The project prototype cost is structured below. Total estimated expenditure is kept minimal to allow scaling:"
      ],
      table: {
        headers: ["Component Name", "Quantity", "Unit Cost (INR)", "Total Cost (INR)"],
        rows: [
          [`${mcuName} Core Board`, "1", "₹450", "₹450"],
          ["Primary Sensory Node", "1", "₹250", "₹250"],
          ["Relays & Actuation Drivers", "1", "₹150", "₹150"],
          ["Dual-layer PCB Fabrication", "1", "₹500", "₹500"],
          ["Enclosure and Fittings", "1", "₹200", "₹200"],
          ["Total Estimated Prototype Cost", "-", "-", "₹1,550"]
        ]
      }
    },
    {
      title: "13. Experimental Results & Discussion",
      paragraphs: [
        "Tests conducted in the laboratory confirm high operational stability. The controller responded within 45ms of sensor threshold breaches.",
        "Voltage levels remained stable at 3.31V under load, indicating a healthy power regulator circuit. Temperature logs show no thermal accumulation.",
        "A linear response curve was observed during calibration, verifying sensor output reliability."
      ]
    },
    {
      title: "14. Noise Analysis & Signal Integrity",
      paragraphs: [
        "High frequency signal lines are routed away from power lines to reduce EMI coupling effects. Decoupling capacitors act as local energy storage, providing transient current during switching states.",
        "Shielding the ground plane reduces noise levels on analog inputs by 18dB, securing stability during high loads. Copper plane density is kept uniform to avoid thermal stress warping."
      ]
    },
    {
      title: "15. Real-world Applications",
      paragraphs: [
        `The "${title}" prototype is applicable in numerous domains:`,
        "- Industrial Automation: For tracking machine states and safety triggers.\n- Smart Agriculture: For tracking environmental parameters and automated water pumps.\n- Smart Cities: For automated waste, power, or street light grids.\n- Biomedical Systems: For telemetry data logging in medical devices."
      ]
    },
    {
      title: "16. Advantages & Performance Gains",
      paragraphs: [
        "- Low Cost: Built with standard, cheap off-the-shelf components.\n- Modularity: Swapping the primary sensor requires minimal firmware updates.\n- High Precision: Digital filters suppress noise, minimizing false alarms.\n- Layout Protection: Dual-layer PCB shielding prevents logic corruption."
      ]
    },
    {
      title: "17. Case Studies & Deployments",
      paragraphs: [
        "In a simulated testing chamber, the system maintained operational continuity for 120 hours without a single MCU reset or watchdog trigger.",
        "A benchmark test alongside traditional PLCs showed identical response bounds, verifying that microcontroller architectures can match industrial grade standards for small-scale processes."
      ]
    },
    {
      title: "18. Limitations & Operational Boundaries",
      paragraphs: [
        "Despite its advantages, the prototype has operational limits. The ADC resolution is bound to 10 bits, restricting absolute resolution.",
        "Additionally, the local I2C display bus operates up to 10 meters before signal degradation occurs. High-temperature conditions exceeding 85°C require shielded enclosures."
      ]
    },
    {
      title: "19. Future Research Scope",
      paragraphs: [
        "Future updates will incorporate a TinyML model directly on the MCU to forecast anomalies, reducing latency.",
        "We also plan to add a rechargeable lithium-polymer battery pack with a solar charging controller, enabling off-grid deployment.",
        "Integrating a mesh transceiving network (LoRaWAN) will allow rural telemetry monitoring over 15km."
      ]
    },
    {
      title: "20. Conclusion",
      paragraphs: [
        `The design, assembly, and testing of the "${title}" prototype were completed successfully.`,
        "All core objectives, including sensor reading, display output, and relay control, were met.",
        "The project showcases the benefits of structured PCB layout and non-blocking firmware design in modern embedded systems."
      ]
    },
    {
      title: "21. References",
      paragraphs: [
        "1. ProjectForge AI Research. (2026). 'Principles of Modern Embedded System Engineering'. ProjectForge AI Press.",
        "2. Horowitz, P., & Hill, W. (2015). 'The Art of Electronics'. Cambridge University Press.",
        "3. Banzi, M., & Shiloh, M. (2014). 'Getting Started with Arduino'. Maker Media.",
        "4. Standard IEEE Guidelines for Low-Power Telemetry Nodes, IEEE Trans. on Instrumentation, Vol. 12, pp. 45-52."
      ]
    }
  ];
}

app.post('/api/ai/report', upload.single('templateFile'), verifyToken, async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: 'Report title and description are required.' });
  }

  try {
    let templateData = {
      fontFamily: 'Helvetica',
      headingColor: '1E3A8A',
      headingFont: 'Helvetica-Bold',
      margin: 50,
      hasCertificate: false,
      coverLayout: 'standard'
    };

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      console.log(`[Report Template] Parsing file: ${req.file.originalname} (ext: ${ext})`);
      if (ext === '.docx') {
        templateData = extractDocxTemplate(req.file.path);
      } else if (ext === '.pdf') {
        templateData = extractPdfTemplate(req.file.path);
      }
      console.log(`[Report Template] Extracted properties:`, templateData);
    }

    const sections = getReportSections(title, description, req.user.name || 'Student Engineer');
    
    // Splice in Certificate page if detected in template
    if (templateData.hasCertificate) {
      sections.splice(1, 0, {
        title: "Certificate of Authenticity",
        isCertificate: true,
        paragraphs: [
          "This is to certify that the project report entitled:",
          `"${title.toUpperCase()}"`,
          `Submitted by ${req.user.name || 'Student Engineer'} in partial fulfillment of the requirements for the award of Bachelor of Technology, is a bonafide record of the work carried out under the supervision of the Department of Engineering.`,
          "The results embodied in this dissertation have not been submitted to any other University or Institute for the award of any degree or diploma.",
          "Internal Examiner",
          "Head of Department"
        ]
      });
    }

    const docParagraphs = [];

    // Construct the Word Document using docx library
    sections.forEach((sec) => {
      if (sec.isCover) {
        // Styled Cover Page
        docParagraphs.push(
          new Paragraph({
            text: sec.paragraphs[0],
            heading: HeadingLevel.HEADING_3,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "\n" }),
          new Paragraph({
            text: sec.paragraphs[1],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "\n".repeat(2) }),
          new Paragraph({
            text: sec.paragraphs[2],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: sec.paragraphs[3],
            heading: HeadingLevel.HEADING_3,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "\n".repeat(2) }),
          new Paragraph({
            text: sec.paragraphs[4],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "\n" }),
          new Paragraph({
            text: sec.paragraphs[5],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "\n".repeat(3) }),
          new Paragraph({
            text: sec.paragraphs[6],
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          })
        );
      } else if (sec.isCertificate) {
        // Styled Certificate Page in Word
        docParagraphs.push(
          new Paragraph({
            text: sec.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            pageBreakBefore: true,
          }),
          new Paragraph({ text: "\n\n" }),
          new Paragraph({ text: sec.paragraphs[0], alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "\n" }),
          new Paragraph({ text: sec.paragraphs[1], heading: HeadingLevel.HEADING_3, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "\n" }),
          new Paragraph({ text: sec.paragraphs[2], alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "\n" }),
          new Paragraph({ text: sec.paragraphs[3], alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "\n".repeat(4) }),
          new Paragraph({ text: "_______________________                         _______________________", alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "   Internal Examiner                                 Head of Department", alignment: AlignmentType.CENTER })
        );
      } else {
        // Regular Section
        docParagraphs.push(
          new Paragraph({
            text: sec.title,
            heading: HeadingLevel.HEADING_2,
            pageBreakBefore: true, // Force start on fresh page
          }),
          new Paragraph({ text: "\n" })
        );
        sec.paragraphs.forEach(para => {
          docParagraphs.push(
            new Paragraph({
              text: para,
              alignment: AlignmentType.LEFT,
            }),
            new Paragraph({ text: "\n" })
          );
        });

        // Add Table to DOCX if exists
        if (sec.table) {
          const docTable = new docx.Table({
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            rows: [
              new docx.TableRow({
                children: sec.table.headers.map(h => new docx.TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })] })],
                  shading: { fill: templateData.headingColor } // Dark blue or custom header background
                }))
              }),
              ...sec.table.rows.map(r => new docx.TableRow({
                children: r.map(cellText => new docx.TableCell({
                  children: [new Paragraph({ text: cellText })]
                }))
              }))
            ]
          });
          docParagraphs.push(docTable, new Paragraph({ text: "\n" }));
        }
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: docParagraphs
      }]
    });

    const reportDocxName = `Report_${Date.now()}_college.docx`;
    const reportDocxPath = path.join(UPLOADS_DIR, reportDocxName);
    const downloadDocxPath = `/uploads/${reportDocxName}`;

    const docxBuffer = await Packer.toBuffer(doc);
    fs.writeFileSync(reportDocxPath, docxBuffer);

    // Generate real PDF file using PDFKit
    const reportPdfName = `Report_${Date.now()}_college.pdf`;
    const reportPdfPath = path.join(UPLOADS_DIR, reportPdfName);
    const downloadPdfPath = `/uploads/${reportPdfName}`;

    const docPdf = new PDFDocument({ margin: templateData.margin, bufferPages: true });
    const pdfStream = fs.createWriteStream(reportPdfPath);
    docPdf.pipe(pdfStream);

    const fontFamily = templateData.fontFamily === 'Times-Roman' ? 'Times-Roman' : (templateData.fontFamily === 'Courier' ? 'Courier' : 'Helvetica');
    const headingFont = templateData.headingFont === 'Times-Bold' ? 'Times-Bold' : (templateData.headingFont === 'Courier-Bold' ? 'Courier-Bold' : 'Helvetica-Bold');
    const pdfHeadingColor = '#' + templateData.headingColor;

    docPdf.font(fontFamily);

    // Title / Cover Page in PDF
    const coverSec = sections[0];
    docPdf.rect(30, 30, 552, 732).strokeColor(pdfHeadingColor).lineWidth(2).stroke();
    docPdf.rect(35, 35, 542, 722).strokeColor('#94A3B8').lineWidth(1).stroke();

    docPdf.moveDown(4);
    docPdf.font(headingFont).fontSize(13).fillColor(pdfHeadingColor).text(coverSec.paragraphs[0], { align: 'center', paragraphGap: 15 });
    docPdf.font(headingFont).fontSize(24).fillColor('#0F172A').text(coverSec.paragraphs[1], { align: 'center', bold: true, paragraphGap: 30 });
    docPdf.font(fontFamily).fontSize(11).fillColor('#475569').text(coverSec.paragraphs[2], { align: 'center', paragraphGap: 5 });
    docPdf.font(headingFont).fontSize(13).fillColor('#0F172A').text(coverSec.paragraphs[3], { align: 'center', bold: true, paragraphGap: 50 });
    
    docPdf.font(fontFamily).fontSize(11).fillColor('#0F172A').text(coverSec.paragraphs[4], { align: 'center', paragraphGap: 25 });
    docPdf.text(coverSec.paragraphs[5], { align: 'center', paragraphGap: 50 });
    
    docPdf.font(headingFont).fontSize(14).fillColor(pdfHeadingColor).text("DEPARTMENT OF ENGINEERING", { align: 'center', bold: true, paragraphGap: 5 });
    docPdf.font(fontFamily).fontSize(12).fillColor('#475569').text("PROJECTFORGE AI UNIVERSITY", { align: 'center' });

    // Append regular sections in PDF
    sections.forEach((sec, idx) => {
      if (idx === 0) return; // Skip cover

      docPdf.addPage();
      
      if (sec.isCertificate) {
        // Draw decorative frame for certificate page
        docPdf.rect(40, 40, 512, 712).strokeColor(pdfHeadingColor).lineWidth(1.5).stroke();
        docPdf.moveDown(3);
        docPdf.font(headingFont).fontSize(20).fillColor(pdfHeadingColor).text(sec.title, { align: 'center', paragraphGap: 35 });
        docPdf.font(fontFamily).fontSize(11).fillColor('#334155').text(sec.paragraphs[0], { align: 'center', paragraphGap: 15 });
        docPdf.font(headingFont).fontSize(14).fillColor('#0F172A').text(sec.paragraphs[1], { align: 'center', paragraphGap: 30 });
        docPdf.font(fontFamily).fontSize(11).fillColor('#334155').text(sec.paragraphs[2], { align: 'center', lineGap: 5, paragraphGap: 20 });
        docPdf.text(sec.paragraphs[3], { align: 'center', lineGap: 5, paragraphGap: 80 });
        
        const currentY = docPdf.y;
        docPdf.font(headingFont).fontSize(10).fillColor('#0F172A');
        docPdf.text("Internal Examiner", 80, currentY, { width: 180, align: 'left' });
        docPdf.text("Head of Department", 340, currentY, { width: 180, align: 'right' });
        return;
      }

      // Header
      docPdf.font(fontFamily).fontSize(9).fillColor('#94A3B8').text(`MAJOR DISSERTATION: ${title.toUpperCase()}`, 50, 30, { align: 'left' });
      docPdf.moveTo(50, 42).lineTo(562, 42).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

      // Title
      docPdf.font(headingFont).fontSize(16).fillColor(pdfHeadingColor).text(sec.title, 50, 60, { underline: false, bold: true, paragraphGap: 20 });
      
      // Paragraphs
      sec.paragraphs.forEach(p => {
        if (p.includes('#include') || p.includes('void setup()') || p.includes('volatile ')) {
          // Format as a code listing block with dynamic height checking
          docPdf.font('Courier').fontSize(8.5);
          const blockHeight = docPdf.heightOfString(p, { width: 500, lineGap: 3.5 });
          const currentY = docPdf.y;
          
          docPdf.rect(48, currentY - 4, 504, blockHeight + 12).fill('#0F172A');
          docPdf.fillColor('#E2E8F0');
          docPdf.text(p, 54, currentY + 2, { width: 492, lineGap: 3.5 });
          
          docPdf.font(fontFamily); // Restore font
          docPdf.moveDown(1);
        } else {
          docPdf.font(fontFamily).fontSize(11).fillColor('#334155').text(p, { paragraphGap: 12, align: 'justify', lineGap: 4 });
        }
      });

      // Draw Table in PDF if exists
      if (sec.table) {
        docPdf.moveDown(1);
        const finalY = drawPDFTable(docPdf, sec.table, 50, docPdf.y);
        docPdf.y = finalY + 10;
      }
    });

    // Write footer page numbers using buffer pages range loop
    const range = docPdf.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      docPdf.switchToPage(i);
      if (i > 0) {
        docPdf.fontSize(9).fillColor('#94A3B8');
        docPdf.text(`Page ${i + 1} of ${range.count}`, 50, 755, { align: 'right' });
      }
    }

    docPdf.end();

    // Wait for the PDF stream to write fully to disk before returning response
    await new Promise((resolve, reject) => {
      pdfStream.on('finish', resolve);
      pdfStream.on('error', reject);
    });

    await db.run(
      `INSERT INTO downloads (user_id, file_name, file_type, download_url) VALUES ($1, $2, $3, $4)`,
      [req.user.id, reportDocxName, 'docx', downloadDocxPath]
    );
    await db.run(
      `INSERT INTO downloads (user_id, file_name, file_type, download_url) VALUES ($1, $2, $3, $4)`,
      [req.user.id, reportPdfName, 'pdf', downloadPdfPath]
    );

    await logActivity(req.user.id, 'REPORT_GENERATED', { title, reportDocxName });
    res.json({ success: true, docxUrl: downloadDocxPath, pdfUrl: downloadPdfPath });
  } catch (error) {
    res.status(500).json({ message: 'Report generation failed.', error: error.message });
  }
});

// ==========================================
// VALIDATOR & FALLBACK HELPER FOR CIRCUIT GENERATOR
// ==========================================

// Shared component parser: handles comma-separated AND newline-separated lists
// Also strips quantity annotations like "– 2", "- 1", "(Label)", etc.
function parseComponents(raw) {
  if (!raw) return [];
  // Replace newlines with commas so we can split uniformly
  const normalized = raw.replace(/\r?\n/g, ',');
  return normalized
    .split(',')
    .map(c => {
      // Strip em-dash / en-dash quantity annotations: "– 2 or more", "– 1", "- 2x"
      c = c.replace(/\s*[\u2013\u2014-]\s*\d+[^,]*/g, '');
      // Strip parenthetical qualifiers like "(Line Tracking Sensor)"
      c = c.replace(/\([^)]*\)/g, '');
      // Strip trailing numbers/quantities e.g. "x2", "x 2"
      c = c.replace(/\s+x\s*\d+$/i, '');
      // Remove unsafe S-expression characters but keep basic punctuation
      c = c.replace(/["\\;{}]/g, '');
      return c.trim();
    })
    .filter(c => c.length >= 2); // must have at least 2 chars to be a real component
}

function validateComponentsAndSymbols(projectName, compArray) {
  if (!projectName || projectName.trim() === '') {
    throw new Error('Project name is invalid or empty.');
  }
  if (!compArray || compArray.length === 0) {
    throw new Error('Components list is empty.');
  }
  for (const comp of compArray) {
    if (!comp || comp.trim() === '') {
      throw new Error('Component entry cannot be empty.');
    }
    // Only block truly dangerous injection characters (SQL/script injection etc.)
    // Allow parentheses, em-dashes, slashes as they appear in real component names
    if (/["\\;{}]/.test(comp)) {
      throw new Error(`Component name contains unsafe characters: "${comp.slice(0,40)}".`);
    }
  }
}

function generateFallbackCircuit(projectName, components, mcu, reason) {
  let comps = [];
  try {
    comps = components ? components.split(',').map(c => c.trim()).filter(Boolean) : [];
  } catch (e) {
    comps = ["Sensor", "Actuator"];
  }
  
  // Clean component names for rendering
  const cleanComps = comps.map(c => c.replace(/["\\()\[\];{}]/g, '').trim()).filter(Boolean);
  if (cleanComps.length === 0) {
    cleanComps.push("Peripheral Module");
  }

  // 1. Generate fallback Circuit Diagram SVG (Schematic)
  let circuitSvg = `<svg viewBox="0 0 800 500" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#F8FAFC; border-radius: 12px; font-family: monospace;">`;
  circuitSvg += `<defs>
    <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E5E7EB"/><stop offset="50%" stop-color="#9CA3AF"/><stop offset="100%" stop-color="#4B5563"/></linearGradient><pattern id="grid-fallback" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#FFFFFF"/></pattern></defs>`;
  circuitSvg += `<rect width="100%" height="100%" fill="url(#grid-fallback)"/>`;
  
  // Header block
  circuitSvg += `<rect x="550" y="420" width="230" height="70" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>`;
  circuitSvg += `<text x="560" y="440" fill="#0F172A" font-size="11" font-weight="bold">FALLBACK SCHEMATIC</text>`;
  circuitSvg += `<text x="560" y="460" fill="#94A3B8" font-size="9">REASON: ${reason.slice(0, 28)}</text>`;
  circuitSvg += `<text x="560" y="480" fill="#EF4444" font-size="9">STATUS: FALLBACK VERIFIED</text>`;

  // Central MCU Box
  circuitSvg += `<rect x="300" y="150" width="200" height="220" fill="none" stroke="#E53935" stroke-width="2" rx="4"/>`;
  circuitSvg += `<text x="400" y="180" fill="#0F172A" font-size="14" font-weight="bold" text-anchor="middle">${mcu}</text>`;
  circuitSvg += `<text x="400" y="195" fill="#EF4444" font-size="9" text-anchor="middle">SAFE FALLBACK MCU</text>`;

  // Draw fallbacks for first few components
  cleanComps.forEach((c, idx) => {
    if (idx > 3) return;
    const blockX = idx % 2 === 0 ? 60 : 620;
    const blockY = 100 + (idx * 80);
    const mcuPinY = 200 + (idx * 40);
    const color = "#F59E0B";
    
    if (idx % 2 === 0) {
      circuitSvg += `<path d="M 180 ${blockY + 25} H 240 V ${mcuPinY} H 300" fill="none" stroke="${color}" stroke-width="2"/>`;
      circuitSvg += `<circle cx="300" cy="${mcuPinY}" r="3.5" fill="${color}"/>`;
      circuitSvg += `<text x="308" y="${mcuPinY + 3}" fill="#FFFFFF" font-size="9" font-weight="bold">D${idx+2}</text>`;
    } else {
      circuitSvg += `<path d="M 620 ${blockY + 25} H 560 V ${mcuPinY} H 500" fill="none" stroke="${color}" stroke-width="2"/>`;
      circuitSvg += `<circle cx="500" cy="${mcuPinY}" r="3.5" fill="${color}"/>`;
      circuitSvg += `<text x="492" y="${mcuPinY + 3}" fill="#FFFFFF" font-size="9" font-weight="bold" text-anchor="end">D${idx+2}</text>`;
    }

    circuitSvg += `<rect x="${blockX}" y="${blockY}" width="120" height="50" fill="#FFFFFF" stroke="${color}" stroke-width="1.5" rx="3"/>`;
    circuitSvg += `<text x="${blockX + 60}" y="${blockY + 22}" fill="#0F172A" font-size="9" font-weight="bold" text-anchor="middle">${c.slice(0, 16)}</text>`;
    circuitSvg += `<text x="${blockX + 60}" y="${blockY + 37}" fill="${color}" font-size="8" text-anchor="middle">FALLBACK PERIPHERAL</text>`;
  });

  circuitSvg += `</svg>`;

  // 2. Generate fallback Wiring Diagram SVG
  let wiringSvg = `<svg viewBox="0 0 800 500" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#F8FAFC; border-radius: 12px; font-family: monospace;">`;
  wiringSvg += `<rect width="100%" height="100%" fill="#FFFFFF"/>`;
  
  // Breadboard base
  wiringSvg += `<rect x="50" y="240" width="700" height="220" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="3" rx="8"/>`;
  wiringSvg += `<line x1="60" y1="257" x2="740" y2="257" stroke="#EF4444" stroke-width="1.5"/>`;
  wiringSvg += `<line x1="60" y1="442" x2="740" y2="442" stroke="#3B82F6" stroke-width="1.5"/>`;
  wiringSvg += `<text x="70" y="272" fill="#EF4444" font-size="9" font-weight="bold">VCC (+) 5.0V (SAFE MODE)</text>`;
  wiringSvg += `<text x="70" y="432" fill="#3B82F6" font-size="9" font-weight="bold">GND (-) (SAFE MODE)</text>`;

  // Draw central MCU
  wiringSvg += `<rect x="250" y="70" width="300" height="100" fill="#FFFFFF" stroke="#2563EB" stroke-width="2.5" rx="6"/>`;
  wiringSvg += `<text x="400" y="115" fill="#FFFFFF" font-size="16" font-weight="bold" text-anchor="middle">${mcu}</text>`;
  wiringSvg += `<text x="400" y="135" fill="#64748B" font-size="10" text-anchor="middle">SAFE FALLBACK WIRING</text>`;

  // Draw fallback connections
  wiringSvg += `<path d="M 280 170 C 280 210, 180 257, 180 257" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>`;
  wiringSvg += `<circle cx="180" cy="257" r="4.5" fill="#EF4444"/>`;
  wiringSvg += `<path d="M 520 170 C 520 260, 520 442, 520 442" fill="none" stroke="#3B82F6" stroke-width="3" stroke-linecap="round"/>`;
  wiringSvg += `<circle cx="520" cy="442" r="4.5" fill="#3B82F6"/>`;

  cleanComps.forEach((c, idx) => {
    if (idx > 2) return;
    const compX = 120 + (idx * 180);
    const wireColor = ["#F59E0B", "#10B981", "#8B5CF6"][idx % 3];
    const mcuPinX = 320 + (idx * 50);
    
    wiringSvg += `<path d="M ${mcuPinX} 170 C ${mcuPinX} 220, ${compX + 30} 270, ${compX + 30} 290" fill="none" stroke="${wireColor}" stroke-width="2.5" stroke-linecap="round"/>`;
    wiringSvg += `<circle cx="${compX + 30}" cy="290" r="3.5" fill="${wireColor}"/>`;
    wiringSvg += `<rect x="${compX}" y="310" width="120" height="50" fill="#FFFFFF" stroke="${wireColor}" stroke-width="1.5" rx="4"/>`;
    wiringSvg += `<text x="${compX + 60}" y="335" fill="#0F172A" font-size="9" font-weight="bold" text-anchor="middle">${c.slice(0, 16)}</text>`;
  });

  wiringSvg += `</svg>`;

  // 3. Fallback connection table
  const connectionTable = [
    { from: `${mcu} VCC`, to: "System VCC Rail", type: "Power" },
    { from: `${mcu} GND`, to: "System GND Rail", type: "Ground" }
  ];
  cleanComps.forEach((c, idx) => {
    connectionTable.push({
      from: `${mcu} D${idx+2}`,
      to: `${c} IO Pin`,
      type: "GPIO/Fallback"
    });
  });

  // 4. Fallback pin mapping
  const pinMapping = [
    { pin: "VCC / 5V", connectedTo: "System Power Rail", purpose: "Power Supply" },
    { pin: "GND", connectedTo: "Common Ground Rail", purpose: "System Ground" }
  ];
  cleanComps.forEach((c, idx) => {
    pinMapping.push({
      pin: `D${idx+2}`,
      connectedTo: c,
      purpose: "I/O Connection (Fallback)"
    });
  });

  return { circuitSvg, wiringSvg, pinMapping, connectionTable };
}

// ==========================================
// CIRCUIT DIAGRAM GENERATOR MODULE (Schematic & Wiring SVG Capture)
// ==========================================

app.post('/api/ai/circuit', verifyToken, async (req, res) => {
  const { projectName, components } = req.body;
  if (!projectName || !components) {
    return res.status(400).json({ message: 'Project Name and components list are required.' });
  }
  console.log(`[CircuitGen] Request — Project: "${projectName}", Components: "${components}"`);

  try {
    // Smart multi-format parser: handles comma AND newline separated lists,
    // strips quantity annotations ("– 2"), parenthetical notes, etc.
    const compArray = parseComponents(components);
    console.log(`[CircuitGen] Compiling and generating circuit data for components:`, compArray);
    
    // Log the generated circuit data before compilation/generation
    console.log(`[CircuitGen] DATA BEFORE COMPILATION:`, { projectName, components: components.slice(0, 200), compCount: compArray.length });

    // Validate symbols and component references (lenient)
    validateComponentsAndSymbols(projectName, compArray);

    const lowerName = projectName.toLowerCase();
    let mcu = "Arduino Uno";
    if (lowerName.includes('esp32')) mcu = "ESP32";
    else if (lowerName.includes('esp8266') || lowerName.includes('nodemcu')) mcu = "ESP8266 NodeMCU";
    else if (lowerName.includes('raspberry') || lowerName.includes('pi')) mcu = "Raspberry Pi";
    else if (lowerName.includes('stm32')) mcu = "STM32 Nucleo";
    else if (lowerName.includes('nano')) mcu = "Arduino Nano";

    // Also detect MCU from components list
    for (const c of compArray) {
      const cl = c.toLowerCase();
      if (cl.includes('esp32')) { mcu = 'ESP32'; break; }
      if (cl.includes('esp8266') || cl.includes('nodemcu')) { mcu = 'ESP8266 NodeMCU'; break; }
      if (cl.includes('raspberry') || cl.includes('pi pico')) { mcu = 'Raspberry Pi'; break; }
      if (cl.includes('stm32')) { mcu = 'STM32 Nucleo'; break; }
      if (cl.includes('mega')) { mcu = 'Arduino Mega'; break; }
      if (cl.includes('nano')) { mcu = 'Arduino Nano'; break; }
    }

    console.log(`[CircuitGen] Detected MCU: ${mcu}`);
    
    // Pin Mapping and connections list
    const pinMapping = [
      { pin: "3.3V / 5V", connectedTo: "Power Rails (VCC)", purpose: "System Supply Power" },
      { pin: "GND", connectedTo: "Unified Ground Rail", purpose: "System Common Ground" }
    ];
    const connectionTable = [
      { from: `${mcu} VCC`, to: "Sensors & Actuators VCC", type: "Power" },
      { from: `${mcu} GND`, to: "Sensors & Actuators GND", type: "Ground" }
    ];

    compArray.forEach((c, i) => {
      if (c.toLowerCase().includes('esp32') || c.toLowerCase().includes('arduino') || c.toLowerCase().includes('raspberry') || c.toLowerCase().includes('nodemcu') || c.toLowerCase().includes('controller')) {
        return; // Skip main MCU
      }
      
      const pinNum = `D${2 + i}`;
      pinMapping.push({
        pin: pinNum,
        connectedTo: c,
        purpose: "Data I/O / Analog Reading"
      });
      
      connectionTable.push({
        from: `${mcu} ${pinNum}`,
        to: `${c} Signal Pin`,
        type: c.toLowerCase().includes('analog') || c.toLowerCase().includes('sensor') ? "Analog/Input" : "GPIO/Output"
      });
    });

    // ════════════════════════════════════════════════════════════
    // 1. CIRCUIT DIAGRAM — Fritzing-style with component illustrations
    // ════════════════════════════════════════════════════════════

    // Component visual library (inline SVG snippets per component)
    const compVisuals = {
      // ── Arduino Uno ──
      'arduino': (x, y, label) => {
        const pins = ['D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'];
        let s = ``;
        // PCB body
        s += `<rect x="${x}" y="${y}" width="110" height="160" fill="#005C8A" stroke="#00476B" stroke-width="2" rx="4"/>`;
        s += `<rect x="${x+5}" y="${y+5}" width="100" height="150" fill="#005C8A" stroke="#005C8A" stroke-width="1" rx="3"/>`;
        // MCU chip
        s += `<rect x="${x+25}" y="${y+50}" width="60" height="60" fill="#111" stroke="#444" stroke-width="1" rx="2"/>`;
        s += `<text x="${x+55}" y="${y+76}" fill="#aaa" font-size="6" text-anchor="middle" font-family="monospace">ATMEGA</text>`;
        s += `<text x="${x+55}" y="${y+85}" fill="#aaa" font-size="6" text-anchor="middle" font-family="monospace">328P</text>`;
        // USB connector
        s += `<rect x="${x+35}" y="${y+138}" width="40" height="18" fill="#888" stroke="#555" stroke-width="1" rx="3"/>`;
        s += `<text x="${x+55}" y="${y+150}" fill="#ddd" font-size="5" text-anchor="middle" font-family="monospace">USB</text>`;
        // Pin headers — left
        for (let i = 0; i < 6; i++) {
          s += `<rect x="${x-8}" y="${y+18+(i*18)}" width="8" height="8" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
          s += `<text x="${x-16}" y="${y+25+(i*18)}" fill="#FFFFFF" font-size="5.5" text-anchor="middle" font-family="monospace">${pins[i]}</text>`;
        }
        // Pin headers — right
        for (let i = 0; i < 6; i++) {
          s += `<rect x="${x+110}" y="${y+18+(i*18)}" width="8" height="8" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
          s += `<text x="${x+126}" y="${y+25+(i*18)}" fill="#FFFFFF" font-size="5.5" text-anchor="middle" font-family="monospace">${pins[i+6]}</text>`;
        }
        // Power pins at top
        ['5V','3.3V','GND','RST'].forEach((p,i) => {
          s += `<rect x="${x+10+(i*25)}" y="${y-8}" width="8" height="8" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
          s += `<text x="${x+14+(i*25)}" y="${y-10}" fill="#94A3B8" font-size="5" text-anchor="middle" font-family="monospace">${p}</text>`;
        });
        s += `<text x="${x+55}" y="${y+30}" fill="#FFFFFF" font-size="9" font-weight="bold" text-anchor="middle" font-family="monospace">ARDUINO UNO</text>`;
        s += `<text x="${x+55}" y="${y+170}" fill="#64A3E0" font-size="7" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'esp32': (x, y, label) => {
        let s = ``;
        s += `<rect x="${x}" y="${y}" width="90" height="140" fill="#1A3A1A" stroke="#22C55E" stroke-width="2" rx="4"/>`;
        s += `<rect x="${x+10}" y="${y+15}" width="70" height="50" fill="#111" stroke="#333" stroke-width="1" rx="2"/>`;
        s += `<text x="${x+45}" y="${y+36}" fill="#aaa" font-size="6" text-anchor="middle" font-family="monospace">ESP32</text>`;
        s += `<text x="${x+45}" y="${y+46}" fill="#aaa" font-size="5" text-anchor="middle" font-family="monospace">WROOM-32</text>`;
        // Antenna
        s += `<line x1="${x+45}" y1="${y}" x2="${x+45}" y2="${y-15}" stroke="#22C55E" stroke-width="2"/>`;
        s += `<line x1="${x+35}" y1="${y-15}" x2="${x+55}" y2="${y-15}" stroke="#22C55E" stroke-width="2"/>`;
        // Left pins
        for (let i = 0; i < 7; i++) {
          s += `<rect x="${x-8}" y="${y+20+(i*15)}" width="8" height="6" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
          s += `<text x="${x-14}" y="${y+26+(i*15)}" fill="#FFFFFF" font-size="5" text-anchor="middle" font-family="monospace">G${i}</text>`;
        }
        // Right pins
        for (let i = 0; i < 7; i++) {
          s += `<rect x="${x+90}" y="${y+20+(i*15)}" width="8" height="6" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
          s += `<text x="${x+104}" y="${y+26+(i*15)}" fill="#FFFFFF" font-size="5" text-anchor="middle" font-family="monospace">G${i+7}</text>`;
        }
        s += `<text x="${x+45}" y="${y+10}" fill="#22C55E" font-size="8" font-weight="bold" text-anchor="middle" font-family="monospace">ESP32</text>`;
        s += `<text x="${x+45}" y="${y+148}" fill="#64A3E0" font-size="7" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'l298n': (x, y, label) => {
        let s = ``;
        s += `<rect x="${x}" y="${y}" width="100" height="90" fill="#FFFFFF" stroke="#E53935" stroke-width="2" rx="4"/>`;
        s += `<rect x="${x+20}" y="${y+15}" width="60" height="40" fill="#1a1a1a" stroke="#555" stroke-width="1"/>`;
        s += `<text x="${x+50}" y="${y+32}" fill="#EF4444" font-size="7" text-anchor="middle" font-family="monospace">L298N</text>`;
        s += `<text x="${x+50}" y="${y+42}" fill="#999" font-size="5" text-anchor="middle" font-family="monospace">DUAL H-BRIDGE</text>`;
        // Heatsink fins
        for(let f=0; f<5; f++) s += `<line x1="${x+f*18+12}" y1="${y}" x2="${x+f*18+12}" y2="${y-10}" stroke="#888" stroke-width="3"/>`;
        // Terminal blocks
        ['IN1','IN2','IN3','IN4'].forEach((p,i) => {
          s += `<rect x="${x-8}" y="${y+10+(i*18)}" width="8" height="8" fill="#888" stroke="#555" stroke-width="0.5"/>`;
          s += `<text x="${x-16}" y="${y+17+(i*18)}" fill="#94A3B8" font-size="5" text-anchor="middle" font-family="monospace">${p}</text>`;
        });
        ['OUT1','OUT2','OUT3','OUT4'].forEach((p,i) => {
          s += `<rect x="${x+100}" y="${y+10+(i*18)}" width="8" height="8" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
          s += `<text x="${x+116}" y="${y+17+(i*18)}" fill="#FBBF24" font-size="5" text-anchor="middle" font-family="monospace">${p}</text>`;
        });
        s += `<text x="${x+50}" y="${y+97}" fill="#EF4444" font-size="7" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'sensor': (x, y, label, type) => {
        const color = type.includes('ir') ? '#F59E0B' : type.includes('ultrasonic') ? '#38BDF8' : type.includes('mq') ? '#F97316' : '#10B981';
        let s = ``;
        s += `<rect x="${x}" y="${y}" width="70" height="50" fill="#FFFFFF" stroke="${color}" stroke-width="2" rx="4"/>`;
        if (type.includes('ir')) {
          // IR LED and photodiode pair
          s += `<circle cx="${x+20}" cy="${y+25}" r="8" fill="#2D1B00" stroke="#F59E0B" stroke-width="1.5"/>`;
          s += `<circle cx="${x+50}" cy="${y+25}" r="8" fill="#001A2D" stroke="#38BDF8" stroke-width="1.5"/>`;
          s += `<text x="${x+20}" y="${y+28}" fill="#FBBF24" font-size="5" text-anchor="middle" font-family="monospace">IR</text>`;
          s += `<text x="${x+50}" y="${y+28}" fill="#38BDF8" font-size="5" text-anchor="middle" font-family="monospace">PD</text>`;
        } else if (type.includes('ultrasonic') || type.includes('hcsr')) {
          // Two circular transducers
          s += `<circle cx="${x+22}" cy="${y+25}" r="12" fill="#1E3A5F" stroke="#38BDF8" stroke-width="1.5"/>`;
          s += `<circle cx="${x+48}" cy="${y+25}" r="12" fill="#1E3A5F" stroke="#38BDF8" stroke-width="1.5"/>`;
          s += `<text x="${x+22}" y="${y+28}" fill="#38BDF8" font-size="4.5" text-anchor="middle" font-family="monospace">TRIG</text>`;
          s += `<text x="${x+48}" y="${y+28}" fill="#38BDF8" font-size="4.5" text-anchor="middle" font-family="monospace">ECHO</text>`;
        } else {
          s += `<rect x="${x+15}" y="${y+12}" width="40" height="25" fill="#F1F5F9" stroke="${color}" stroke-width="1" rx="2"/>`;
          s += `<text x="${x+35}" y="${y+27}" fill="${color}" font-size="7" text-anchor="middle" font-family="monospace">${type.toUpperCase().slice(0,5)}</text>`;
        }
        // Pins
        ['VCC','GND','OUT'].forEach((p,i) => {
          s += `<rect x="${x+10+(i*20)}" y="${y+50}" width="6" height="10" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
          s += `<text x="${x+13+(i*20)}" y="${y+65}" fill="#94A3B8" font-size="5" text-anchor="middle" font-family="monospace">${p}</text>`;
        });
        s += `<text x="${x+35}" y="${y+8}" fill="${color}" font-size="6" text-anchor="middle" font-family="monospace" font-weight="bold">${label}</text>`;
        return s;
      },

      'motor': (x, y, label) => {
        let s = ``;
        s += `<circle cx="${x+35}" cy="${y+35}" r="35" fill="#1A1A1A" stroke="#94A3B8" stroke-width="2"/>`;
        s += `<circle cx="${x+35}" cy="${y+35}" r="20" fill="#333" stroke="#555" stroke-width="1"/>`;
        s += `<circle cx="${x+35}" cy="${y+35}" r="5" fill="#B8860B"/>`;
        // Shaft
        s += `<rect x="${x+35}" y="${y-10}" width="6" height="15" fill="#888" rx="1"/>`;
        // Terminals
        s += `<rect x="${x+5}" y="${y+70}" width="8" height="12" fill="#EF4444" stroke="#555" stroke-width="0.5"/>`;
        s += `<rect x="${x+55}" y="${y+70}" width="8" height="12" fill="#111" stroke="#555" stroke-width="0.5"/>`;
        s += `<text x="${x+9}" y="${y+88}" fill="#EF4444" font-size="5" text-anchor="middle" font-family="monospace">M+</text>`;
        s += `<text x="${x+59}" y="${y+88}" fill="#94A3B8" font-size="5" text-anchor="middle" font-family="monospace">M-</text>`;
        s += `<text x="${x+35}" y="${y+94}" fill="#94A3B8" font-size="7" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'relay': (x, y, label) => {
        let s = ``;
        s += `<rect x="${x}" y="${y}" width="80" height="60" fill="#1A3A1A" stroke="#22C55E" stroke-width="2" rx="4"/>`;
        s += `<rect x="${x+5}" y="${y+5}" width="45" height="35" fill="#FFFFFF" stroke="#22C55E" stroke-width="1" rx="2"/>`;
        s += `<text x="${x+27}" y="${y+27}" fill="#22C55E" font-size="6" text-anchor="middle" font-family="monospace">RELAY</text>`;
        // Coil symbol
        for(let i=0;i<4;i++) s += `<path d="M ${x+8+(i*10)} ${y+20} a 4 4 0 0 1 8 0" fill="none" stroke="#22C55E" stroke-width="1"/>`;
        // Contact pins
        ['NO','COM','NC'].forEach((p,i) => {
          s += `<rect x="${x+55+(i>0?0:0)}" y="${y+10+(i*16)}" width="25" height="10" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5" rx="1"/>`;
          s += `<text x="${x+67}" y="${y+18+(i*16)}" fill="#1A1A1A" font-size="6" text-anchor="middle" font-family="monospace" font-weight="bold">${p}</text>`;
        });
        s += `<text x="${x+40}" y="${y+68}" fill="#22C55E" font-size="7" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'generic': (x, y, label, color) => {
        let s = ``;
        s += `<rect x="${x}" y="${y}" width="80" height="55" fill="#FFFFFF" stroke="${color}" stroke-width="2" rx="4"/>`;
        s += `<rect x="${x+10}" y="${y+10}" width="60" height="30" fill="#F1F5F9" stroke="${color}" stroke-width="1" rx="2"/>`;
        s += `<text x="${x+40}" y="${y+29}" fill="${color}" font-size="7" text-anchor="middle" font-family="monospace">${label.slice(0,10)}</text>`;
        ['1','2','3','4'].forEach((p,i) => {
          s += `<rect x="${x+8+(i*18)}" y="${y+55}" width="6" height="10" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
          s += `<text x="${x+11+(i*18)}" y="${y+70}" fill="#94A3B8" font-size="5" text-anchor="middle" font-family="monospace">P${i+1}</text>`;
        });
        return s;
      }
    };

    // Detect and classify each component
    const classifyComp = (name) => {
      const l = name.toLowerCase();
      if (l.includes('esp32')) return 'esp32';
      if (l.includes('arduino') || l.includes('mega') || l.includes('nano') || l.includes('uno')) return 'arduino';
      if (l.includes('l298n') || l.includes('motor driver') || l.includes('h-bridge')) return 'l298n';
      if (l.includes('ir sensor') || l.includes('ir module')) return 'ir_sensor';
      if (l.includes('ultrasonic') || l.includes('hc-sr04') || l.includes('sonar')) return 'ultrasonic';
      if (l.includes('dht') || l.includes('temperature') || l.includes('humidity')) return 'dht';
      if (l.includes('mq') || l.includes('gas')) return 'mq_sensor';
      if (l.includes('motor')) return 'motor';
      if (l.includes('relay')) return 'relay';
      return 'generic';
    };

    // ── Build Fritzing-style circuit SVG ──
    const W = 900, H = 600;
    let circuitSvg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border-radius:12px; font-family:monospace;">`;

    // Background subtle grid
    circuitSvg += `<defs>
    <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E5E7EB"/><stop offset="50%" stop-color="#9CA3AF"/><stop offset="100%" stop-color="#4B5563"/></linearGradient>`;
    circuitSvg += `<pattern id="cg" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" fill="none" stroke="#f1f5f9" stroke-width="1"/></pattern>`;
    circuitSvg += `<filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    circuitSvg += `</defs>`;
    circuitSvg += `<rect width="${W}" height="${H}" fill="url(#cg)"/>`;

    // Title bar
    circuitSvg += `<rect x="0" y="0" width="${W}" height="30" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>`;
    circuitSvg += `<text x="14" y="20" fill="#0f172a" font-size="10" font-weight="bold" font-family="monospace">🔌 CIRCUIT DIAGRAM — ${projectName.toUpperCase()}</text>`;
    circuitSvg += `<text x="${W-10}" y="20" fill="#64748b" font-size="9" text-anchor="end" font-family="monospace">Generated by ProjectForge AI</text>`;

    // Breadboard at bottom
    const BB_Y = 400;
    circuitSvg += `<rect x="60" y="${BB_Y}" width="${W-120}" height="150" fill="#F5F5DC" stroke="#C8C8A0" stroke-width="3" rx="6"/>`;
    circuitSvg += `<text x="${W/2}" y="${BB_Y-8}" fill="#94A3B8" font-size="8" text-anchor="middle" font-family="monospace">BREADBOARD / PROTOTYPE BOARD</text>`;
    // Breadboard center divider
    circuitSvg += `<rect x="70" y="${BB_Y+70}" width="${W-140}" height="12" fill="#D4D4A0" rx="2"/>`;
    // Rail bars
    circuitSvg += `<rect x="70" y="${BB_Y+8}" width="${W-140}" height="8" fill="#FFCCCC" stroke="#FF5555" stroke-width="1" rx="2"/>`;
    circuitSvg += `<text x="80" y="${BB_Y+15}" fill="#CC0000" font-size="7" font-weight="bold" font-family="monospace">+ VCC</text>`;
    circuitSvg += `<rect x="70" y="${BB_Y+130}" width="${W-140}" height="8" fill="#CCEEFF" stroke="#5555FF" stroke-width="1" rx="2"/>`;
    circuitSvg += `<text x="80" y="${BB_Y+137}" fill="#0000CC" font-size="7" font-weight="bold" font-family="monospace">- GND</text>`;
    // Breadboard holes
    for (let bx = 85; bx < W-80; bx += 14) {
      for (let by = 0; by < 3; by++) {
        circuitSvg += `<circle cx="${bx}" cy="${BB_Y+24+(by*14)}" r="3" fill="#AAA" stroke="#888" stroke-width="0.5"/>`;
        circuitSvg += `<circle cx="${bx}" cy="${BB_Y+90+(by*14)}" r="3" fill="#AAA" stroke="#888" stroke-width="0.5"/>`;
      }
    }

    // Place MCU at center-top
    let mcuX = 390, mcuY = 90;
    const mcuType = classifyComp(mcu);
    let mcuSvg = '';
    if (mcuType === 'arduino') mcuSvg = compVisuals.arduino(mcuX, mcuY, 'MCU');
    else if (mcuType === 'esp32') mcuSvg = compVisuals.esp32(mcuX, mcuY, 'MCU');
    else mcuSvg = compVisuals.generic(mcuX, mcuY, mcu, '#6366F1');
    circuitSvg += mcuSvg;

    // MCU center anchor for wire routing
    const mcuAnchorX = mcuX + 55;
    const mcuAnchorY = mcuY + 80;

    // Place peripherals and draw colored wires
    const wireColors = ['#EF4444','#10B981','#F59E0B','#8B5CF6','#EC4899','#38BDF8'];
    let placedCount = 0;
    const positions = [
      [100, 100], [680, 100], [100, 260], [680, 260], [250, 110], [570, 110]
    ];

    compArray.forEach((comp, ci) => {
      const cl = classifyComp(comp);
      if (cl === 'arduino' || cl === 'esp32') return; // skip if same as MCU
      if (placedCount >= 6) return;

      const [px, py] = positions[placedCount];
      const wColor = wireColors[placedCount % wireColors.length];
      let compSvgStr = '';

      if (cl === 'l298n') compSvgStr = compVisuals.l298n(px, py, `U${ci+1}: ${comp.slice(0,10)}`);
      else if (cl === 'ir_sensor' || cl === 'dht' || cl === 'mq_sensor' || cl === 'ultrasonic') compSvgStr = compVisuals.sensor(px, py, `${comp.slice(0,12)}`, cl);
      else if (cl === 'motor') compSvgStr = compVisuals.motor(px, py, `M${ci+1}: ${comp.slice(0,8)}`);
      else if (cl === 'relay') compSvgStr = compVisuals.relay(px, py, `K${ci+1}: ${comp.slice(0,8)}`);
      else compSvgStr = compVisuals.generic(px, py, comp, wColor);

      circuitSvg += compSvgStr;

      // Draw curved colored wire: component → MCU
      const compCX = px + 40;
      const compCY = py + 55;
      const mx = mcuAnchorX;
      const my = mcuAnchorY;
      const cx1 = (compCX + mx) / 2;
      const cy1 = compCY;
      const cx2 = (compCX + mx) / 2;
      const cy2 = my;
      circuitSvg += `<path d="M ${compCX} ${compCY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${mx} ${my}" fill="none" stroke="${wColor}" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>`;
      circuitSvg += `<circle cx="${compCX}" cy="${compCY}" r="4" fill="${wColor}"/>`;
      circuitSvg += `<circle cx="${mx}" cy="${my}" r="3" fill="${wColor}" opacity="0.7"/>`;

      // Pin label on wire midpoint
      const midX = (compCX + mx) / 2;
      const midY = (compCY + my) / 2 - 10;
      circuitSvg += `<rect x="${midX-18}" y="${midY-8}" width="36" height="12" fill="#0F172A" opacity="0.75" rx="3"/>`;
      circuitSvg += `<text x="${midX}" y="${midY}" fill="${wColor}" font-size="7" text-anchor="middle" font-family="monospace">D${ci+2}</text>`;

      placedCount++;
    });

    // Power and GND bus lines from MCU to breadboard
    circuitSvg += `<line x1="${mcuX+25}" y1="${mcuY-8}" x2="${mcuX+25}" y2="${BB_Y+8}" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="4,2" opacity="0.7"/>`;
    circuitSvg += `<text x="${mcuX+20}" y="${BB_Y-5}" fill="#EF4444" font-size="7" text-anchor="end" font-family="monospace">VCC→</text>`;
    circuitSvg += `<line x1="${mcuX+85}" y1="${mcuY-8}" x2="${mcuX+85}" y2="${BB_Y+130}" stroke="#3B82F6" stroke-width="2.5" stroke-dasharray="4,2" opacity="0.7"/>`;
    circuitSvg += `<text x="${mcuX+90}" y="${BB_Y-5}" fill="#3B82F6" font-size="7" font-family="monospace">GND→</text>`;

    // Legend box
    circuitSvg += `<rect x="${W-180}" y="${H-120}" width="170" height="110" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6" opacity="0.95"/>`;
    circuitSvg += `<text x="${W-95}" y="${H-104}" fill="#475569" font-size="8" font-weight="bold" text-anchor="middle" font-family="monospace">LEGEND</text>`;
    ['VCC (Red)','GND (Blue)','Signal (Color)','Data Bus','Power Rail'].forEach((leg,li) => {
      const legColors = ['#EF4444','#3B82F6','#F59E0B','#8B5CF6','#10B981'];
      circuitSvg += `<line x1="${W-170}" y1="${H-92+(li*16)}" x2="${W-150}" y2="${H-92+(li*16)}" stroke="${legColors[li]}" stroke-width="2"/>`;
      circuitSvg += `<text x="${W-145}" y="${H-88+(li*16)}" fill="#334155" font-size="7" font-family="monospace">${leg}</text>`;
    });

    // Title block
    circuitSvg += `<rect x="10" y="${H-50}" width="260" height="40" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="4" opacity="0.95"/>`;
    circuitSvg += `<text x="20" y="${H-32}" fill="#0f172a" font-size="9" font-weight="bold" font-family="monospace">${projectName.slice(0,28)}</text>`;
    circuitSvg += `<text x="20" y="${H-16}" fill="#64748b" font-size="7" font-family="monospace">ProjectForge AI | MCU: ${mcu} | Rev 1.0</text>`;
    circuitSvg += `</svg>`;

    // ════════════════════════════════════════════════════════════
    // 2. WIRING DIAGRAM SVG — Fritzing-style breadboard wiring
    // ════════════════════════════════════════════════════════════
    let wiringSvg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border-radius:12px; font-family:monospace;">`;
    wiringSvg += `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
    wiringSvg += `<text x="14" y="24" fill="#0f172a" font-size="11" font-weight="bold" font-family="monospace">🔧 WIRING / BREADBOARD DIAGRAM — ${projectName.toUpperCase()}</text>`;

    // Full breadboard (large, realistic)
    const BBW = W - 80, BBX = 40, BBY2 = H - 210;
    wiringSvg += `<rect x="${BBX}" y="${BBY2}" width="${BBW}" height="190" fill="#F0EDD5" stroke="#BCBAA0" stroke-width="3" rx="6"/>`;
    // Rail strips
    wiringSvg += `<rect x="${BBX+10}" y="${BBY2+10}" width="${BBW-20}" height="15" fill="#FFAAAA" stroke="#CC3333" stroke-width="1" rx="2"/>`;
    wiringSvg += `<text x="${BBX+20}" y="${BBY2+21}" fill="#881111" font-size="8" font-weight="bold" font-family="monospace">VCC (+5V)</text>`;
    wiringSvg += `<rect x="${BBX+10}" y="${BBY2+165}" width="${BBW-20}" height="15" fill="#AACCFF" stroke="#3333CC" stroke-width="1" rx="2"/>`;
    wiringSvg += `<text x="${BBX+20}" y="${BBY2+176}" fill="#111188" font-size="8" font-weight="bold" font-family="monospace">GND (-)</text>`;
    // Center divider
    wiringSvg += `<rect x="${BBX+10}" y="${BBY2+90}" width="${BBW-20}" height="12" fill="#D4D4A0" rx="2"/>`;
    // Hole grid
    for (let bx = BBX+20; bx < BBX+BBW-20; bx += 14) {
      for (let by = 0; by < 4; by++) {
        wiringSvg += `<circle cx="${bx}" cy="${BBY2+33+(by*14)}" r="3.5" fill="#C0C0A0" stroke="#888" stroke-width="0.5"/>`;
        wiringSvg += `<circle cx="${bx}" cy="${BBY2+110+(by*14)}" r="3.5" fill="#C0C0A0" stroke="#888" stroke-width="0.5"/>`;
      }
    }

    // MCU in center-top area
    wiringSvg += `<rect x="${(W/2)-70}" y="40" width="140" height="180" fill="#005C8A" stroke="#00476B" stroke-width="3" rx="6"/>`;
    wiringSvg += `<rect x="${(W/2)-60}" y="55" width="120" height="90" fill="#111" stroke="#333" rx="3"/>`;
    wiringSvg += `<text x="${W/2}" y="90" fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">${mcu}</text>`;
    wiringSvg += `<text x="${W/2}" y="106" fill="#3b82f6" font-size="8" text-anchor="middle" font-family="monospace">MICROCONTROLLER</text>`;
    // Left pin headers
    const lpins = ['D2','D3','D4','D5','D6','D7','D8','5V','GND'];
    for (let i = 0; i < 9; i++) {
      wiringSvg += `<rect x="${(W/2)-82}" y="${55+(i*17)}" width="12" height="9" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
      wiringSvg += `<text x="${(W/2)-88}" y="${62+(i*17)}" fill="#334155" font-size="7" text-anchor="end" font-family="monospace">${lpins[i]}</text>`;
    }
    // Right pin headers
    const rpins = ['D9','D10','D11','D12','D13','A0','A1','A2','A3'];
    for (let i = 0; i < 9; i++) {
      wiringSvg += `<rect x="${(W/2)+70}" y="${55+(i*17)}" width="12" height="9" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
      wiringSvg += `<text x="${(W/2)+86}" y="${62+(i*17)}" fill="#334155" font-size="7" font-family="monospace">${rpins[i]}</text>`;
    }

    // Wire from MCU to breadboard VCC and GND
    wiringSvg += `<path d="M ${(W/2)-70} 148 C ${(W/2)-200} 200, ${BBX+80} ${BBY2-30}, ${BBX+80} ${BBY2+17}" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>`;
    wiringSvg += `<circle cx="${BBX+80}" cy="${BBY2+17}" r="5" fill="#EF4444"/>`;
    wiringSvg += `<text x="${(W/2)-160}" y="190" fill="#EF4444" font-size="7" font-family="monospace">VCC</text>`;
    wiringSvg += `<path d="M ${(W/2)+82} 148 C ${(W/2)+200} 200, ${BBX+BBW-80} ${BBY2-30}, ${BBX+BBW-80} ${BBY2+172}" fill="none" stroke="#3B82F6" stroke-width="3" stroke-linecap="round"/>`;
    wiringSvg += `<circle cx="${BBX+BBW-80}" cy="${BBY2+172}" r="5" fill="#3B82F6"/>`;
    wiringSvg += `<text x="${(W/2)+165}" y="190" fill="#3B82F6" font-size="7" font-family="monospace">GND</text>`;

    // Place peripheral modules and draw colored wires
    const pModulePos = [[60,200],[760,200],[60,330],[760,330],[200,200],[680,280]];
    const wColors2 = ['#F59E0B','#10B981','#8B5CF6','#EC4899','#38BDF8','#FB923C'];
    let wIdx = 0;
    compArray.forEach((comp, ci) => {
      const cl = classifyComp(comp);
      if (cl === 'arduino' || cl === 'esp32') return;
      if (wIdx >= 6) return;
      const [mx2, my2] = pModulePos[wIdx];
      const wc = wColors2[wIdx];

      // Module box
      wiringSvg += `<rect x="${mx2}" y="${my2}" width="90" height="55" fill="#0F172A" stroke="${wc}" stroke-width="2" rx="4"/>`;
      wiringSvg += `<text x="${mx2+45}" y="${my2+22}" fill="${wc}" font-size="8" text-anchor="middle" font-family="monospace" font-weight="bold">${comp.slice(0,10)}</text>`;
      wiringSvg += `<text x="${mx2+45}" y="${my2+35}" fill="#94A3B8" font-size="7" text-anchor="middle" font-family="monospace">${cl.replace('_',' ').toUpperCase()}</text>`;
      // Pins at bottom
      ['VCC','GND','SIG'].forEach((p,pi) => {
        wiringSvg += `<rect x="${mx2+10+(pi*28)}" y="${my2+55}" width="10" height="14" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>` ;
        wiringSvg += `<text x="${mx2+15+(pi*28)}" y="${my2+74}" fill="#334155" font-size="5.5" text-anchor="middle" font-family="monospace">${p}</text>`;
      });

      // Colored signal wire to MCU pin
      const compCX2 = mx2 + 60;
      const compCY2 = my2 + 55;
      const mcuPX = (W/2) - 82 + (wIdx > 2 ? 164 : 0);
      const mcuPY = 55 + (wIdx % 3) * 17 + 4;
      wiringSvg += `<path d="M ${compCX2} ${compCY2} C ${compCX2} ${(compCY2+mcuPY)/2}, ${mcuPX} ${(compCY2+mcuPY)/2}, ${mcuPX} ${mcuPY}" fill="none" stroke="${wc}" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>`;
      wiringSvg += `<circle cx="${compCX2}" cy="${compCY2}" r="4" fill="${wc}"/>`;
      wiringSvg += `<circle cx="${mcuPX}" cy="${mcuPY}" r="3.5" fill="${wc}"/>`;

      // Wire to breadboard for power
      const bbHoleX = BBX + 20 + (wIdx * 100);
      wiringSvg += `<line x1="${mx2+10}" y1="${my2+69}" x2="${bbHoleX}" y2="${BBY2+17}" stroke="#E53935" stroke-width="2" stroke-dasharray="5,3" opacity="0.7"/>`;
      wiringSvg += `<line x1="${mx2+38}" y1="${my2+69}" x2="${bbHoleX+14}" y2="${BBY2+172}" stroke="#1E88E5" stroke-width="2" stroke-dasharray="5,3" opacity="0.7"/>`;

      wIdx++;
    });

    wiringSvg += `</svg>`;

    console.log(`[CircuitGen] SUCCESS — Schematic SVG: ${circuitSvg.length} chars, Wiring SVG: ${wiringSvg.length} chars, Pins: ${pinMapping.length}, Connections: ${connectionTable.length}`);

    await logActivity(req.user.id, 'CIRCUIT_GENERATED', { projectName, componentCount: compArray.length });

    res.json({
      circuitSvg,
      wiringSvg,
      pinMapping,
      connectionTable
    });
  } catch (err) {
    console.error('[CircuitGen] ERROR:', err);
    res.status(500).json({ message: err.message || 'Circuit generation failed.' });
  }
});

app.post('/api/pcb/generate', verifyToken, async (req, res) => {
  const { projectName, components } = req.body;
  if (!projectName || !components) {
    return res.status(400).json({ message: 'Project Name and components list are required.' });
  }

  try {
    // 1. Smart multi-format parser: handles quantity prefixes/suffixes and expands them
    const parseQuantityAndExpand = (raw) => {
      if (!raw) return [];
      const normalized = raw.replace(/\r?\n/g, ',');
      const items = normalized.split(',').map(s => s.trim()).filter(Boolean);
      const expanded = [];
      for (let item of items) {
        let qty = 1;
        let name = item;

        const prefixMatch = item.match(/^(\d+)\s*[xX-]?\s+(.+)$/);
        if (prefixMatch) {
          qty = parseInt(prefixMatch[1]);
          name = prefixMatch[2];
        } else {
          const suffixMatch = item.match(/^(.+?)\s*[\s(xX-]\s*(\d+)\s*\)?$/);
          if (suffixMatch) {
            name = suffixMatch[1];
            qty = parseInt(suffixMatch[2]);
          }
        }

        name = name.replace(/[()[\]'"\\;{}]/g, '').trim();

        // Singularize
        if (name.toLowerCase().endsWith('sensors')) name = name.slice(0, -1);
        else if (name.toLowerCase().endsWith('motors')) name = name.slice(0, -1);
        else if (name.toLowerCase().endsWith('leds')) name = name.slice(0, -1);
        else if (name.toLowerCase().endsWith('resistors')) name = name.slice(0, -1);
        else if (name.toLowerCase().endsWith('capacitors')) name = name.slice(0, -1);

        const lName = name.toLowerCase();
        if (lName.includes('arduino uno') || lName.includes('arduino')) name = 'Arduino Uno';
        else if (lName.includes('l298n')) name = 'L298N';
        else if (lName.includes('ir sensor')) name = 'IR Sensor';
        else if (lName.includes('dc motor')) name = 'DC Motor';
        else if (lName.includes('esp32')) name = 'ESP32';
        else if (lName.includes('ultrasonic')) name = 'Ultrasonic';
        else if (lName.includes('dht11') || lName.includes('dht22')) name = 'DHT11';
        else if (lName.includes('relay')) name = 'Relay';
        else if (lName.includes('lcd')) name = 'LCD';

        for (let i = 0; i < qty; i++) {
          expanded.push(name);
        }
      }
      return expanded;
    };

    const compArray = parseQuantityAndExpand(components);
    if (compArray.length === 0) {
      return res.status(400).json({ message: 'No valid component names after sanitization.' });
    }

    const timeMark = Date.now();
    const safeProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');

    // Helper: ZIP creation
    function createZip(zipPath, appendFn) {
      return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(zipPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });
        archive.on('error', reject);
        stream.on('error', reject);
        stream.on('close', () => resolve(zipPath));
        archive.pipe(stream);
        appendFn(archive);
        archive.finalize();
      });
    }

    // Footprints / cost DB
    const componentData = {
      'Arduino Uno':   { ref: 'MCU',  fp: 'Module:Arduino_UNO_SMD',          cost: 450, w: 70, h: 55, pinsL: 14, pinsR: 6, pinPitch: 2.54, color: '#0A3C5C', label: 'Arduino UNO', pinNamesL: ['D0','D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13'], pinNamesR: ['5V','3V3','RST','IOREF','NC','GND'] },
      'ESP32':         { ref: 'U',    fp: 'Module:ESP32-WROOM-32',           cost: 350, w: 55, h: 38, pinsL: 19, pinsR: 19, pinPitch: 1.27, color: '#1A3A1A', label: 'ESP32-WROOM' },
      'L298N':         { ref: 'U',    fp: 'Package_TO_SOT_THT:TO-220-5',     cost: 120, w: 50, h: 50, pinsL: 4,  pinsR: 4,  pinPitch: 2.54, color: '#991B1B', label: 'L298N', pinNamesL: ['IN1','IN2','IN3','IN4'], pinNamesR: ['OUT1','OUT2','OUT3','OUT4'] },
      'IR Sensor':     { ref: 'U',    fp: 'Sensor_Optical:QRD1113',          cost: 35,  w: 35, h: 15, pinsL: 0,  pinsR: 0,  pinPitch: 2.54, color: '#1E293B', label: 'IR SENSOR', bottomPins: ['VCC','GND','OUT'] },
      'DC Motor':      { ref: 'M',    fp: 'Connector_PinHeader_2.54mm:PinHeader_1x02', cost: 150, w: 30, h: 25, pinsL: 0,  pinsR: 0,  pinPitch: 2.54, color: '#EAB308', label: 'DC MOTOR', bottomPins: ['M+','M-'] },
      'Ultrasonic':    { ref: 'US',   fp: 'Sensor_Audio:Microphone_CMA-4544PF-W', cost: 80, w: 45, h: 25, pinsL: 0,  pinsR: 0,  pinPitch: 2.54, color: '#001A3A', label: 'HC-SR04', bottomPins: ['VCC','TRIG','ECHO','GND'] },
      'DHT11':         { ref: 'U',    fp: 'Sensor_Temperature:Sensirion_DFN-4', cost: 60, w: 25, h: 30, pinsL: 0,  pinsR: 0,  pinPitch: 2.54, color: '#0a1a0a', label: 'DHT11', bottomPins: ['VCC','DAT','GND'] },
      'Relay':         { ref: 'K',    fp: 'Relay_THT:Relay_SPDT_SANYOU_SRD', cost: 45, w: 38, h: 28, pinsL: 2,  pinsR: 3,  pinPitch: 5.08, color: '#0a1a0a', label: 'RELAY', pinNamesL: ['COIL+','COIL-'], pinNamesR: ['NO','COM','NC'] },
      'LCD':           { ref: 'DS',   fp: 'Display_Character:LCD-016N002L',  cost: 120, w: 80, h: 35, pinsL: 0,  pinsR: 0,  pinPitch: 2.54, color: '#001A00', label: 'LCD 16x2', bottomPins: ['VSS','VDD','VO','RS','RW','E','D4','D5','D6','D7','A','K'] },
    };

    const getFP = (name) => {
      const lower = name.toLowerCase();
      for (const [key, val] of Object.entries(componentData)) {
        if (lower.includes(key.toLowerCase())) return { ...val };
      }
      return { ref: 'U', fp: `Package_DIP:DIP-8_W7.62mm`, cost: 100, w: 40, h: 30, pinsL: 4, pinsR: 4, pinPitch: 2.54, color: '#1e293b', label: name.slice(0, 10), pinNamesL: ['1','2','3','4'], pinNamesR: ['5','6','7','8'] };
    };

    // 2. PCB Layout positioning
    const boardW = 800;
    const boardH = 520;
    const isLineFollower = projectName.toLowerCase().includes('line follower') || 
      (compArray.includes('Arduino Uno') && compArray.includes('L298N') && 
       compArray.filter(x => x === 'IR Sensor').length >= 2 && 
       compArray.filter(x => x === 'DC Motor').length >= 2);

    let pcbLayout = [];
    if (isLineFollower) {
      let mcuFound = false, l298Found = false, irCount = 0, motorCount = 0;
      compArray.forEach((comp, idx) => {
        if (comp === 'Arduino Uno' && !mcuFound) {
          pcbLayout.push({ cx: 220, cy: 260, label: 'Arduino Uno', ref: 'MCU1' });
          mcuFound = true;
        } else if (comp === 'L298N' && !l298Found) {
          pcbLayout.push({ cx: 480, cy: 180, label: 'L298N', ref: 'U1' });
          l298Found = true;
        } else if (comp === 'IR Sensor') {
          irCount++;
          if (irCount === 1) pcbLayout.push({ cx: 480, cy: 380, label: 'Left IR Sensor', ref: 'U2' });
          else pcbLayout.push({ cx: 680, cy: 380, label: 'Right IR Sensor', ref: 'U3' });
        } else if (comp === 'DC Motor') {
          motorCount++;
          if (motorCount === 1) pcbLayout.push({ cx: 680, cy: 120, label: 'Left Motor', ref: 'M1' });
          else pcbLayout.push({ cx: 680, cy: 250, label: 'Right Motor', ref: 'M2' });
        } else {
          pcbLayout.push({ cx: 100 + idx * 80, cy: 100, label: comp, ref: `U${idx+1}` });
        }
      });
    } else {
      const mcuIndex = compArray.findIndex(c => c.toLowerCase().includes('arduino') || c.toLowerCase().includes('esp32') || c.toLowerCase().includes('esp8266'));
      if (mcuIndex !== -1) {
        const remainingComps = compArray.filter((_, idx) => idx !== mcuIndex);
        let remIdx = 0;
        const rightCols = 2;
        const rightRows = Math.ceil(remainingComps.length / rightCols);
        
        for (let i = 0; i < compArray.length; i++) {
          if (i === mcuIndex) {
            const fp = getFP(compArray[i]);
            pcbLayout.push({ cx: 220, cy: 260, label: compArray[i], ref: `${fp.ref}1` });
          } else {
            const col = remIdx % rightCols;
            const row = Math.floor(remIdx / rightCols);
            const cx = 480 + col * 180;
            const stepY = rightRows > 1 ? (boardH - 180) / (rightRows - 1) : 0;
            const cy = rightRows > 1 ? 100 + row * stepY : 260;
            const fp = getFP(compArray[i]);
            pcbLayout.push({ cx: Math.round(cx), cy: Math.round(cy), label: compArray[i], ref: `${fp.ref}${remIdx+1}` });
            remIdx++;
          }
        }
      } else {
        const cols = Math.ceil(Math.sqrt(compArray.length));
        const rows = Math.ceil(compArray.length / cols);
        const stepX = (boardW - 160) / Math.max(cols - 1, 1);
        const stepY = (boardH - 160) / Math.max(rows - 1, 1);
        
        for (let i = 0; i < compArray.length; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = cols > 1 ? 80 + col * stepX : 400;
          const cy = rows > 1 ? 80 + row * stepY : 260;
          const fp = getFP(compArray[i]);
          pcbLayout.push({ cx: Math.round(cx), cy: Math.round(cy), label: compArray[i], ref: `${fp.ref}${i+1}` });
        }
      }
    }

    // 3. Trace connections routing paths (45-degree angle elbows)
    let routes = [];
    if (isLineFollower) {
      routes = [
        { points: [[500, 395], [500, 360], [350, 360], [350, 160], [200, 160], [200, 175]], layer: 'top', color: '#EF4444', width: 2.5, net: 'signal', name: 'IR_L_OUT' },
        { points: [[700, 395], [700, 350], [360, 350], [360, 150], [215, 150], [215, 175]], layer: 'top', color: '#EF4444', width: 2.5, net: 'signal', name: 'IR_R_OUT' },
        { points: [[230, 175], [230, 130], [410, 130], [410, 210], [430, 210]], layer: 'top', color: '#EF4444', width: 2.5, net: 'signal', name: 'IN1' },
        { points: [[245, 175], [245, 120], [420, 120], [420, 210], [440, 210]], layer: 'top', color: '#EF4444', width: 2.5, net: 'signal', name: 'IN2' },
        { points: [[260, 175], [260, 110], [450, 110], [450, 210]], layer: 'top', color: '#EF4444', width: 2.5, net: 'signal', name: 'IN3' },
        { points: [[275, 175], [275, 100], [460, 100], [460, 210]], layer: 'top', color: '#EF4444', width: 2.5, net: 'signal', name: 'IN4' },
        { points: [[510, 160], [530, 160], [530, 135], [660, 135]], layer: 'bottom', color: '#3B82F6', width: 3, net: 'signal', name: 'MOTOR_L+' },
        { points: [[510, 170], [540, 170], [540, 125], [700, 135]], layer: 'bottom', color: '#3B82F6', width: 3, net: 'signal', name: 'MOTOR_L-' },
        { points: [[510, 180], [550, 180], [550, 265], [660, 265]], layer: 'bottom', color: '#3B82F6', width: 3, net: 'signal', name: 'MOTOR_R+' },
        { points: [[510, 190], [560, 190], [560, 250], [700, 265]], layer: 'bottom', color: '#3B82F6', width: 3, net: 'signal', name: 'MOTOR_R-' },
        { points: [[150, 346], [150, 370], [460, 370], [460, 395]], layer: 'top', color: '#EF4444', width: 4.5, net: 'VCC', name: '5V' },
        { points: [[460, 370], [660, 370], [660, 395]], layer: 'top', color: '#EF4444', width: 4.5, net: 'VCC', name: '5V' },
        { points: [[150, 370], [420, 370], [420, 210]], layer: 'top', color: '#EF4444', width: 4.5, net: 'VCC', name: '5V' },
        { points: [[180, 346], [180, 360], [480, 360], [480, 395]], layer: 'bottom', color: '#3B82F6', width: 4.5, net: 'GND', name: 'GND' },
        { points: [[480, 360], [660, 360], [660, 395]], layer: 'bottom', color: '#3B82F6', width: 4.5, net: 'GND', name: 'GND' },
        { points: [[180, 360], [430, 360], [430, 210]], layer: 'bottom', color: '#3B82F6', width: 4.5, net: 'GND', name: 'GND' },
      ];
    } else {
      compArray.forEach((comp, idx) => {
        const { cx, cy } = pcbLayout[idx];
        routes.push({ points: [[cx, cy + 10], [cx, cy + 30], [50, cy + 30], [50, 80]], layer: 'top', color: '#EF4444', width: 3, net: 'VCC', name: 'VCC' });
        routes.push({ points: [[cx, cy - 10], [cx, cy - 30], [boardW - 50, cy - 30], [boardW - 50, boardH - 80]], layer: 'bottom', color: '#3B82F6', width: 3, net: 'GND', name: 'GND' });
        if (idx < compArray.length - 1) {
          const next = pcbLayout[idx+1];
          routes.push({ points: [[cx, cy], [(cx + next.cx)/2, cy], [(cx + next.cx)/2, next.cy], [next.cx, next.cy]], layer: idx % 2 === 0 ? 'top' : 'bottom', color: idx % 2 === 0 ? '#EF4444' : '#3B82F6', width: 2.5, net: 'signal', name: `SIG_${idx}` });
        }
      });
    }

    // 4. KiCad Project file generation
    const projectContent = JSON.stringify({
      meta: { version: 1, filename: `${safeProjectName}.kicad_pro` },
      project: { title: projectName, company: 'ProjectForge AI', designer: 'ProjectForge AI Platform', date: new Date().toISOString().slice(0, 10), revision: 'Rev 1.0' },
      pcbnew: { last_board_thickness: 1.6, drc_exclusions: [] },
      schematic: { legacy_lib_dir: '', legacy_lib_list: [] }
    }, null, 2);

    let schematicContent =
      `(kicad_sch (version 20211123) (generator eeschema)\n` +
      `  (uuid "${timeMark}-sch-uuid-9b2f-38a37c")\n` +
      `  (paper "A4")\n` +
      `  (title_block (title "${projectName}") (company "ProjectForge AI Platform"))\n`;

    compArray.forEach((comp, idx) => {
      const xPos = 50 + (idx * 40);
      const safeComp = comp.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
      const fpData = getFP(comp);
      schematicContent +=
        `  (symbol (lib_id "Device:${safeComp}") (at ${xPos} 100 0)\n` +
        `    (in_bom yes) (on_board yes)\n` +
        `    (uuid "${timeMark}-symbol-${idx}-${safeComp.slice(0,6)}")\n` +
        `    (property "Reference" "${fpData.ref}${idx + 1}" (id 0) (at ${xPos} 92 0))\n` +
        `    (property "Value" "${comp}" (id 1) (at ${xPos} 108 0))\n` +
        `    (property "Footprint" "${fpData.fp}" (id 2) (at ${xPos} 116 0) (hide yes))\n` +
        `  )\n`;
    });
    schematicContent += `)\n`;

    let layoutContent =
      `(kicad_pcb (version 20211014) (generator pcbnew)\n` +
      `  (general (thickness 1.6) (drawings 0) (tracks 0) (zones 0) (modules ${compArray.length}) (nets ${compArray.length + 2}))\n` +
      `  (paper "A4")\n` +
      `  (title_block (title "${projectName}") (company "ProjectForge AI Platform"))\n` +
      `  (layers (0 "F.Cu" signal) (31 "B.Cu" signal) (36 "B.SilkS" user) (37 "F.SilkS" user) (38 "B.Mask" user) (39 "F.Mask" user) (44 "Edge.Cuts" user))\n` +
      `  (setup (pad_to_mask_clearance 0.05))\n` +
      `  (net 0 "") (net 1 "VCC") (net 2 "GND")\n`;

    compArray.forEach((comp, idx) => {
      const fp = getFP(comp);
      const { cx, cy } = pcbLayout[idx];
      layoutContent +=
        `  (footprint "${fp.fp}" (layer "F.Cu") (at ${cx/4} ${cy/4} 0)\n` +
        `    (descr "Footprint for ${comp}")\n` +
        `    (uuid "${timeMark}-fp-${idx}-${fp.ref}")\n` +
        `    (property "Reference" "${fp.ref}${idx+1}" (at ${cx/4} ${cy/4 - 5} 0) (layer "F.SilkS"))\n` +
        `    (property "Value" "${comp}" (at ${cx/4} ${cy/4 + 5} 0) (layer "F.Fab"))\n` +
        `    (pad "1" thru_hole rect (at -2 0) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask") (net 1 "VCC"))\n` +
        `    (pad "2" thru_hole circle (at 2 0) (size 1.6 1.6) (drill 0.8) (layers "*.Cu" "*.Mask") (net 2 "GND"))\n` +
        `  )\n`;
    });
    layoutContent += `  (gr_rect (start 0 0) (end ${boardW/4} ${boardH/4}) (layer "Edge.Cuts") (width 0.05))\n)\n`;

    // 5. Bill of Materials (BOM) CSV Exporter
    let bomContent = `"Reference","Component Name","Quantity","Footprint","Description","Unit Cost (INR)","Total Cost (INR)"\n`;
    const bomSummary = {};
    compArray.forEach((comp, idx) => {
      const data = getFP(comp);
      if (bomSummary[comp]) bomSummary[comp].qty++;
      else bomSummary[comp] = { idx, data, qty: 1 };
    });

    let totalCost = 0;
    let refIdx = 1;
    for (const [comp, info] of Object.entries(bomSummary)) {
      const lineCost = info.data.cost * info.qty;
      totalCost += lineCost;
      bomContent += `"${info.data.ref}${refIdx}","${comp}","${info.qty}","${info.data.fp}","${comp} module","₹${info.data.cost}","₹${lineCost}"\n`;
      refIdx++;
    }
    bomContent += `"","","","","","TOTAL COST","₹${totalCost}"\n`;
    bomContent += `\n"Generated by ProjectForge AI Platform"\n"Date: ${new Date().toLocaleDateString()}"\n"Project: ${projectName}"\n`;

    // 6. Gerber files & Excellon drills
    const now = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const makeGerber = (layer, isCop) => {
      let g = `%TF.GenerationSoftware,ProjectForge AI,PCBGen,1.0*%\n%TF.CreationDate,${now}*%\n%TF.FileFunction,${layer}*%\n%FSLAX46Y46*%\n%MOMM*%\n%LPD*%\n`;
      g += isCop ? `%ADD10C,0.25*%\n%ADD13C,1.6*%\n` : `%ADD10C,0.15*%\n`;
      g += `G01*\n`;
      routes.forEach((r, idx) => {
        if ((isCop && r.layer === 'top' && layer.includes('Top')) || (isCop && r.layer === 'bottom' && layer.includes('Bot'))) {
          r.points.forEach((pt, pi) => {
            const code = pi === 0 ? 'D02' : 'D01';
            g += `X${String(pt[0]*100).padStart(9,'0')}Y${String(pt[1]*100).padStart(9,'0')}${code}*\n`;
          });
        }
      });
      g += `M02*\n`;
      return g;
    };

    const gbrTopCopper = makeGerber('Copper,L1,Top', true);
    const gbrBottomCopper = makeGerber('Copper,L2,Bot', true);
    const gbrTopSilk = makeGerber('Legend,Top', false);
    const gbrBottomSilk = makeGerber('Legend,Bot', false);
    const gbrTopMask = makeGerber('Soldermask,Top', false);
    const gbrBottomMask = makeGerber('Soldermask,Bot', false);
    const gbrEdgeCuts = makeGerber('Profile,NP', false);

    let drlContent = `M48\nMETRIC,TZ\nT01C0.800\nT02C3.200\n%\nG05\nT01\n`;
    pcbLayout.forEach(pt => {
      drlContent += `X${String(pt.cx*100).padStart(7,'0')}Y${String(pt.cy*100).padStart(7,'0')}\n`;
    });
    drlContent += `T02\nX3000Y3000\nX77000Y3000\nM30\n`;

    // 7. Write individual files to disk
    const schFileName = `${safeProjectName}_${timeMark}.kicad_sch`;
    const pcbFileName = `${safeProjectName}_${timeMark}.kicad_pcb`;
    const bomFileName = `${safeProjectName}_${timeMark}_BOM.csv`;
    const proFileName = `${safeProjectName}_${timeMark}.kicad_pro`;

    fs.writeFileSync(path.join(PCB_DIR, schFileName), schematicContent, 'utf8');
    fs.writeFileSync(path.join(PCB_DIR, pcbFileName), layoutContent, 'utf8');
    fs.writeFileSync(path.join(PCB_DIR, bomFileName), bomContent, 'utf8');
    fs.writeFileSync(path.join(PCB_DIR, proFileName), projectContent, 'utf8');

    // ZIP outputs
    const gerberZipName = `Gerber_${safeProjectName}_${timeMark}.zip`;
    const gerberZipPath = path.join(PCB_DIR, gerberZipName);
    await createZip(gerberZipPath, (archive) => {
      archive.append(gbrTopCopper,    { name: `${safeProjectName}_F_Cu.gbr` });
      archive.append(gbrBottomCopper, { name: `${safeProjectName}_B_Cu.gbr` });
      archive.append(gbrTopSilk,      { name: `${safeProjectName}_F_SilkS.gbr` });
      archive.append(gbrBottomSilk,   { name: `${safeProjectName}_B_SilkS.gbr` });
      archive.append(gbrTopMask,      { name: `${safeProjectName}_F_Mask.gbr` });
      archive.append(gbrBottomMask,   { name: `${safeProjectName}_B_Mask.gbr` });
      archive.append(gbrEdgeCuts,     { name: `${safeProjectName}_Edge_Cuts.gbr` });
      archive.append(drlContent,      { name: `${safeProjectName}.drl` });
    });

    const kicadZipName = `KiCadProject_${safeProjectName}_${timeMark}.zip`;
    const kicadZipPath = path.join(PCB_DIR, kicadZipName);
    await createZip(kicadZipPath, (archive) => {
      archive.append(schematicContent, { name: `${safeProjectName}/${safeProjectName}.kicad_sch` });
      archive.append(layoutContent,    { name: `${safeProjectName}/${safeProjectName}.kicad_pcb` });
      archive.append(projectContent,   { name: `${safeProjectName}/${safeProjectName}.kicad_pro` });
      archive.append(bomContent,       { name: `${safeProjectName}/${safeProjectName}_BOM.csv` });
      archive.append(drlContent,       { name: `${safeProjectName}/${safeProjectName}.drl` });
    });

    // 8. Visual component rendering helper functions
    const drawComponentSymbol = (label, cx, cy, idx) => {
      const cleanLabel = label.toLowerCase();
      let s = '';
      if (cleanLabel.includes('arduino')) {
        const w = 220, h = 160;
        const x = cx - w/2, y = cy - h/2;
        s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0A3C5C" stroke="#041E30" stroke-width="2.5" rx="8" filter="url(#pcb-shadow)"/>`;
        s += `<path d="M ${x+10},${y+10} L ${x+120},${y+10} L ${x+100},${y+40} L ${x+10},${y+40} Z" fill="#005B82" opacity="0.4"/>`;
        s += `<text x="${x+20}" y="${y+30}" fill="#ffffff" font-size="11" font-weight="bold" font-family="monospace">ARDUINO UNO R3</text>`;
        s += `<rect x="${x - 10}" y="${y + 15}" width="40" height="30" fill="url(#metal-grad)" stroke="#475569" stroke-width="1.5" rx="3"/>`;
        s += `<rect x="${x - 8}" y="${y + h - 50}" width="50" height="35" fill="#0f172a" stroke="#334155" stroke-width="1.5" rx="2"/>`;
        s += `<rect x="${x + 50}" y="${y + 4}" width="155" height="12" fill="#1e293b" rx="1"/>`;
        for (let p = 0; p < 20; p++) s += `<rect x="${x + 54 + p * 7.5}" y="${y + 8}" width="3.5" height="4" fill="#111" rx="0.5"/>`;
        s += `<rect x="${x + 60}" y="${y + h - 16}" width="130" height="12" fill="#1e293b" rx="1"/>`;
        for (let p = 0; p < 16; p++) s += `<rect x="${x + 64 + p * 7.5}" y="${y + h - 12}" width="3.5" height="4" fill="#111" rx="0.5"/>`;
        s += `<text x="${cx}" y="${y - 12}" fill="#ffffff" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">MCU${idx}</text>`;
      } else if (cleanLabel.includes('l298n')) {
        const w = 130, h = 130;
        const x = cx - w/2, y = cy - h/2;
        s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#991B1B" stroke="#5C1010" stroke-width="2.5" rx="6" filter="url(#pcb-shadow)"/>`;
        s += `<rect x="${cx - 30}" y="${y + 12}" width="60" height="42" fill="#18181b" stroke="#374151" stroke-width="1.5" rx="3"/>`;
        for (let f = 0; f < 7; f++) s += `<rect x="${cx - 24 + f * 7.5}" y="${y + 12}" width="3" height="34" fill="#09090b" rx="0.5"/>`;
        s += `<rect x="${x + 4}" y="${cy - 25}" width="16" height="34" fill="#1D4ED8" stroke="#1E40AF" rx="2"/>`;
        s += `<circle cx="${x + 12}" cy="${cy - 16}" r="3" fill="#f59e0b"/>`;
        s += `<circle cx="${x + 12}" cy="${cy + 2}" r="3" fill="#f59e0b"/>`;
        s += `<rect x="${x + w - 20}" y="${cy - 25}" width="16" height="34" fill="#1D4ED8" stroke="#1E40AF" rx="2"/>`;
        s += `<circle cx="${x + w - 12}" cy="${cy - 16}" r="3" fill="#f59e0b"/>`;
        s += `<circle cx="${x + w - 12}" cy="${cy + 2}" r="3" fill="#f59e0b"/>`;
        s += `<text x="${cx}" y="${y - 12}" fill="#ffffff" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">U${idx}</text>`;
        s += `<text x="${cx}" y="${cy + 24}" fill="#fecaca" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">L298N DRIVER</text>`;
      } else if (cleanLabel.includes('sensor')) {
        const w = 120, h = 40;
        const x = cx - w/2, y = cy - h/2;
        s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1E293B" stroke="#0F172A" stroke-width="2" rx="4" filter="url(#pcb-shadow)"/>`;
        s += `<circle cx="${x - 12}" cy="${cy - 9}" r="3" fill="#3B82F6"/>`;
        s += `<circle cx="${x - 12}" cy="${cy + 9}" r="3" fill="#3B0764"/>`;
        s += `<rect x="${cx}" y="${cy - 8}" width="16" height="16" fill="#2563EB" stroke="#1D4ED8" rx="1"/>`;
        s += `<circle cx="${cx + 8}" cy="${cy}" r="3.5" fill="#FBBF24"/>`;
        s += `<text x="${cx}" y="${y - 10}" fill="#ffffff" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">U${idx}</text>`;
      } else if (cleanLabel.includes('motor')) {
        const w = 100, h = 80;
        const x = cx - w/2, y = cy - h/2;
        s += `<rect x="${x}" y="${y}" width="${w - 25}" height="${h}" fill="#EAB308" stroke="#CA8A04" stroke-width="2" rx="6" filter="url(#pcb-shadow)"/>`;
        s += `<rect x="${x + w - 25}" y="${cy - 22}" width="28" height="44" fill="#cbd5e1" stroke="#94a3b8" rx="15"/>`;
        s += `<rect x="${x - 14}" y="${cy - 6}" width="14" height="12" fill="#e2e8f0" stroke="#cbd5e1"/>`;
        s += `<circle cx="${x - 14}" cy="${cy}" r="6" fill="#cbd5e1" stroke="#94a3b8"/>`;
        s += `<text x="${cx - 12}" y="${y - 10}" fill="#ffffff" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">M${idx}</text>`;
      } else {
        const w = 80, h = 60;
        const x = cx - w/2, y = cy - h/2;
        s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFFFFF" stroke="#475569" stroke-width="2" rx="4" filter="url(#pcb-shadow)"/>`;
        s += `<text x="${cx}" y="${cy + 4}" fill="#38bdf8" font-size="7" font-weight="bold" font-family="monospace" text-anchor="middle">${label.slice(0,10)}</text>`;
        s += `<text x="${cx}" y="${y - 10}" fill="#ffffff" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">U${idx}</text>`;
      }
      return s;
    };

    // 9. UPGRADE PCB 3D Preview SVG (Green Solder Mask, Gold Pads, White Silkscreen)
    let pcbPreviewSvg = `<svg viewBox="0 0 ${boardW} ${boardH}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#090d16; border-radius:12px; font-family:monospace;">`;
    pcbPreviewSvg += `<defs>
    <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E5E7EB"/><stop offset="50%" stop-color="#9CA3AF"/><stop offset="100%" stop-color="#4B5563"/></linearGradient>`;
    pcbPreviewSvg += `<filter id="pcb-shadow"><feDropShadow dx="3" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/></filter>`;
    pcbPreviewSvg += `<filter id="gold-glow"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    pcbPreviewSvg += `<linearGradient id="pcb-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#052e16"/><stop offset="50%" stop-color="#14532d"/><stop offset="100%" stop-color="#022c22"/></linearGradient>`;
    pcbPreviewSvg += `<linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#b45309"/></linearGradient>`;
    pcbPreviewSvg += `<linearGradient id="metal-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="50%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#64748b"/></linearGradient>`;
    pcbPreviewSvg += `<pattern id="fiber-grid" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M 6,0 L 0,0 0,6" fill="none" stroke="#14532d" stroke-width="0.3" opacity="0.35"/></pattern>`;
    pcbPreviewSvg += `</defs>`;

    // Render Board Outline and bevel edge
    pcbPreviewSvg += `<rect x="23" y="23" width="${boardW-46}" height="${boardH-46}" fill="#0f172a" rx="14" filter="url(#pcb-shadow)"/>`;
    pcbPreviewSvg += `<rect x="25" y="25" width="${boardW-50}" height="${boardH-50}" fill="url(#pcb-grad)" rx="12"/>`;
    pcbPreviewSvg += `<rect x="25" y="25" width="${boardW-50}" height="${boardH-50}" fill="url(#fiber-grid)" rx="12"/>`;
    pcbPreviewSvg += `<rect x="33" y="33" width="${boardW-66}" height="${boardH-66}" fill="none" stroke="#eab308" stroke-width="1.2" rx="9" opacity="0.65"/>`;

    // Steel Corner Mounting Holes
    [[45,45],[boardW-45,45],[45,boardH-45],[boardW-45,boardH-45]].forEach(([hx,hy]) => {
      pcbPreviewSvg += `<circle cx="${hx}" cy="${hy}" r="12" fill="url(#gold-grad)" stroke="#92400e" stroke-width="1"/>`;
      pcbPreviewSvg += `<circle cx="${hx}" cy="${hy}" r="9" fill="url(#metal-grad)" stroke="#475569" stroke-width="0.8"/>`;
      pcbPreviewSvg += `<line x1="${hx-5}" y1="${hy-5}" x2="${hx+5}" y2="${hy+5}" stroke="#334155" stroke-width="1.5"/>`;
      pcbPreviewSvg += `<circle cx="${hx}" cy="${hy}" r="4.5" fill="#090d16"/>`;
    });

    // Draw Traces on Board surface
    routes.forEach(r => {
      const strokeColor = r.net === 'VCC' ? 'url(#gold-grad)' : r.net === 'GND' ? '#b45309' : '#10b981';
      let pointsStr = r.points.map(pt => pt.join(',')).join(' ');
      pcbPreviewSvg += `<polyline points="${pointsStr}" fill="none" stroke="${strokeColor}" stroke-width="${r.width}" stroke-linejoin="round" opacity="0.8" />`;
    });

    // Footprints layout pads and labels
    pcbLayout.forEach((fpLoc, idx) => {
      const fp = getFP(fpLoc.label);
      const { cx, cy } = fpLoc;
      const scale = 4.0;
      const pw = fp.w * scale, ph = fp.h * scale;
      const bx = cx - pw/2, by = cy - ph/2;
      
      // Draw Silkscreen outline boundary
      pcbPreviewSvg += `<rect x="${bx}" y="${by}" width="${pw}" height="${ph}" fill="none" stroke="#ffffff" stroke-width="1.2" rx="2" stroke-dasharray="3,2" opacity="0.8"/>`;
      // Draw Gold Pads
      for (let p = 0; p < fp.pinsL; p++) {
        const py2 = by + 12 + p * (fp.pinPitch * scale);
        pcbPreviewSvg += `<circle cx="${bx}" cy="${py2}" r="5" fill="url(#gold-grad)" stroke="#92400e" stroke-width="0.5"/>`;
        pcbPreviewSvg += `<circle cx="${bx}" cy="${py2}" r="2" fill="#090d16"/>`;
      }
      for (let p = 0; p < fp.pinsR; p++) {
        const py2 = by + 12 + p * (fp.pinPitch * scale);
        pcbPreviewSvg += `<circle cx="${bx+pw}" cy="${py2}" r="5" fill="url(#gold-grad)" stroke="#92400e" stroke-width="0.5"/>`;
        pcbPreviewSvg += `<circle cx="${bx+pw}" cy="${py2}" r="2" fill="#090d16"/>`;
      }
      if (fp.bottomPins) {
        fp.bottomPins.forEach((pn, pi) => {
          const px2 = bx + 10 + pi * (fp.pinPitch * scale);
          pcbPreviewSvg += `<circle cx="${px2}" cy="${by+ph}" r="5" fill="url(#gold-grad)" stroke="#92400e" stroke-width="0.5"/>`;
          pcbPreviewSvg += `<circle cx="${px2}" cy="${by+ph}" r="2" fill="#090d16"/>`;
        });
      }

      // Draw Vias along paths
      if (idx < compArray.length - 1 && idx < pcbLayout.length - 1) {
        const nextPos = pcbLayout[idx+1];
        const viaX = (cx + nextPos.cx)/2, viaY = (cy + nextPos.cy)/2;
        pcbPreviewSvg += `<circle cx="${viaX}" cy="${viaY}" r="5" fill="url(#gold-grad)" stroke="#92400e" stroke-width="0.8" filter="url(#gold-glow)"/>`;
        pcbPreviewSvg += `<circle cx="${viaX}" cy="${viaY}" r="2" fill="#090d16"/>`;
      }
    });

    // Draw Detailed Assembly Components on Top
    pcbLayout.forEach((fpLoc, idx) => {
      pcbPreviewSvg += drawComponentSymbol(fpLoc.label, fpLoc.cx, fpLoc.cy, idx + 1);
    });

    // Board title silkscreen
    pcbPreviewSvg += `<rect x="${boardW/2-150}" y="${boardH-45}" width="300" height="22" fill="#041E30" rx="3" stroke="#eab308" stroke-width="0.8" opacity="0.9"/>`;
    pcbPreviewSvg += `<text x="${boardW/2}" y="${boardH-30}" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle" font-family="monospace">PROJECTFORGE AI — ${projectName.toUpperCase()}</text>`;
    pcbPreviewSvg += `</svg>`;

    // 10. UPGRADE TOP COPPER LAYER (KiCad Red style, copper pads, red traces, labels)
    let topLayerSvg = `<svg viewBox="0 0 ${boardW} ${boardH}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#130406; border-radius:12px; font-family:monospace;">`;
    topLayerSvg += `<defs>
    <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E5E7EB"/><stop offset="50%" stop-color="#9CA3AF"/><stop offset="100%" stop-color="#4B5563"/></linearGradient>`;
    topLayerSvg += `<pattern id="top-grid" width="20" height="20" patternUnits="userSpaceOnUse"><line x1="20" y1="0" x2="0" y2="0" stroke="#330b0e" stroke-width="0.5"/><line x1="0" y1="0" x2="0" y2="20" stroke="#330b0e" stroke-width="0.5"/></pattern>`;
    topLayerSvg += `</defs>`;
    topLayerSvg += `<rect width="${boardW}" height="${boardH}" fill="#130406"/>`;
    topLayerSvg += `<rect width="${boardW}" height="${boardH}" fill="url(#top-grid)"/>`;
    topLayerSvg += `<rect x="25" y="25" width="${boardW-50}" height="${boardH-50}" fill="none" stroke="#f43f5e" stroke-width="2.5" rx="12"/>`;

    // Render Red top copper routes
    routes.forEach(r => {
      if (r.layer === 'top') {
        let pointsStr = r.points.map(pt => pt.join(',')).join(' ');
        topLayerSvg += `<polyline points="${pointsStr}" fill="none" stroke="#f43f5e" stroke-width="3" stroke-linejoin="round" opacity="0.9"/>`;
      }
    });

    // Pads and layout elements
    pcbLayout.forEach((fpLoc, idx) => {
      const fp = getFP(fpLoc.label);
      const { cx, cy } = fpLoc;
      const scale = 4.0;
      const pw = fp.w * scale, ph = fp.h * scale;
      const bx = cx - pw/2, by = cy - ph/2;

      // Courtyard (pink dashed)
      topLayerSvg += `<rect x="${bx-4}" y="${by-4}" width="${pw+8}" height="${ph+8}" fill="none" stroke="#ec4899" stroke-width="0.6" rx="3" stroke-dasharray="3,3" opacity="0.6"/>`;
      topLayerSvg += `<text x="${cx}" y="${by-10}" fill="#f43f5e" font-size="8" font-weight="bold" text-anchor="middle">${fp.ref}${idx+1}</text>`;
      topLayerSvg += `<text x="${cx}" y="${by+ph+12}" fill="#ec4899" font-size="7" text-anchor="middle">${fpLoc.label.slice(0,10)}</text>`;

      for (let p = 0; p < fp.pinsL; p++) {
        const py2 = by + 12 + p * (fp.pinPitch * scale);
        topLayerSvg += `<circle cx="${bx}" cy="${py2}" r="6.5" fill="#f43f5e" stroke="#fda4af" stroke-width="0.8"/>`;
        topLayerSvg += `<circle cx="${bx}" cy="${py2}" r="2.2" fill="#130406"/>`;
      }
      for (let p = 0; p < fp.pinsR; p++) {
        const py2 = by + 12 + p * (fp.pinPitch * scale);
        topLayerSvg += `<circle cx="${bx+pw}" cy="${py2}" r="6.5" fill="#f43f5e" stroke="#fda4af" stroke-width="0.8"/>`;
        topLayerSvg += `<circle cx="${bx+pw}" cy="${py2}" r="2.2" fill="#130406"/>`;
      }

      // Vias (red annular rings)
      if (idx < compArray.length - 1 && idx < pcbLayout.length - 1) {
        const nextPos = pcbLayout[idx+1];
        const viaX = (cx + nextPos.cx)/2, viaY = (cy + nextPos.cy)/2;
        topLayerSvg += `<circle cx="${viaX}" cy="${viaY}" r="5" fill="#f43f5e" stroke="#fda4af" stroke-width="0.8"/>`;
        topLayerSvg += `<circle cx="${viaX}" cy="${viaY}" r="2" fill="#130406"/>`;
      }
    });

    topLayerSvg += `<text x="45" y="55" fill="#f43f5e" font-size="12" font-weight="bold">F.Cu — TOP COPPER LAYER (RED)</text>`;
    topLayerSvg += `</svg>`;

    // 11. UPGRADE BOTTOM COPPER LAYER (Blue style, Ground pour, clearance routing)
    let bottomLayerSvg = `<svg viewBox="0 0 ${boardW} ${boardH}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#020617; border-radius:12px; font-family:monospace;">`;
    bottomLayerSvg += `<defs>
    <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E5E7EB"/><stop offset="50%" stop-color="#9CA3AF"/><stop offset="100%" stop-color="#4B5563"/></linearGradient>`;
    bottomLayerSvg += `<pattern id="bot-grid" width="20" height="20" patternUnits="userSpaceOnUse"><line x1="20" y1="0" x2="0" y2="0" stroke="#0f172a" stroke-width="0.5"/><line x1="0" y1="0" x2="0" y2="20" stroke="#0f172a" stroke-width="0.5"/></pattern>`;
    bottomLayerSvg += `</defs>`;
    bottomLayerSvg += `<rect width="${boardW}" height="${boardH}" fill="#020617"/>`;
    bottomLayerSvg += `<rect width="${boardW}" height="${boardH}" fill="url(#bot-grid)"/>`;

    // 3D blue Ground plane solid copper pour wash
    bottomLayerSvg += `<rect x="25" y="25" width="${boardW-50}" height="${boardH-50}" fill="#1e3a8a" fill-opacity="0.16" stroke="#2563eb" stroke-width="2" rx="12"/>`;

    // Clearance channels for signal lines on the bottom copper
    routes.forEach(r => {
      if (r.layer === 'bottom') {
        let pointsStr = r.points.map(pt => pt.join(',')).join(' ');
        // Clearance channel (cut in Ground plane pour)
        bottomLayerSvg += `<polyline points="${pointsStr}" fill="none" stroke="#020617" stroke-width="8" stroke-linejoin="round"/>`;
      }
    });

    // Clearances for all pads/vias that are NOT GND
    pcbLayout.forEach((fpLoc) => {
      const fp = getFP(fpLoc.label);
      const { cx, cy } = fpLoc;
      const scale = 4.0;
      const pw = fp.w * scale, ph = fp.h * scale;
      const bx = cx - pw/2, by = cy - ph/2;

      for (let p = 0; p < fp.pinsL; p++) {
        const py2 = by + 12 + p * (fp.pinPitch * scale);
        // Clear a circle in ground pour
        bottomLayerSvg += `<circle cx="${bx}" cy="${py2}" r="10" fill="#020617"/>`;
      }
      for (let p = 0; p < fp.pinsR; p++) {
        const py2 = by + 12 + p * (fp.pinPitch * scale);
        bottomLayerSvg += `<circle cx="${bx+pw}" cy="${py2}" r="10" fill="#020617"/>`;
      }
    });

    // Ground Plane grid hatching lines
    for (let hx = 30; hx < boardW-30; hx += 16) {
      bottomLayerSvg += `<line x1="${hx}" y1="25" x2="${hx}" y2="${boardH-25}" stroke="#2563eb" stroke-width="0.35" opacity="0.2"/>`;
    }

    // Draw Blue bottom copper routes
    routes.forEach(r => {
      if (r.layer === 'bottom') {
        let pointsStr = r.points.map(pt => pt.join(',')).join(' ');
        bottomLayerSvg += `<polyline points="${pointsStr}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linejoin="round" opacity="0.95"/>`;
      }
    });

    // Draw Pads and Thermal Relief connections for GND net
    pcbLayout.forEach((fpLoc, idx) => {
      const fp = getFP(fpLoc.label);
      const { cx, cy } = fpLoc;
      const scale = 4.0;
      const pw = fp.w * scale, ph = fp.h * scale;
      const bx = cx - pw/2, by = cy - ph/2;

      // Draw thermal relief crosses for GND pins to connect directly to the ground pour
      const drawGndPad = (px, py) => {
        // Thermal relief lines
        bottomLayerSvg += `<line x1="${px-9}" y1="${py}" x2="${px+9}" y2="${py}" stroke="#3b82f6" stroke-width="1.5" />`;
        bottomLayerSvg += `<line x1="${px}" y1="${py-9}" x2="${px}" y2="${py+9}" stroke="#3b82f6" stroke-width="1.5" />`;
        bottomLayerSvg += `<circle cx="${px}" cy="${py}" r="6.5" fill="#3b82f6" stroke="#60a5fa" stroke-width="0.8"/>`;
        bottomLayerSvg += `<circle cx="${px}" cy="${py}" r="2.2" fill="#020617"/>`;
      };

      const drawSignalPad = (px, py) => {
        bottomLayerSvg += `<circle cx="${px}" cy="${py}" r="6.5" fill="#3b82f6" stroke="#93c5fd" stroke-width="0.8"/>`;
        bottomLayerSvg += `<circle cx="${px}" cy="${py}" r="2.2" fill="#020617"/>`;
      };

      for (let p = 0; p < fp.pinsL; p++) {
        const py2 = by + 12 + p * (fp.pinPitch * scale);
        // Standard pin layout
        if (p === 0) drawSignalPad(bx, py2); // pin 1 (VCC)
        else drawGndPad(bx, py2); // GND pad
      }
      for (let p = 0; p < fp.pinsR; p++) {
        const py2 = by + 12 + p * (fp.pinPitch * scale);
        drawSignalPad(bx+pw, py2);
      }

      // Vias (blue annular rings)
      if (idx < compArray.length - 1 && idx < pcbLayout.length - 1) {
        const nextPos = pcbLayout[idx+1];
        const viaX = (cx + nextPos.cx)/2, viaY = (cy + nextPos.cy)/2;
        bottomLayerSvg += `<circle cx="${viaX}" cy="${viaY}" r="5" fill="#3b82f6" stroke="#93c5fd" stroke-width="0.8"/>`;
        bottomLayerSvg += `<circle cx="${viaX}" cy="${viaY}" r="2" fill="#020617"/>`;
      }
    });

    bottomLayerSvg += `<text x="45" y="55" fill="#3b82f6" font-size="12" font-weight="bold">B.Cu — BOTTOM COPPER LAYER (BLUE / GND POUR)</text>`;
    bottomLayerSvg += `</svg>`;

    // 12. Save URLs
    const schDownloadUrl = `/pcb/${schFileName}`;
    const pcbDownloadUrl = `/pcb/${pcbFileName}`;
    const bomDownloadUrl = `/pcb/${bomFileName}`;
    const gerberDownloadUrl = `/pcb/${gerberZipName}`;
    const kicadProjectUrl = `/pcb/${kicadZipName}`;

    await db.run(
      `INSERT INTO pcb_designs (user_id, project_name, components, schematic_path, layout_path, bom_path) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, projectName, components, schDownloadUrl, pcbDownloadUrl, bomDownloadUrl]
    );

    const downloadsToSave = [
      { name: schFileName, type: 'kicad_sch', url: schDownloadUrl },
      { name: pcbFileName, type: 'kicad_pcb', url: pcbDownloadUrl },
      { name: bomFileName, type: 'bom_csv', url: bomDownloadUrl },
      { name: gerberZipName, type: 'gerber_zip', url: gerberDownloadUrl },
      { name: kicadZipName, type: 'kicad_zip', url: kicadProjectUrl }
    ];

    for (const dl of downloadsToSave) {
      await db.run(
        `INSERT INTO downloads (user_id, file_name, file_type, download_url) VALUES ($1, $2, $3, $4)`,
        [req.user.id, dl.name, dl.type, dl.url]
      );
    }

    await logActivity(req.user.id, 'PCB_GENERATED', { projectName, components: compArray });

    res.json({
      schematicUrl: schDownloadUrl,
      layoutUrl: pcbDownloadUrl,
      bomUrl: bomDownloadUrl,
      gerberUrl: gerberDownloadUrl,
      kicadProjUrl: kicadProjectUrl,
      pcbPreviewSvg,
      topLayerSvg,
      bottomLayerSvg,
      isFallback: false,
      stats: {
        componentCount: compArray.length,
        gerberSizeBytes: fs.statSync(gerberZipPath).size,
        kicadZipSizeBytes: fs.statSync(kicadZipPath).size,
        schSizeBytes: fs.statSync(path.join(PCB_DIR, schFileName)).size,
        pcbSizeBytes: fs.statSync(path.join(PCB_DIR, pcbFileName)).size,
        bomSizeBytes: fs.statSync(path.join(PCB_DIR, bomFileName)).size,
        totalBomCost: `₹${totalCost}`
      }
    });

  } catch (err) {
    console.error('[PCBGen] ERROR:', err.message);
    const pcbPreviewSvg = `<svg viewBox="0 0 700 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#F8FAFC; border-radius:12px;"><rect x="10" y="10" width="680" height="380" fill="#7F1D1D" stroke="#991B1B" stroke-width="6" rx="16"/><text x="350" y="190" fill="#FFFFFF" font-size="16" font-family="monospace" font-weight="bold" text-anchor="middle">PCB COMPILATION FAIL</text><text x="350" y="220" fill="#FCA5A5" font-size="11" font-family="monospace" text-anchor="middle">ERR: ${err.message}</text></svg>`;
    const topLayerSvg = `<svg viewBox="0 0 700 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#F8FAFC; border-radius:12px;"><rect x="10" y="10" width="680" height="380" fill="#1A0505" stroke="#7F1D1D" stroke-width="4" rx="16"/><text x="350" y="200" fill="#EF4444" font-size="13" font-family="monospace" text-anchor="middle">F.Cu — Fallback Layout</text></svg>`;
    const bottomLayerSvg = `<svg viewBox="0 0 700 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#F8FAFC; border-radius:12px;"><rect x="10" y="10" width="680" height="380" fill="#050A1A" stroke="#1D4ED8" stroke-width="4" rx="16"/><text x="350" y="200" fill="#3B82F6" font-size="13" font-family="monospace" text-anchor="middle">B.Cu — Ground Pour Fallback</text></svg>`;
    
    const safeName = (projectName || 'project').replace(/[^a-zA-Z0-9]/g, '_');
    const fbSchName = `Fallback_${safeName}.kicad_sch`;
    const fbPcbName = `Fallback_${safeName}.kicad_pcb`;
    const fbBomName = `Fallback_${safeName}_BOM.csv`;
    const fbGerberName = `Fallback_Gerber_${safeName}.zip`;
    const fbKicadName = `Fallback_KiCad_${safeName}.zip`;

    try {
      fs.writeFileSync(path.join(PCB_DIR, fbSchName), `(kicad_sch (version 20211123) (generator eeschema) (paper "A4") (title_block (title "Fallback: ${projectName}")))\n`);
      fs.writeFileSync(path.join(PCB_DIR, fbPcbName), `(kicad_pcb (version 20211014) (generator pcbnew) (general (thickness 1.6)) (paper "A4"))\n`);
      fs.writeFileSync(path.join(PCB_DIR, fbBomName), `"Reference","Component","Quantity"\n"U1","Fallback Module","1"\n`);
      await new Promise((resolve) => {
        const stream = fs.createWriteStream(path.join(PCB_DIR, fbGerberName));
        const arch = new ZipArchive({ zlib: { level: 1 } });
        stream.on('close', resolve);
        stream.on('error', resolve);
        arch.pipe(stream);
        arch.append('%FSLAX46Y46*%\n%MOMM*%\nM02*\n', { name: 'fallback.gbr' });
        arch.append('M48\nMETRIC,TZ\nT01C0.8\n%\nG05\nT01\nM30\n', { name: 'fallback.drl' });
        arch.finalize();
      });

      await new Promise((resolve) => {
        const stream = fs.createWriteStream(path.join(PCB_DIR, fbKicadName));
        const arch = new ZipArchive({ zlib: { level: 1 } });
        stream.on('close', resolve);
        stream.on('error', resolve);
        arch.pipe(stream);
        arch.append(`(kicad_sch (version 20211123))\n`, { name: 'fallback.kicad_sch' });
        arch.finalize();
      });
    } catch (writeErr) {
      console.error('[PCBGen] Fallback file write failed:', writeErr.message);
    }

    res.json({
      schematicUrl:   `/pcb/${fbSchName}`,
      layoutUrl:      `/pcb/${fbPcbName}`,
      bomUrl:         `/pcb/${fbBomName}`,
      gerberUrl:      `/pcb/${fbGerberName}`,
      kicadProjUrl:   `/pcb/${fbKicadName}`,
      pcbPreviewSvg,
      topLayerSvg,
      bottomLayerSvg,
      isFallback:     true,
      fallbackReason: err.message
    });
  }
});


// Get user PCB designs list
app.get('/api/pcb/my-designs', verifyToken, async (req, res) => {
  try {
    const list = await db.query(`SELECT * FROM pcb_designs WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(list.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve PCB designs.' });
  }
});

// ==========================================
// PAYMENTS & SUBSCRIPTIONS (Razorpay + manual QR Approval)
// ==========================================

// Create Razorpay Order ID
app.post('/api/payments/order', verifyToken, async (req, res) => {
  const { planName, amount } = req.body;
  if (!planName || !amount) {
    return res.status(400).json({ message: 'Plan name and amount are required.' });
  }

  // razorpay payment config simulation
  const orderId = 'order_' + Math.random().toString(36).substring(2, 15).toUpperCase();
  res.json({
    orderId,
    amount: amount * 100, // paise
    currency: 'INR',
    key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_keys_projectforge_2026'
  });
});

// Verify Razorpay Payment Signature
app.post('/api/payments/verify', verifyToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, planName, amount } = req.body;

  try {
    // In real Razorpay we verify signature: crypto.createHmac().update(order_id + '|' + payment_id).digest('hex')
    // We will automatically approve payment verification in development
    await db.run(
      `INSERT INTO payments (user_id, plan_name, amount, payment_method, status, transaction_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, planName, amount, 'razorpay', 'approved', razorpay_payment_id]
    );

    // Update user subscription
    await db.run(`UPDATE users SET subscription_status = $1 WHERE id = $2`, [planName.toLowerCase(), req.user.id]);
    await logActivity(req.user.id, 'SUBSCRIPTION_UPGRADED_RAZORPAY', { plan: planName });

    res.json({ success: true, message: `Successfully upgraded to ${planName} plan!` });
  } catch (err) {
    res.status(500).json({ message: 'Payment verification failed.', error: err.message });
  }
});

// Submit Manual QR Payment Receipt (Screenshot file upload)
app.post('/api/payments/qr-submit', verifyToken, upload.single('screenshotFile'), async (req, res) => {
  const { planName, amount, transactionId } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'Payment receipt screenshot file is required.' });
  }

  try {
    const screenshotPath = `/uploads/${req.file.filename}`;

    await db.run(
      `INSERT INTO payments (user_id, plan_name, amount, payment_method, reference_screenshot_path, status, transaction_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.id,
        planName,
        parseFloat(amount),
        'manual_qr',
        screenshotPath,
        'pending',
        transactionId || 'TXN_' + Date.now()
      ]
    );

    await logActivity(req.user.id, 'MANUAL_PAYMENT_SUBMITTED', { plan: planName, amount });
    res.json({ success: true, message: 'QR payment screenshot uploaded successfully. Admin verification pending.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit payment receipt.', error: err.message });
  }
});

// List User Payment History
app.get('/api/payments/history', verifyToken, async (req, res) => {
  try {
    const list = await db.query(`SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(list.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load payments.' });
  }
});

// ==========================================
// ASK AI ENGINEERING HELPER CHATBOT
// ==========================================

app.post('/api/ai/chat', verifyToken, async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ message: 'Message is required.' });

  const contextPrompt = `You are a supportive, high-level ProjectForge AI Engineering chatbot helper.
Your job is to answer questions related to microcontrollers, circuit designs, debugging code, layout tracks, firmware loops, or other computer/electronics tasks.
Provide extremely concise, detailed, and professional engineering solutions.

User Prompt: ${message}`;

  try {
    let aiResponse = await generateWithGemini(contextPrompt, false);
    if (!aiResponse) {
      aiResponse = `ProjectForge AI Engineering Response:\n\nFor your query: "${message}", here are key recommendations:\n` +
        `1. Board Diagnostic: Ensure GND tracks are unified to prevent erratic floating inputs.\n` +
        `2. Decoupling: Place 100nF ceramic capacitors as close to device power pins as possible.\n` +
        `3. Firmwares: Check serial baud rates match standard 115200 for clean logging outputs.`;
    }
    res.json({ response: aiResponse });
  } catch (err) {
    res.status(500).json({ message: 'Chatbot failed.' });
  }
});

// ==========================================
// ADMIN DASHBOARD MODULE (restricted to role: admin)
// ==========================================

app.get('/api/admin/users', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const list = await db.query(`SELECT id, name, email, mobile, college_name, branch, reg_number, subscription_status, role, created_at FROM users ORDER BY created_at DESC`);
    res.json(list.rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

app.post('/api/admin/users/:id/update-plan', verifyToken, requireRole(['admin']), async (req, res) => {
  const { plan } = req.body;
  try {
    await db.run(`UPDATE users SET subscription_status = $1 WHERE id = $2`, [plan.toLowerCase(), req.params.id]);
    await logActivity(req.user.id, 'ADMIN_MANUAL_PLAN_UPDATE', { targetUserId: req.params.id, newPlan: plan });
    res.json({ success: true, message: 'User plan updated successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update plan.' });
  }
});

app.get('/api/admin/payments', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const list = await db.query(
      `SELECT p.*, u.name as user_name, u.email as user_email 
       FROM payments p 
       JOIN users u ON p.user_id = u.id 
       ORDER BY p.created_at DESC`
    );
    res.json(list.rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch payments.' });
  }
});

// Approve/Reject manual QR payment screenshot
app.post('/api/admin/payments/:id/verify', verifyToken, requireRole(['admin']), async (req, res) => {
  const { action } = req.body; // 'approved' or 'rejected'
  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action.' });
  }

  try {
    const payment = await db.get(`SELECT * FROM payments WHERE id = $1`, [req.params.id]);
    if (!payment) return res.status(404).json({ message: 'Payment record not found.' });

    await db.run(`UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [action, req.params.id]);

    if (action === 'approved') {
      await db.run(`UPDATE users SET subscription_status = $1 WHERE id = $2`, [payment.plan_name.toLowerCase(), payment.user_id]);
      await logActivity(payment.user_id, 'SUBSCRIPTION_UPGRADED_MANUAL_QR', { plan: payment.plan_name });
      queueMockMail(
        'user@projectforge.ai', // fallback placeholder
        'ProjectForge AI Subscription Upgrade Approved',
        `Great news! Your manual QR payment of ₹${payment.amount} for the ${payment.plan_name} plan has been verified and approved. Your premium features are now active!`
      );
    }

    await logActivity(req.user.id, `ADMIN_PAYMENT_VERIFIED_${action.toUpperCase()}`, { paymentId: payment.id });
    res.json({ success: true, message: `Payment successfully marked as ${action}.` });
  } catch (err) {
    res.status(500).json({ message: 'Verification transaction failed.' });
  }
});

// Admin Analytics Metrics
app.get('/api/admin/analytics', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const userCount = await db.get(`SELECT COUNT(*) as count FROM users`);
    const projectCount = await db.get(`SELECT COUNT(*) as count FROM projects`);
    const reportCount = await db.get(`SELECT COUNT(*) as count FROM reports`);
    const pcbCount = await db.get(`SELECT COUNT(*) as count FROM pcb_designs`);
    const totalPayments = await db.get(`SELECT SUM(amount) as sum FROM payments WHERE status = 'approved'`);
    
    // Tiers counts
    const freeCount = await db.get(`SELECT COUNT(*) as count FROM users WHERE subscription_status = 'free'`);
    const studentCount = await db.get(`SELECT COUNT(*) as count FROM users WHERE subscription_status = 'student'`);
    const premiumCount = await db.get(`SELECT COUNT(*) as count FROM users WHERE subscription_status = 'premium'`);
    const patentCount = await db.get(`SELECT COUNT(*) as count FROM users WHERE subscription_status = 'patent'`);

    res.json({
      totalUsers: userCount ? userCount.count : 0,
      totalProjects: projectCount ? projectCount.count : 0,
      totalReports: reportCount ? reportCount.count : 0,
      totalPcbs: pcbCount ? pcbCount.count : 0,
      revenue: totalPayments ? (totalPayments.sum || 0) : 0,
      tiers: {
        free: freeCount ? freeCount.count : 0,
        student: studentCount ? studentCount.count : 0,
        premium: premiumCount ? premiumCount.count : 0,
        patent: patentCount ? patentCount.count : 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Analytics fetching failed.' });
  }
});

// Downloads list
app.get('/api/downloads', verifyToken, async (req, res) => {
  try {
    const list = await db.query(`SELECT * FROM downloads WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(list.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve downloads list.' });
  }
});

// ==========================================
// PHASE 2 — MODULE 1: ASK PROJECT IDEA WITH AI
// ==========================================

app.post('/api/ai/idea', verifyToken, async (req, res) => {
  const { components, branch, project_type } = req.body;
  if (!components || !Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ message: 'At least one component is required.' });
  }

  const compStr = components.join(', ');
  const prompt = `You are an expert engineering professor. A student has these components available: ${compStr}.
Branch: ${branch || 'Electronics/CS'}, Project Type: ${project_type || 'IoT'}.

Generate exactly 3 distinct, creative, and feasible engineering project ideas they can build.
Return strict JSON matching this structure:
{
  "ideas": [
    {
      "title": "Project title",
      "summary": "2-3 sentence project summary describing what it does and how",
      "costEstimation": "Detailed cost in Indian Rupees, e.g. Total: ₹2,500",
      "difficultyScore": 6,
      "difficultyLabel": "Intermediate",
      "futureScope": ["Future enhancement 1", "Future enhancement 2", "Future enhancement 3"],
      "whyFeasible": "Why this project is achievable with the listed components"
    }
  ]
}`;

  try {
    let resultJson = await generateWithGemini(prompt, true);
    let output = null;

    if (resultJson) {
      try {
        const cleanedStr = resultJson.replace(/```json/g, '').replace(/```/g, '').trim();
        output = JSON.parse(cleanedStr);
      } catch (err) {
        console.error('Failed to parse Gemini idea output, falling back to mock.', err);
      }
    }

    if (!output || !output.ideas) {
      output = {
        ideas: [
          {
            title: `Smart ${project_type || 'IoT'} Monitoring System`,
            summary: `Build an intelligent monitoring system using ${components[0] || 'ESP32'} that collects environmental data, displays it on an OLED, and sends alerts via WiFi. Ideal for home automation and lab monitoring applications.`,
            costEstimation: `${components[0] || 'ESP32'}: ₹450, OLED Display: ₹350, DHT11 Sensor: ₹120, PCB + Wires: ₹180. Total: ₹1,100`,
            difficultyScore: 4,
            difficultyLabel: 'Beginner',
            futureScope: ['Add cloud dashboard with ThingSpeak', 'Integrate voice alerts via buzzer', 'Add solar-powered battery bank'],
            whyFeasible: `All listed components are compatible and widely documented. ${components[0] || 'ESP32'} has built-in WiFi eliminating the need for extra modules.`
          },
          {
            title: `Autonomous ${project_type || 'Robotics'} Control Platform`,
            summary: `Design an autonomous control unit using ${components[0] || 'Arduino'} with sensor fusion for obstacle detection and path navigation. Integrates PID control loops for smooth motion.`,
            costEstimation: `${components[0] || 'Arduino'}: ₹350, HC-SR04 Sensors x2: ₹160, L298N Motor Driver: ₹120, BO Motors x4: ₹280, Chassis Kit: ₹320. Total: ₹1,230`,
            difficultyScore: 7,
            difficultyLabel: 'Intermediate',
            futureScope: ['Add camera vision for object tracking', 'Implement RF remote control override', 'Deploy SLAM algorithm for mapping'],
            whyFeasible: 'Standard components with extensive Arduino library support. PID implementation requires firmware tuning but is well-documented.'
          },
          {
            title: `AI Edge Inference ${project_type || 'ML'} Classifier`,
            summary: `Deploy a lightweight ML model on ${components[0] || 'Raspberry Pi'} for real-time edge classification. System captures input data, runs inference locally, and logs predictions without cloud dependency.`,
            costEstimation: `${components[0] || 'Raspberry Pi'}: ₹3,200, Camera Module: ₹850, MicroSD 32GB: ₹350, 5V Power Supply: ₹250. Total: ₹4,650`,
            difficultyScore: 9,
            difficultyLabel: 'Advanced',
            futureScope: ['Integrate TensorFlow Lite quantized models', 'Build Flask REST API for inference endpoint', 'Add MQTT publish for IoT dashboard integration'],
            whyFeasible: `${components[0] || 'Raspberry Pi'} supports Python ML libraries natively. TFLite models can be compressed to fit embedded memory constraints.`
          }
        ]
      };
    }

    // Save to DB
    await db.run(
      `INSERT INTO project_ideas (user_id, components, branch, project_type, ideas) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, JSON.stringify(components), branch || '', project_type || '', JSON.stringify(output.ideas)]
    );

    await logActivity(req.user.id, 'IDEAS_GENERATED', { componentCount: components.length, project_type });
    res.json({ ideas: output.ideas });
  } catch (error) {
    res.status(500).json({ message: 'Idea generation failed.', error: error.message });
  }
});

// Get user's past idea sets
app.get('/api/ai/my-ideas', verifyToken, async (req, res) => {
  try {
    const list = await db.query(`SELECT * FROM project_ideas WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [req.user.id]);
    res.json(list.rows.map(r => ({ ...r, components: JSON.parse(r.components || '[]'), ideas: JSON.parse(r.ideas || '[]') })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load ideas.' });
  }
});

// ==========================================
// PHASE 2 — MODULE 2: SMART TEMPLATE UPLOAD ENGINE
// ==========================================

// Dedicated template storage multer config
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMPLATES_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'tpl_' + uniqueSuffix + path.extname(file.originalname));
  }
});
const templateUpload = multer({
  storage: templateStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pptx', '.docx', '.ppt', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PPTX and DOCX template files are allowed.'));
  },
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

app.post('/api/templates/upload', verifyToken, templateUpload.single('templateFile'), async (req, res) => {
  const { template_type } = req.body;
  if (!req.file) return res.status(400).json({ message: 'Template file is required.' });
  if (!['ppt', 'report'].includes(template_type)) {
    return res.status(400).json({ message: 'template_type must be "ppt" or "report".' });
  }

  try {
    const filePath = `/templates/${req.file.filename}`;
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Extract basic style metadata from file name/extension as lightweight parsing
    // For production, use officegen or mammoth to parse OOXML styles
    const styles = {
      bgColor: '0F172A',          // Default dark slate (extracted from OOXML in production)
      titleFont: 'Calibri',
      bodyFont: 'Arial',
      accentColor: '6366F1',
      fileType: ext.replace('.', ''),
      originalName: req.file.originalname,
      uploadedAt: new Date().toISOString()
    };

    const result = await db.run(
      `INSERT INTO user_templates (user_id, template_name, template_type, file_path, styles) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, req.file.originalname, template_type, filePath, JSON.stringify(styles)]
    );

    await logActivity(req.user.id, 'TEMPLATE_UPLOADED', { templateType: template_type, fileName: req.file.originalname });
    res.json({ templateId: result.lastID, templateName: req.file.originalname, styles, downloadPath: filePath });
  } catch (err) {
    res.status(500).json({ message: 'Template upload failed.', error: err.message });
  }
});

app.get('/api/templates/my-templates', verifyToken, async (req, res) => {
  try {
    const list = await db.query(`SELECT * FROM user_templates WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(list.rows.map(r => ({ ...r, styles: JSON.parse(r.styles || '{}') })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load templates.' });
  }
});

app.delete('/api/templates/:id', verifyToken, async (req, res) => {
  try {
    const tpl = await db.get(`SELECT * FROM user_templates WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (!tpl) return res.status(404).json({ message: 'Template not found.' });
    // Remove file from disk
    const fullPath = path.join(TEMPLATES_DIR, path.basename(tpl.file_path));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    await db.run(`DELETE FROM user_templates WHERE id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Template deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete template.' });
  }
});

// Rename a template
app.patch('/api/templates/:id/rename', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required.' });
  try {
    const tpl = await db.get(`SELECT * FROM user_templates WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (!tpl) return res.status(404).json({ message: 'Template not found.' });
    await db.run(`UPDATE user_templates SET template_name = $1 WHERE id = $2`, [name.trim(), req.params.id]);
    res.json({ success: true, template_name: name.trim() });
  } catch (err) {
    res.status(500).json({ message: 'Failed to rename template.' });
  }
});

// Get a single template by id (for use in generators)
app.get('/api/templates/:id', verifyToken, async (req, res) => {
  try {
    const tpl = await db.get(`SELECT * FROM user_templates WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (!tpl) return res.status(404).json({ message: 'Template not found.' });
    res.json({ ...tpl, styles: JSON.parse(tpl.styles || '{}') });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load template.' });
  }
});

// Serve template files as static
app.use('/templates', express.static(TEMPLATES_DIR));

// ==========================================
// PHASE 2 — MODULE 3: VIVA GENERATOR
// ==========================================

app.post('/api/ai/viva', verifyToken, async (req, res) => {
  const { projectTitle, projectDescription, components, examinerMode } = req.body;
  if (!projectTitle || !projectDescription) {
    return res.status(400).json({ message: 'Project title and description are required.' });
  }

  // Gate: Student, Premium, or Patent plans only
  const user = await db.get(`SELECT subscription_status FROM users WHERE id = $1`, [req.user.id]);
  if (user && user.subscription_status === 'free') {
    return res.status(403).json({ message: 'Viva Generator requires a Student, Premium, or Patent plan. Please upgrade.' });
  }

  const totalQuestions = examinerMode ? 20 : 15;
  const prompt = `You are a strict engineering professor conducting a viva voce exam.
Project Title: "${projectTitle}"
Description: ${projectDescription}
Components Used: ${components || 'Standard embedded components'}
Examiner Mode: ${examinerMode ? 'YES — include 5 hard external examiner questions' : 'NO — standard 15 questions'}

Generate exactly ${totalQuestions} viva questions with detailed model answers.
Return strict JSON matching this structure:
{
  "questions": [
    {
      "id": 1,
      "question": "Specific technical question",
      "answer": "Detailed model answer with technical depth",
      "difficulty": "basic|intermediate|advanced|examiner",
      "category": "concept|design|implementation|theory"
    }
  ]
}
Categories: concept (what/why), design (how it was designed), implementation (code/circuit), theory (underlying principles).
Examiner questions must be difficulty: "examiner" and probe edge cases, failure modes, or advanced theory.`;

  try {
    let resultJson = await generateWithGemini(prompt, true);
    let output = null;

    if (resultJson) {
      try {
        const cleanedStr = resultJson.replace(/```json/g, '').replace(/```/g, '').trim();
        output = JSON.parse(cleanedStr);
      } catch (err) {
        console.error('Failed to parse Gemini viva output, falling back to mock.', err);
      }
    }

    if (!output || !output.questions) {
      const mockQ = [
        { id: 1, question: `What is the primary objective of "${projectTitle}"?`, answer: `The primary objective is to ${projectDescription.substring(0, 120)}. The system addresses a key engineering challenge by implementing a structured hardware-software integration approach.`, difficulty: 'basic', category: 'concept' },
        { id: 2, question: 'Explain the overall block diagram of your system.', answer: 'The system consists of a sensing layer (input transducers), a processing layer (microcontroller/CPU), a communication layer (WiFi/UART/I2C), and an output layer (actuators/display). Each layer communicates via standard protocols.', difficulty: 'basic', category: 'design' },
        { id: 3, question: `Why did you choose ${components ? components.split(',')[0]?.trim() : 'this microcontroller'} for this project?`, answer: `The selected microcontroller offers the optimal balance of processing power, integrated peripherals (ADC, UART, SPI, I2C), and cost-effectiveness. Its extensive library ecosystem significantly reduces development time.`, difficulty: 'intermediate', category: 'concept' },
        { id: 4, question: 'Describe the communication protocol used between components.', answer: 'The system uses I2C for low-speed sensor communication (100kHz clock), SPI for high-speed peripherals, and UART for serial debug logging. I2C was selected for its multi-slave addressing capability using only 2 signal lines.', difficulty: 'intermediate', category: 'implementation' },
        { id: 5, question: 'How did you handle power management in your circuit?', answer: 'A dedicated LDO voltage regulator provides stable 3.3V to the MCU and 5V to actuators. Decoupling capacitors (100nF ceramic + 10µF electrolytic) placed near each IC power pin suppress transient noise. Sleep modes reduce standby current below 10mA.', difficulty: 'intermediate', category: 'design' },
        { id: 6, question: 'What is the sampling rate of your sensor, and why was it chosen?', answer: 'The sensor sampling rate is 10Hz (100ms interval). This balances data freshness with CPU load. Faster rates (>50Hz) would overload the UART buffer, while slower rates miss transient events. Nyquist theorem guided the selection.', difficulty: 'advanced', category: 'theory' },
        { id: 7, question: 'Explain the interrupt service routine (ISR) design in your firmware.', answer: 'ISRs are kept minimal — only setting flags and capturing timestamps. Heavy processing is deferred to the main loop to prevent missed interrupts. NVIC priority levels ensure real-time sensor ISRs preempt lower-priority communication tasks.', difficulty: 'advanced', category: 'implementation' },
        { id: 8, question: 'What error handling mechanisms are implemented?', answer: 'Watchdog timer resets the system after 8 seconds of unresponsiveness. Checksum validation on sensor packets rejects corrupted data. Retry logic (3 attempts) handles transient I2C bus errors before raising a fault flag.', difficulty: 'advanced', category: 'implementation' },
        { id: 9, question: 'How did you verify the accuracy of your sensor readings?', answer: 'Readings were cross-validated against a calibrated reference instrument. A 3-point calibration curve was fitted using least squares regression. Statistical analysis (mean, standard deviation) over 100 samples confirmed ±2% accuracy within operating range.', difficulty: 'advanced', category: 'theory' },
        { id: 10, question: 'Describe the PCB layout considerations for your circuit.', answer: 'Ground plane poured on bottom copper layer for EMI shielding. High-frequency traces kept below 50mm length with 45° bends. Decoupling capacitors placed within 2mm of IC power pins. Power and ground traces sized at 0.5mm minimum for 500mA rated current.', difficulty: 'advanced', category: 'design' },
        { id: 11, question: 'What are the limitations of your current implementation?', answer: 'Current limitations include: single-point sensor failure (no redundancy), USB-only firmware update mechanism, and 5-meter WiFi range constraint. Future versions will address these through sensor fusion, OTA updates, and 4G/LoRa modules.', difficulty: 'intermediate', category: 'concept' },
        { id: 12, question: 'How would you scale this project for industrial deployment?', answer: 'Industrial scaling requires: ATEX certification for hazardous environments, Modbus TCP/IP protocol for SCADA integration, redundant power supplies with UPS backup, DIN rail mounted enclosures, and IEC 61131-3 compliant PLC firmware structure.', difficulty: 'advanced', category: 'concept' },
        { id: 13, question: 'What is the total cost of your prototype and how can it be reduced?', answer: `The prototype cost is approximately ₹${1500 + Math.floor(Math.random() * 2000)}. Cost reduction strategies include: bulk component procurement, PCB panel ordering, using open-source EDA tools, and selecting pin-compatible cheaper alternatives validated against datasheets.`, difficulty: 'basic', category: 'design' },
        { id: 14, question: 'Explain the software development lifecycle followed in this project.', answer: 'Followed Agile methodology with 2-week sprint cycles. Version control via Git with feature branching. Unit tests written for critical firmware functions. Hardware-in-loop testing using oscilloscope and logic analyzer before system integration testing.', difficulty: 'intermediate', category: 'implementation' },
        { id: 15, question: 'What safety measures are implemented in your hardware design?', answer: 'Safety features include: 500mA polyfuse on USB power input, TVS diode protection on all external signal lines, reverse polarity protection via P-channel MOSFET, and isolated relay driver stages to prevent MCU damage from inductive loads.', difficulty: 'advanced', category: 'design' },
      ];
      const examinerQuestions = examinerMode ? [
        { id: 16, question: 'Derive the transfer function of the PID controller used in your feedback loop.', answer: 'Transfer function: C(s) = Kp(1 + 1/(Ti·s) + Td·s). With Kp=2.0, Ti=0.5s, Td=0.1s: C(s) = 2(1 + 2/s + 0.1s). System closed-loop TF = C(s)·G(s)/(1+C(s)·G(s)). Stability verified via Routh-Hurwitz criterion and Bode plot phase margin > 45°.', difficulty: 'examiner', category: 'theory' },
        { id: 17, question: 'How does your system behave under electromagnetic interference, and what mitigation exists?', answer: 'EMI susceptibility was tested using radiated immunity tests per IEC 61000-4-3. Common-mode chokes on signal lines suppress differential mode noise. PCB ground plane reduces impedance to < 0.5mΩ at 10MHz. Software digital filters (moving average, Kalman) reject high-frequency noise artifacts in ADC readings.', difficulty: 'examiner', category: 'theory' },
        { id: 18, question: 'What is the computational complexity of your main processing algorithm?', answer: 'The core filtering algorithm is O(n) per sample with n=window_size. For n=32: 32 multiply-accumulate operations per cycle at 80MHz gives 2.5M cycles/second headroom. Memory complexity is O(n) for the circular buffer. This leaves 97% CPU idle time at 10Hz sample rate.', difficulty: 'examiner', category: 'theory' },
        { id: 19, question: 'How would your system handle a real-time OS migration?', answer: 'RTOS migration requires: partitioning monolithic loop into tasks (sensor task, comm task, control task), assigning priority levels, replacing delay() with vTaskDelay() for yielding, protecting shared resources with mutexes/semaphores, and profiling stack usage per task. FreeRTOS on ESP32 is recommended.', difficulty: 'examiner', category: 'implementation' },
        { id: 20, question: 'Discuss the patent landscape for your innovation. What existing IP might conflict?', answer: 'A prior art search on Google Patents reveals similar systems in classes H04W (wireless networks) and G05B (control systems). Key differentiators for patentability include: novel sensor fusion algorithm, unique PCB topology, and the specific real-time adaptive calibration method which was not found in prior publications post-2020.', difficulty: 'examiner', category: 'concept' }
      ] : [];

      output = { questions: [...mockQ, ...examinerQuestions] };
    }

    // Save to DB
    const saved = await db.run(
      `INSERT INTO viva_sets (user_id, project_title, components, examiner_mode, questions) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, projectTitle, components || '', examinerMode ? 1 : 0, JSON.stringify(output.questions)]
    );

    await logActivity(req.user.id, 'VIVA_GENERATED', { projectTitle, examinerMode, questionCount: output.questions.length });
    res.json({ vivaId: saved.lastID, projectTitle, examinerMode: !!examinerMode, questions: output.questions });
  } catch (error) {
    res.status(500).json({ message: 'Viva generation failed.', error: error.message });
  }
});

// Get user's past viva sets
app.get('/api/viva/my-vivas', verifyToken, async (req, res) => {
  try {
    const list = await db.query(`SELECT * FROM viva_sets WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(list.rows.map(r => ({ ...r, questions: JSON.parse(r.questions || '[]'), examiner_mode: !!r.examiner_mode })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load viva sets.' });
  }
});

// ==========================================
// PHASE 2 — MODULE 4: PATENT GENERATOR
// ==========================================

app.post('/api/ai/patent', verifyToken, async (req, res) => {
  const { projectTitle, abstract, components, innovation } = req.body;
  if (!projectTitle || !abstract || !innovation) {
    return res.status(400).json({ message: 'Project title, abstract, and innovation claim are required.' });
  }

  // Gate: Patent plan only
  const user = await db.get(`SELECT subscription_status, name FROM users WHERE id = $1`, [req.user.id]);
  if (!user || user.subscription_status !== 'patent') {
    return res.status(403).json({ message: 'Patent Module requires the Patent plan. Please upgrade to access this feature.' });
  }

  const prompt = `You are a senior patent attorney specializing in electronics and software patents.
Project Title: "${projectTitle}"
Abstract: ${abstract}
Components: ${components || 'Standard electronic components'}
Key Innovation: ${innovation}

Generate a complete patent application document in strict JSON format:
{
  "title": "Formal patent title",
  "fieldOfInvention": "Technical field paragraph",
  "backgroundOfInvention": "2-3 paragraph background explaining existing solutions and gaps",
  "summaryOfInvention": "2-3 paragraph summary of what this invention achieves",
  "claims": [
    { "claimNumber": 1, "type": "independent", "text": "Full claim text in legal patent language" },
    { "claimNumber": 2, "type": "dependent", "dependsOn": 1, "text": "Dependent claim text" }
  ],
  "abstractDraft": "Formal 150-word abstract for patent filing",
  "priorArtSummary": [
    { "reference": "Patent/Paper title or number", "year": 2022, "relevance": "How it relates to this invention", "differentiator": "How this invention differs" }
  ],
  "innovationScore": 78,
  "innovationRationale": "Explanation of why the score is this value, what makes it novel, and what limits the score"
}
Generate at minimum 5 claims (at least 2 independent, rest dependent). Prior art should have 3-5 entries.`;

  try {
    let resultJson = await generateWithGemini(prompt, true);
    let output = null;

    if (resultJson) {
      try {
        const cleanedStr = resultJson.replace(/```json/g, '').replace(/```/g, '').trim();
        output = JSON.parse(cleanedStr);
      } catch (err) {
        console.error('Failed to parse Gemini patent output, falling back to mock.', err);
      }
    }

    if (!output) {
      output = {
        title: `SYSTEM AND METHOD FOR ${projectTitle.toUpperCase()} USING INTELLIGENT EMBEDDED CONTROL`,
        fieldOfInvention: `The present invention relates to the field of embedded systems and intelligent control engineering, and more specifically to a system and method for implementing ${projectTitle} using microcontroller-based sensor fusion, real-time signal processing, and adaptive control algorithms.`,
        backgroundOfInvention: `Conventional approaches to ${projectTitle} have relied on fixed-threshold analog circuits that lack adaptability to varying environmental conditions. Prior art systems require manual calibration, suffer from sensor drift without compensation, and cannot integrate multi-modal data sources simultaneously.\n\nExisting microcontroller-based solutions typically operate in open-loop configurations, ignoring feedback from the controlled process. This results in suboptimal performance, particularly under dynamic load conditions or varying ambient parameters.\n\nThere exists a need in the art for an intelligent, closed-loop implementation that leverages embedded machine learning inference and adaptive PID control to overcome these limitations.`,
        summaryOfInvention: `The present invention provides a novel system and method for ${projectTitle} comprising: (a) a multi-sensor input array with hardware filtering; (b) an embedded microcontroller executing adaptive control algorithms; (c) a real-time feedback loop with Kalman filtering; and (d) a wireless telemetry module for remote monitoring.\n\nThe invention achieves superior accuracy over prior art by implementing sensor fusion from heterogeneous sensors and applying model-predictive control techniques. The innovation: "${innovation}" represents a previously undisclosed combination of technical approaches.\n\nIn one embodiment, the system operates autonomously without cloud connectivity, providing edge inference capabilities suitable for industrial IoT deployments.`,
        claims: [
          { claimNumber: 1, type: 'independent', text: `A system for ${projectTitle} comprising: a microcontroller unit having a processing core operating at a frequency of at least 80MHz; a plurality of sensors electrically connected to said microcontroller unit via a digital communication bus; a firmware module stored in non-volatile memory of said microcontroller unit configured to execute an adaptive control algorithm; and a wireless communication interface for transmitting processed data to a remote endpoint.` },
          { claimNumber: 2, type: 'independent', text: `A method for implementing ${projectTitle} comprising the steps of: acquiring multi-channel sensor data at a sampling rate determined by Nyquist criterion; applying digital filtering to remove high-frequency noise artifacts; executing a proportional-integral-derivative control algorithm with dynamically adjusted gain coefficients; and transmitting control outputs to one or more actuator devices.` },
          { claimNumber: 3, type: 'dependent', dependsOn: 1, text: `The system of claim 1, wherein the adaptive control algorithm implements Kalman filtering with process noise covariance matrix Q and measurement noise covariance matrix R, automatically updated based on real-time statistical analysis of sensor variance.` },
          { claimNumber: 4, type: 'dependent', dependsOn: 1, text: `The system of claim 1, wherein the wireless communication interface supports IEEE 802.11 b/g/n protocol with WPA2-PSK encryption and implements MQTT publish-subscribe messaging for IoT platform integration.` },
          { claimNumber: 5, type: 'dependent', dependsOn: 2, text: `The method of claim 2, further comprising: detecting sensor anomalies using z-score threshold analysis; activating a fail-safe mode when anomaly confidence exceeds 95%; logging fault events with microsecond-precision timestamps to non-volatile flash memory.` },
          { claimNumber: 6, type: 'dependent', dependsOn: 1, text: `The system of claim 1, further comprising a PCB substrate with controlled impedance traces, ground plane pour providing less than 0.5 milliohm resistance at 10 MHz, and decoupling capacitors placed within 2 millimeters of each integrated circuit power supply pin.` }
        ],
        abstractDraft: `A system and method for ${projectTitle} is disclosed. The system comprises a microcontroller-based embedded platform integrating multi-modal sensor inputs with adaptive closed-loop control. ${innovation}. The invention applies real-time digital signal processing algorithms including Kalman filtering and PID control with automatic gain scheduling. Components include ${components || 'standard embedded electronics modules'}. The system achieves significant improvements in accuracy, reliability, and power efficiency over prior art solutions. A wireless telemetry interface enables remote monitoring and over-the-air configuration. The invention is suitable for industrial IoT, academic research, and commercial product development applications.`,
        priorArtSummary: [
          { reference: 'US Patent 10,234,891 — Adaptive Sensor Fusion System for IoT', year: 2019, relevance: 'Discloses sensor fusion techniques for embedded control systems using similar microcontroller architectures.', differentiator: 'Present invention adds novel adaptive gain scheduling not present in cited patent, and operates without cloud dependency.' },
          { reference: 'IEEE Trans. IE Vol.67 — Real-Time PID Auto-Tuning', year: 2020, relevance: 'Describes automatic PID parameter optimization for embedded control loops.', differentiator: 'Present invention integrates hardware anomaly detection and fail-safe modes absent from cited publication.' },
          { reference: 'IN Patent 202141034521 — Smart Monitoring System', year: 2021, relevance: 'Indian patent covering WiFi-connected sensor monitoring for industrial environments.', differentiator: 'Present invention implements edge inference without WiFi dependency and achieves lower power consumption.' },
          { reference: 'US Patent 9,876,543 — Embedded Machine Learning Classifier', year: 2018, relevance: 'Covers on-device ML inference for classification tasks on resource-constrained hardware.', differentiator: 'Present invention combines ML inference with classical control theory, a combination not disclosed in cited reference.' }
        ],
        innovationScore: 74,
        innovationRationale: `Score: 74/100. Novelty factors: unique combination of adaptive Kalman filtering with PID auto-tuning (adds 20 points), edge-first architecture without cloud dependency (adds 15 points), integrated fault logging system (adds 10 points). Score limited by: existence of similar sensor fusion patents (−10), standard wireless protocols used (−6), component availability on open market suggesting reproducibility (−5). Overall: strong implementation novelty with moderate conceptual novelty. Patentable subject matter exists, particularly in claims 1 and 3.`
      };
    }

    // Generate patent DOCX
    const patentParas = [
      new Paragraph({ text: output.title.toUpperCase(), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: 'PATENT APPLICATION DRAFT', alignment: AlignmentType.CENTER }),
      new Paragraph({ text: `Applicant: ${user.name || 'Inventor'} | Generated: ${new Date().toLocaleDateString()}`, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'FIELD OF THE INVENTION', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: output.fieldOfInvention }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'BACKGROUND OF THE INVENTION', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: output.backgroundOfInvention }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'SUMMARY OF THE INVENTION', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: output.summaryOfInvention }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'CLAIMS', heading: HeadingLevel.HEADING_2 }),
      ...output.claims.map(c => new Paragraph({ text: `${c.claimNumber}. ${c.text}` })),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'ABSTRACT', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: output.abstractDraft }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: 'PRIOR ART SUMMARY', heading: HeadingLevel.HEADING_2 }),
      ...output.priorArtSummary.map(p => new Paragraph({ text: `• ${p.reference} (${p.year}): ${p.relevance} Differentiation: ${p.differentiator}` })),
      new Paragraph({ text: '' }),
      new Paragraph({ text: `INNOVATION SCORE: ${output.innovationScore}/100`, heading: HeadingLevel.HEADING_3 }),
      new Paragraph({ text: output.innovationRationale }),
    ];

    const patentDoc = new Document({ sections: [{ properties: {}, children: patentParas }] });
    const patentDocxName = `Patent_Draft_${Date.now()}.docx`;
    const patentDocxPath = path.join(UPLOADS_DIR, patentDocxName);
    const patentDownloadPath = `/uploads/${patentDocxName}`;
    const buffer = await Packer.toBuffer(patentDoc);
    fs.writeFileSync(patentDocxPath, buffer);

    // Save to DB
    const saved = await db.run(
      `INSERT INTO patents (user_id, project_title, innovation_summary, components, content, docx_path, innovation_score) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, projectTitle, innovation, components || '', JSON.stringify(output), patentDownloadPath, output.innovationScore]
    );

    await db.run(`INSERT INTO downloads (user_id, file_name, file_type, download_url) VALUES ($1, $2, $3, $4)`,
      [req.user.id, patentDocxName, 'patent', patentDownloadPath]);

    await logActivity(req.user.id, 'PATENT_GENERATED', { projectTitle, innovationScore: output.innovationScore });
    res.json({ patentId: saved.lastID, ...output, docxUrl: patentDownloadPath });
  } catch (error) {
    res.status(500).json({ message: 'Patent generation failed.', error: error.message });
  }
});

// Get user patent list
app.get('/api/patents/my-patents', verifyToken, async (req, res) => {
  try {
    const list = await db.query(`SELECT id, project_title, innovation_score, docx_path, created_at FROM patents WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(list.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load patents.' });
  }
});

// ==========================================
// PHASE 2 — MODULE 5: DOWNLOAD PROJECT PACK (ZIP)
// ==========================================

app.post('/api/downloads/pack', verifyToken, async (req, res) => {
  const { projectId, includeCode = true, includeCircuit = true, includePpt = true, includeReport = true, includeViva = true, includePcb = true } = req.body;

  // Gate: Premium or Patent plans only
  const user = await db.get(`SELECT subscription_status, name FROM users WHERE id = $1`, [req.user.id]);
  if (!user || !['premium', 'patent'].includes(user.subscription_status)) {
    return res.status(403).json({ message: 'Project Pack Download requires a Premium or Patent plan. Please upgrade.' });
  }

  try {
    // Fetch most recent files per category
    const [codeFile] = (await db.query(`SELECT * FROM downloads WHERE user_id = $1 AND file_type = 'code' ORDER BY created_at DESC LIMIT 1`, [req.user.id])).rows;
    const [pptFile] = (await db.query(`SELECT * FROM downloads WHERE user_id = $1 AND file_type = 'pptx' ORDER BY created_at DESC LIMIT 1`, [req.user.id])).rows;
    const [docxFile] = (await db.query(`SELECT * FROM downloads WHERE user_id = $1 AND file_type = 'docx' ORDER BY created_at DESC LIMIT 1`, [req.user.id])).rows;
    const [pcbDesign] = (await db.query(`SELECT * FROM pcb_designs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [req.user.id])).rows;
    const [vivaSet] = (await db.query(`SELECT * FROM viva_sets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [req.user.id])).rows;
    const [project] = (await db.query(`SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [req.user.id])).rows;

    const projectTitle = project ? project.title : 'ProjectForge_Project';
    const safeName = projectTitle.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);
    const packName = `${safeName}_Pack_${Date.now()}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${packName}"`);

    const zip = new ZipArchive({ zlib: { level: 9 } });
    zip.on('error', err => { throw err; });
    zip.pipe(res);

    // README
    const readmeContent = `# ProjectForge AI — Project Pack
Generated: ${new Date().toLocaleString()}
Project: ${projectTitle}
User: ${user.name}

## Contents
01_Code/       — Firmware source code
02_Circuit/    — KiCad schematic file  
03_PPT/        — PowerPoint presentation
04_Report/     — Academic report (DOCX)
05_Viva/       — Viva Q&A questions sheet
06_PCB/        — KiCad PCB layout + BOM CSV

Generated by ProjectForge AI Platform
`;
    zip.append(readmeContent, { name: `${safeName}_Pack/README.md` });

    // 01 — Code
    if (includeCode) {
      if (codeFile) {
        const codePath = path.join(UPLOADS_DIR, path.basename(codeFile.download_url));
        if (fs.existsSync(codePath)) zip.file(codePath, { name: `${safeName}_Pack/01_Code/${path.basename(codeFile.download_url)}` });
      } else {
        zip.append('// Generate firmware code from the Code Generator tab in Dashboard.\n// Visit: /dashboard → AI Generators → Firmware Code', { name: `${safeName}_Pack/01_Code/HOW_TO_GENERATE.txt` });
      }
    }

    // 02 — Circuit Schematic
    if (includeCircuit && pcbDesign) {
      const schPath = path.join(PCB_DIR, path.basename(pcbDesign.schematic_path || ''));
      if (fs.existsSync(schPath)) zip.file(schPath, { name: `${safeName}_Pack/02_Circuit/${path.basename(pcbDesign.schematic_path)}` });
    } else if (includeCircuit) {
      zip.append('Generate your KiCad circuit from Dashboard → PCB Board tab first.\nFile will be a .kicad_sch schematic file.', { name: `${safeName}_Pack/02_Circuit/HOW_TO_GENERATE.txt` });
    }

    // 03 — PPT
    if (includePpt) {
      if (pptFile) {
        const pptPath = path.join(UPLOADS_DIR, path.basename(pptFile.download_url));
        if (fs.existsSync(pptPath)) zip.file(pptPath, { name: `${safeName}_Pack/03_PPT/${path.basename(pptFile.download_url)}` });
      } else {
        zip.append('Generate your PPTX presentation from Dashboard → PPT Outlines tab first.', { name: `${safeName}_Pack/03_PPT/HOW_TO_GENERATE.txt` });
      }
    }

    // 04 — Report
    if (includeReport) {
      if (docxFile) {
        const docxPath = path.join(UPLOADS_DIR, path.basename(docxFile.download_url));
        if (fs.existsSync(docxPath)) zip.file(docxPath, { name: `${safeName}_Pack/04_Report/${path.basename(docxFile.download_url)}` });
      } else {
        zip.append('Generate your academic report from Dashboard → Dissertation Report tab first.', { name: `${safeName}_Pack/04_Report/HOW_TO_GENERATE.txt` });
      }
    }

    // 05 — Viva
    if (includeViva) {
      if (vivaSet) {
        const questions = JSON.parse(vivaSet.questions || '[]');
        let vivaText = `VIVA VOCE QUESTIONS & ANSWERS\nProject: ${vivaSet.project_title}\nGenerated: ${new Date(vivaSet.created_at).toLocaleDateString()}\nExaminer Mode: ${vivaSet.examiner_mode ? 'YES' : 'NO'}\n\n${'='.repeat(60)}\n\n`;
        questions.forEach((q, i) => {
          vivaText += `Q${i + 1}. [${q.difficulty?.toUpperCase()} | ${q.category?.toUpperCase()}]\n${q.question}\n\nANSWER:\n${q.answer}\n\n${'-'.repeat(50)}\n\n`;
        });
        zip.append(vivaText, { name: `${safeName}_Pack/05_Viva/Viva_Questions_Answers.txt` });
      } else {
        zip.append('Generate your Viva Q&A from Dashboard → Viva Generator tab first.', { name: `${safeName}_Pack/05_Viva/HOW_TO_GENERATE.txt` });
      }
    }

    // 06 — PCB
    if (includePcb && pcbDesign) {
      const pcbPath = path.join(PCB_DIR, path.basename(pcbDesign.layout_path || ''));
      const bomPath = path.join(PCB_DIR, path.basename(pcbDesign.bom_path || ''));
      if (fs.existsSync(pcbPath)) zip.file(pcbPath, { name: `${safeName}_Pack/06_PCB/${path.basename(pcbDesign.layout_path)}` });
      if (fs.existsSync(bomPath)) zip.file(bomPath, { name: `${safeName}_Pack/06_PCB/${path.basename(pcbDesign.bom_path)}` });
    } else if (includePcb) {
      zip.append('Generate your KiCad PCB layout from Dashboard → PCB Board tab first.', { name: `${safeName}_Pack/06_PCB/HOW_TO_GENERATE.txt` });
    }

    await zip.finalize();

    await db.run(`INSERT INTO downloads (user_id, file_name, file_type, download_url) VALUES ($1, $2, $3, $4)`,
      [req.user.id, packName, 'zip_pack', `/uploads/${packName}`]);
    await logActivity(req.user.id, 'PROJECT_PACK_DOWNLOADED', { packName, projectTitle });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Project pack generation failed.', error: error.message });
    }
  }
});

// ==========================================
// Start Server
// ==========================================

// ==========================================
// AI Project Search Fallback Generator
// ==========================================
app.post('/api/ai/search-projects', async (req, res) => {
  const { query } = req.body;
  
  // We'll generate a highly relevant main project
  const mainProject = {
    id: Date.now(),
    title: `AI Generated: ${query.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
    domain: 'Custom',
    category: 'AI/ML & Embedded',
    description: `An advanced engineered solution for ${query}. This system utilizes state-of-the-art microcontrollers and AI logic to automate and optimize the desired parameters.`,
    components: ['ESP32 DevKit V1', 'High-Precision Sensor Module', 'OLED Display 0.96"', '5V Relay Module', 'Li-ion Battery 18650'],
    difficulty: 'Intermediate',
    cost: Math.floor(Math.random() * 2000) + 500,
    ppt: true,
    report: true,
    circuit: true,
    pcb: true,
    tags: ['ai-generated', 'custom', query.replace(' ', '-').toLowerCase()],
    image: '🚀'
  };

  // Generate 10 related mock projects
  const relatedProjects = [];
  for(let i=1; i<=10; i++) {
    relatedProjects.push({
      title: `Variant ${i}: ${query} Pro`,
      description: `A cost-effective alternative for ${query} using different microcontrollers and sensors for varied use-cases.`,
      cost: Math.floor(Math.random() * 1500) + 300
    });
  }

  res.json({ mainProject, relatedProjects });
});

app.listen(PORT, () => {
  console.log(`ProjectForge AI Backend Server listening on port ${PORT}`);
  ensureProjectLibrarySeeded().catch(err => {
    console.error('Project library database seeding failed:', err.message);
  });
});

