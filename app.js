//calling the dependencies
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cors = require("cors");
// const twilio = require("twilio");
const path = require("path");
const ejs = require("ejs");
require("dotenv").config();

//initialize express app
const app = express();
const port = process.env.PORT || 4000;

//connecting the middleware (using CORS)

// Enable CORS (middleware that joins frontend to backend ) for all requests
app.use(cors());
app.use(
  cors({
    origin: "http://localhost:4000", // Allow frontend to access API
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// locate static files in the 'public' directory
app.use("/public", express.static(path.join(__dirname, "public")));

// render ejs as engine
app.set("view engine", "ejs");

//connect to mongoDB
mongoose.connect(process.env.MONGODB_URI);

//database connection
mongoose.connection.on("connected", () => {
  console.log("DB connected");
});

//setting the Models
//the user schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

//setting up 'MEAL' schema
const mealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: String,
  category: String,
  nutriScore: Number,
  rating: Number,
  reviews: Number,
  description: String,
});

//setting up 'ORDER' schema
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  meals: [
    {
      mealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Meal",
        required: true,
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  total: { type: Number, required: true },
  status: { type: String, default: "pending" }, // ✅ Default status
  createdAt: { type: Date, default: Date.now }, // ✅ Default timestamp
});

//setting up the Models
const User = mongoose.model("User", userSchema);
const Meal = mongoose.model("Meal", mealSchema);
const Order = mongoose.model("Order", orderSchema);

//setting up Notifications

//calling nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );
async function sendNotifications(user, subject, message) {
  try {
    //send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Welcome",
      text: message,
    });

    //send SMS
    // await twilioClient.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: user.phone,
    // });
  } catch (error) {
    console.error("Notification error:", error);
  }
}

//navigating to route

//getting home page
app.get("/", (req, res) => {
  res.render("index");
});

//setting up the registration
app.post("/api/register", async (req, res) => {
  console.log("Received registration request:", req.body);
  try {
    const { name, email, password } = req.body;
    //to check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    //to hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //to create users
    const user = new User({
      name,
      email,
      password: hashedPassword,
      // phone,
    });
    await user.save();

    //send welcome notification
    await sendNotifications(
      user,
      "Welcome to Omni food",
      `welcome ${name},thank you for eating with omni food`
    );
    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

//the login form
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "server error" });
  }
});

//Authenticating the middleware( ensuring only logged in users can place an order)
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    console.log("Received token:", token); // Adding this for debugging
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findOne({ _id: decoded.userId });
    if (!req.user) {
      throw new Error();
    }
    next();
  } catch (error) {
    console.error("Auth error:", error); // Adding this for debugging
    res.status(401).json({ message: "Please authenticate" });
  }
};

//getting the meals route
app.get("/api/meals", async (req, res) => {
  try {
    const meals = await Meal.find();
    res.json(meals);
  } catch (error) {
    res.status(500).json({ message: "server error" });
  }
});

//create Order route

app.post("/api/orders", auth, async (req, res) => {
  try {
    const { meals } = req.body;
    console.log("Request body:", req.body);
    console.log("Authenticated user:", req.user);

    // Validating that each meal has a mealId
    if (!meals.every((meal) => meal.mealId)) {
      return res.status(400).json({ message: "Each meal must have a mealId" });
    }

    const order = new Order({
      userId: req.user._id,
      meals,
      total: meals.reduce((sum, meal) => sum + meal.price * meal.quantity, 0),
    });

    await order.save();

    // Send order confirmation
    await sendNotifications(
      req.user,
      "Order Confirmation",
      `Your order #${order._id} has been placed successfully! Total: ₦${order.total}`
    );

    res.status(201).json({ order });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//to get the order route
app.get("/api/order", auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate("meals.mealId")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "server error" });
  }
});

//initializing the sample meals( jollof rice, semo, porridge)
async function initializeMeals() {
  const meals = [
    {
      name: "Sweet Potato Porridge",
      price: 3000,
      category: "Vegetarian",
      nutriScore: 84,
      rating: 4.9,
      reviews: 537,
      image: "/public/img/Sweet-Potato-Porridge-recipe-photo-1.jpg",
    },
    {
      name: "Jollof Rice & Chicken",
      price: 4000,
      category: "Meatarian",
      nutriScore: 72,
      rating: 5.0,
      reviews: 987,
      image: "/public/img/nigerian-food-01-1024x640.jpg.webp",
    },
    {
      name: "Semovita",
      price: 3000,
      category: "Swallow",
      nutriScore: 70,
      rating: 4.7,
      reviews: 663,
      image: "/public/img/semolina.jpg",
    },
  ];
  try {
    await Meal.insertMany(meals);
    console.log("Sample meals initialized");
  } catch (error) {
    console.error("Error initializing meals:", error);
  }
}

//running the port
app.listen(port, () => {
  console.log(`server running on port ${port}`);
  initializeMeals();
});
