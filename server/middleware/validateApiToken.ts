import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { verifyApiToken } from "../utils/apiToken";

export async function validateApiToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const connectionId = req.body.connection_id || req.params.connection_id || req.query.connection_id as string;
    
    if (!connectionId) {
      return res.status(400).json({ 
        error: "connection_id is required" 
      });
    }

    const connection = await storage.getConnection(connectionId);
    
    if (!connection) {
      return res.status(404).json({ 
        error: "Connection not found" 
      });
    }

    if (!connection.apiToken) {
      next();
      return;
    }

    const providedToken = req.headers["x-api-token"] as string || req.headers["authorization"]?.replace("Bearer ", "");
    
    if (!providedToken) {
      return res.status(401).json({ 
        error: "API token required. Please provide X-API-Token header or Authorization: Bearer <token>" 
      });
    }

    const isValid = verifyApiToken(providedToken, connection.apiToken);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: "Invalid API token" 
      });
    }

    next();
  } catch (error) {
    console.error("Error validating API token:", error);
    res.status(500).json({ 
      error: "Internal server error during token validation" 
    });
  }
}
