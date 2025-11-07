import { Request, Response, NextFunction } from "express";
import { JWT_SECRET } from "@repo/backend-common/config";
import jwt from "jsonwebtoken";


export function middleware(req: Request, res: Response, next: NextFunction) {

  const token = req.headers["authorization"] ?? "" ;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // fixing the request object ...
    (req as any).user = decoded;
  next();

  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}