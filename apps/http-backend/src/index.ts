import express from "express";
import jwt from 'jsonwebtoken' ;
import {JWT_SECRET} from "@repo/backend-common/config" ;
import { middleware } from "./middleware";
import {CreateUserSchema , SigninSchema} from "@repo/common/types";

const app = express();

app.post("/signup", (req, res) => {

  // add a db 
  const data = CreateUserSchema.safeParse(req.body);
  if(!data.success ){
      return res.json({
        message : "Incorrect information"
      })
  }


  const { email, password } = req.body;
  console.log(email, password);
  res.status(200).json({ message: "User created successfully" });
});

app.post("/signin", (req , res) => {

  const { userId } = req.body;  

  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  const token = jwt.sign(

    { userId },     // payload
    JWT_SECRET      // secret
  );

  res.json({
    token
  })
  
});

app.post("/room" , middleware , (req , res) => {


  res.json({
    roomid : 123
  })
  
});

app.listen(3000, () => {
  console.log("HTTP server is running on port 3000");
});
