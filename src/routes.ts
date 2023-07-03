// routes.ts
import { Request, Response } from "express";
import { IdentifyRequest } from "./models";
import { getClient } from "./db";

export const initDataBase = async (_: any, res: Response) => {
  try {
    await createTable();
    await insertData();
    res.status(200).json({ message: "Database Intitiated" });
  } catch (error) {
    console.error("Error:", error);
    res.status(404).json({ message: "Error" });
  }
};

export const identify = async (req: Request, res: Response) => {
  const { email, phoneNumber }: IdentifyRequest = req.body;
  try {
    const client = getClient();

    let query = `
      SELECT *
        FROM contacts
    `;
    const values = [];

    if (email !== undefined) {
      query += `
        WHERE email = $1
      `;
      values.push(email);
    }

    if (phoneNumber !== undefined) {
      if (email) {
        query += `
          OR phoneNumber = $2
        `;
      } else {
        query += `
          WHERE phoneNumber = $1
        `;
      }
      values.push(phoneNumber);
    }

    const result = await client.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error:", error);
    res.status(404).json({ message: "Error" });
  }
};

export const createTable = async () => {
  try {
    const client = getClient();

    const query = `
      CREATE TABLE contacts (
        id SERIAL PRIMARY KEY,
        phoneNumber VARCHAR(255),
        email VARCHAR(255),
        linkedId INTEGER,
        linkPrecedence VARCHAR(10),
        createdAt TIMESTAMPTZ DEFAULT current_timestamp,
        updatedAt TIMESTAMPTZ DEFAULT current_timestamp,
        deletedAt TIMESTAMPTZ,
        FOREIGN KEY (linkedId) REFERENCES contacts (id)
      );
    `;

    await client.query(query);

    console.log("Table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
    throw error;
  }
};

export const insertData = async () => {
  try {
    const client = getClient();

    const query = `
      INSERT INTO contacts (phoneNumber, email, linkedId, linkPrecedence) VALUES
        ('1234567890', 'aravind@gmail.com', NULL, 'primary'),
        ('1234567890', 'araviindm@gmail.com', 1, 'secondary');
    `;

    await client.query(query);

    console.log("Data inserted successfully");
  } catch (error) {
    console.error("Error inserting data:", error);
    throw error;
  }
};
