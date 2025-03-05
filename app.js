const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const nodemailer = require("nodemailer");


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;



// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000 
})
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas');
    // await createPredefinedUsers(); // Ensure users are created only after DB connection
  })
  .catch(err => console.error('🚨 MongoDB connection error:', err));




// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false}
}));

// Middleware to make `user` available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? { username: req.session.username, role: req.session.role } : null;
  next();
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// User Schema
const userSchema = new mongoose.Schema({
  matricNumber: { type: String, unique: true, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  courseOfStudy: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin', 'security'], default: 'student' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);


// Password Reset Token Schema
const passwordResetTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);


// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});



// Report Schema
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ["Theft", "Assault", "Suspicious Activity", "Other"], default: "Other" },
  imageUrl: { type: String },
  status: { type: String, enum: ["Pending", "Addressed"], default: "Pending" },
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false },  // NEW FIELD
  deletedAt: { type: Date, default: null }     // NEW FIELD
});

const Report = mongoose.model('Report', reportSchema);


// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Report", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  feedback: { 
    type: String, 
    enum: ["Good", "Amazing", "Bad", "No Response", "Really Bad"], 
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);


// Add predefined users (run this once)
const createPredefinedUsers = async () => {
  try {
    console.log("🔄 Checking predefined users...");

    // Ensure MongoDB is connected before running queries
    await mongoose.connection.db.admin().ping();

    // Check if admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123", 10);
      await User.create({
        matricNumber: "admin123",
        firstName: "Admin",
        lastName: "User",
        email: "juliaaderemi@gmail.com",
        courseOfStudy: "N/A",
        password: hashedPassword,
        role: "admin"
      });
      console.log("✅ Admin user created");
    } else {
      console.log("ℹ️ Admin user already exists");
    }

    // Check if security user exists
    const securityExists = await User.findOne({ role: 'security' });
    if (!securityExists) {
      const hashedPassword = await bcrypt.hash(process.env.SECURITY_PASSWORD || "Security@123", 10);
      await User.create({
        matricNumber: "security123",
        firstName: "Security",
        lastName: "Officer",
        email: "aderemij1493@student.babcock.edu.ng",
        courseOfStudy: "N/A",
        password: hashedPassword,
        role: "security"
      });
      console.log("✅ Security user created");
    } else {
      console.log("ℹ️ Security user already exists");
    }

  } catch (error) {
    console.error("🚨 Error creating predefined users:", error);
    setTimeout(createPredefinedUsers, 5000); // Retry after 5 seconds
  }
};
// createPredefinedUsers();



// Auto-Categorization Function
const categorizeIncident = (description) => {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes("stolen") || lowerDesc.includes("robbery") || lowerDesc.includes("theft")) {
    return "Theft";
  }
  if (lowerDesc.includes("assault") || lowerDesc.includes("attack") || lowerDesc.includes("violence")) {
    return "Assault";
  }
  if (lowerDesc.includes("suspicious") || lowerDesc.includes("strange") || lowerDesc.includes("unknown person")) {
    return "Suspicious Activity";
  }
  return "Other";
};



// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // For development environments
  }
});

// Function to send notification emails
const sendNotification = async (recipient, subject, message) => {
  try {
    await transporter.sendMail({
      from: `"Campus Security" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject,
      text: message.replace(/<\/?[^>]+(>|$)/g, ""), // Convert to plain text for compatibility
      html: message // Use HTML for better formatting
    });

    console.log(`✅ Email sent to: ${recipient}`);
  } catch (error) {
    console.error(`🚨 Failed to send email to ${recipient}:`, error);
  }
};




// Routes
app.get('/', (req, res) => {
  res.render('home');
});


const ensureAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
};



app.get('/login', (req, res) => {
  res.render('login');
});

// Login Route
app.post('/login', async (req, res) => {
  const { matricNumber, password } = req.body;

  try {
    let user;

    // Check if user is admin or security (they log in with username)
    if (matricNumber === process.env.ADMIN_USERNAME || matricNumber === process.env.SECURITY_USERNAME) {
      user = await User.findOne({ username: matricNumber });
    } else {
      // Otherwise, log in students with matric number
      user = await User.findOne({ matricNumber });
    }

    if (!user) {
      const errorMsg = `🚨 User not found: ${matricNumber}\n`;
      fs.appendFileSync('error.log', errorMsg);
      return res.status(400).send("User not found. Please check your login details.");
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      const errorMsg = `🚨 Incorrect password attempt for: ${matricNumber}\n`;
      fs.appendFileSync('error.log', errorMsg);
      return res.status(400).send("Incorrect password. Please try again.");
    }

    // Set session
    req.session.userId = user._id;
    req.session.username = user.firstName;
    req.session.role = user.role;

    console.log(`✅ Logged in: ${user.firstName} (${user.matricNumber})`);
    
       // Redirect based on role
       if (user.role === "admin") {
        return res.redirect("/admin-dashboard");
      } else if (user.role === "security") {
        return res.redirect("/security-dashboard");
      } else {
        return res.redirect("/dashboard");
      }

  } catch (error) {
    const errorMsg = `🚨 Login Error: ${error.message}\n`;
    fs.appendFileSync('error.log', errorMsg);
    res.status(500).send("Server error during login.");
  }
});




  // Show Password Reset Request Form
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

// Handle Password Reset Request
app.post('/forgot-password', async (req, res) => {
  const { matricNumber } = req.body;

  try {
    const user = await User.findOne({ matricNumber });
    if (!user) {
      return res.status(400).send("User not found.");
    }

    // Generate reset token
    const token = Math.random().toString(36).slice(2);
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Save token
    await PasswordResetToken.create({ userId: user._id, token, expiresAt });

    // Send email with reset link
    const resetLink = `http://localhost:3000/reset-password/${token}`;
    const subject = "Password Reset Request";
    const message = `Hello ${user.firstName},\n\nPlease click the link below to reset your password:\n\n${resetLink}\n\nThis link is valid for 1 hour.`;

    await sendNotification(user.email, subject, message);

    res.send(`Password reset link sent to ${user.email}`);
  } catch (error) {
    console.error("Error handling password reset request:", error);
    res.status(500).send("Server error.");
  }
});



// Show Reset Password Form
app.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const resetToken = await PasswordResetToken.findOne({ token });
    if (!resetToken || resetToken.expiresAt < new Date()) {
      return res.status(400).send("Invalid or expired token.");
    }

    res.render('reset-password', { token });
  } catch (error) {
    console.error("Error loading reset form:", error);
    res.status(500).send("Server error.");
  }
});



// Handle Password Reset
app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const resetToken = await PasswordResetToken.findOne({ token });
    if (!resetToken || resetToken.expiresAt < new Date()) {
      return res.status(400).send("Invalid or expired token.");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(resetToken.userId, { password: hashedPassword });

    // Delete the token after use
    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    res.send("Password has been reset. You can now log in with your new password.");
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).send("Server error.");
  }
});






app.get('/register', (req, res) => {
  res.render('register');
});

// Updated Registration Route
app.post('/register', async (req, res) => {
  const { matricNumber, firstName, lastName, email, courseOfStudy, password } = req.body;

  // Basic Server-Side Validation
  if (!matricNumber || !firstName || !lastName || !email || !courseOfStudy || !password) {
    return res.status(400).send("All fields are required.");
  }

  // Validate password strength
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!passwordPattern.test(password)) {
    return res.status(400).send("Password does not meet strength requirements.");
  }

  try {
    // Check if matric number already exists
    const existingUser = await User.findOne({ matricNumber });
    if (existingUser) {
      return res.status(400).send("Matric number already exists.");
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).send("Email already in use.");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      matricNumber,
      firstName,
      lastName,
      email,
      courseOfStudy,
      password: hashedPassword
    });

    await newUser.save();

    // Log the user in automatically
    req.session.userId = newUser._id;
    req.session.username = newUser.firstName;
    req.session.role = newUser.role;

    res.redirect('/dashboard');
  } catch (error) {
    console.error("🚨 Error during registration:", error.message);
    res.status(500).send("Server error during registration.");
  }
});



// Student Dashboard - View Own Reports
app.get("/dashboard", ensureAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    // Only show incidents that haven't been deleted
    const reports = await Report.find({ userId: req.session.userId, deleted: false })
                                  .select("description category status createdAt imageUrl deleted deletedAt");
    res.render("dashboard", { user: req.session, reports });
  } catch (error) {
    console.error("🚨 Error loading dashboard:", error);
    res.status(500).send("Failed to load dashboard.");
  }
});


// Emergency Contacts Route
app.get("/emergency-contacts", ensureAuthenticated, (req, res) => {
  const emergencyContacts = [
    { name: "Campus Security", phone: "555-123-4567", email: "security@campus.com" },
    { name: "Fire Department", phone: "555-987-6543", email: "fire@city.com" },
    { name: "Medical Emergency", phone: "555-222-3333", email: "medical@hospital.com" },
    { name: "Police Department", phone: "555-911-0000", email: "police@city.com" }
  ];

  res.render("emergency-contacts", { emergencyContacts });
});



// Send Emergency Message
app.post('/send-emergency-message', ensureAuthenticated, async (req, res) => {
  const { email, message } = req.body;

  // Placeholder logic for sending a message (e.g., via email)
  console.log(`Message sent to ${email}: ${message}`);
  res.send(`Your message has been sent to ${email}`);
});



// Incident Report route

app.get('/report', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('report');
});


app.post("/report", upload.single("image"), ensureAuthenticated, async (req, res) => {
  try {
    const { description } = req.body;
    const imageUrl = req.file ? "/images/uploads/" + req.file.filename : null;
    
    // Auto-categorize based on description
    const category = categorizeIncident(description);

    const newReport = new Report({
      userId: req.session.userId,
      description,
      category,
      imageUrl,
    });

    await newReport.save();


    app.post("/report", upload.single("image"), ensureAuthenticated, async (req, res) => {
      try {
        const { description } = req.body;
        const imageUrl = req.file ? "/images/uploads/" + req.file.filename : null;
    
        // Auto-categorize based on description
        const category = categorizeIncident(description);
    
        // Save the new report
        const newReport = new Report({
          userId: req.session.userId,
          description,
          category,
          imageUrl,
        });
    
        await newReport.save();
    
        // ✅ Fetch Admin & Security Users
        const adminSecurityUsers = await User.find({ role: { $in: ["admin", "security"] } });
        const adminSecurityEmails = adminSecurityUsers.map(user => user.email);
    
        if (adminSecurityEmails.length > 0) {
          // ✅ Send email alert
          const subject = "🚨 New Campus Security Incident Reported!";
          const message = `
            <h2>📢 A new incident has been reported!</h2>
            <ul>
              <li>🔹 <b>Category:</b> ${category}</li>
              <li>🔹 <b>Description:</b> ${description}</li>
              <li>🔹 <b>Status:</b> Pending</li>
              ${imageUrl ? `<li>🖼️ <b>Image:</b> <a href="https://yourherokuapp.com${imageUrl}">View Image</a></li>` : ""}
              <li>📅 <b>Time:</b> ${new Date().toLocaleString()}</li>
            </ul>
            <p>👉 <b>Login to view the report:</b> <a href="https://yourherokuapp.com/admin-dashboard">Admin Dashboard</a></p>
          `;
    
          await sendNotification(adminSecurityEmails.join(","), subject, message);
          console.log(`📩 Alert sent to: ${adminSecurityEmails.join(", ")}`);
        }
    
        res.redirect("/dashboard");
      } catch (error) {
        console.error("🚨 Error submitting report:", error);
        res.status(500).send("Error submitting report");
      }
    });
    

    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).send("Error submitting report");
  }
});



// Submit Feedback (Only for Addressed Incidents)
app.post('/submit-feedback/:incidentId', ensureAuthenticated, async (req, res) => {
  const { incidentId } = req.params;
  const { feedback } = req.body;

  try {
    // Check if the report is addressed
    const report = await Report.findById(incidentId);
    if (!report || report.status !== "Addressed") {
      return res.status(400).send("You can only give feedback for addressed incidents.");
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ incidentId, userId: req.session.userId });
    if (existingFeedback) {
      return res.status(400).send("You have already submitted feedback for this incident.");
    }

    // Save new feedback
    const newFeedback = new Feedback({
      incidentId,
      userId: req.session.userId,
      feedback
    });

    await newFeedback.save();
    res.redirect('/dashboard');
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).send("Internal Server Error");
  }
});




// Admin Dashboard - View All Reports


app.get("/admin-dashboard", ensureAuthenticated, async (req, res) => {
  if (req.session.role !== "admin") {
    return res.status(403).send("Unauthorized");
  }

  try {
    // Get all reports and populate with user matric numbers
    const reports = await Report.find().populate("userId", "matricNumber")
                    .select("description category status createdAt imageUrl deleted deletedAt");

    // Count statistics
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: "Pending" });
    const addressedReports = await Report.countDocuments({ status: "Addressed" });

    // Reports per user (with matric numbers)
    const reportsByUser = await Report.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $group: {
          _id: "$userDetails.matricNumber",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Reports per day (last 7 days)
    const reportsPerDay = await Report.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ]);

    // Feedback summary
    const feedbackOptions = ["Amazing", "Good", "Bad", "No Response", "Really Bad"];

    // Fetch existing feedback counts
    const rawFeedbackSummary = await Feedback.aggregate([
      {
        $group: {
          _id: "$feedback",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Create a complete feedback summary (fill missing categories with 0)
    const feedbackMap = rawFeedbackSummary.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    const feedbackSummary = feedbackOptions.map(option => ({
      _id: option,
      count: feedbackMap[option] || 0
    }));
    

    res.render("admin-dashboard", {
      user: req.session,
      reports,
      totalReports,
      pendingReports,
      addressedReports,
      reportsByUser,
      reportsPerDay,
      feedbackSummary
    });
  } catch (error) {
    console.error("🚨 Error loading admin dashboard:", error);
    res.status(500).send("Failed to load admin dashboard.");
  }
});




// Security Dashboard - View All Reports
app.get("/security-dashboard", ensureAuthenticated, async (req, res) => {
  if (req.session.role !== "security") {
    return res.status(403).send("Unauthorized");
  }

  try {
    const reports = await Report.find().populate("userId", "matricNumber");
    res.render("security-dashboard", { reports });
  }  catch (error) {
    console.error("🚨 Error loading security dashboard:", error);
    res.status(500).send("Failed to load security dashboard.");
  }
});

// Update Report Status (Security Only)
app.post("/security/report/:id/status", ensureAuthenticated, async (req, res) => {
  if (req.session.role !== "security") {
    return res.status(403).send("Unauthorized");
  }

  try {
    const { status } = req.body;
    await Report.findByIdAndUpdate(req.params.id, { status });
    res.redirect("/security-dashboard");
  } catch (error) {
    res.status(500).send("Error updating report status");
  }
});




// Soft Delete Incident (User Only)
app.post('/delete-incident/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;

  try {
    // Find and update the report
    const report = await Report.findById(id);

    // Check if report exists and belongs to the current user
    if (!report || report.userId.toString() !== req.session.userId) {
      return res.status(403).send("Unauthorized to delete this incident.");
    }

    // Soft delete the incident
    report.deleted = true;
    report.deletedAt = new Date();
    await report.save();

    console.log(`🗑️ Incident ${id} deleted by user ${req.session.username}`);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("🚨 Error deleting incident:", error);
    res.status(500).send("Failed to delete incident.");
  }
});



















app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});




// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});