export {};

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}


// Every Express request has a userId once middleware runs.