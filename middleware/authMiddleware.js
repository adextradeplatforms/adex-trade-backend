// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Protect routes (requires login)
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    try {
      // Extract token
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request
      req.user = await User.findById(decoded.id).select(
        "-password"
      );

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (req.user.isBlocked) {
        return res.status(403).json({ message: "Account is blocked" });
      }

      next();
    } catch (error) {
      console.error("Auth error:", error.message);
      return res.status(401).json({ message: "Not authorized" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Admin only
export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Admin access only" });
};
