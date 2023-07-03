// routes.ts
import { Request, Response } from "express";
import { Contact, IdentifyRequest } from "./models";
import { getClient } from "./db";

export const identify = async (
  req: Request<{}, {}, IdentifyRequest>,
  res: Response
) => {
  try {
    const { email, phoneNumber }: IdentifyRequest = req.body;
    const client = getClient();
    let query = `
      SELECT *
        FROM "contacts"
    `;
    const values = [];

    if (email) {
      query += `
        WHERE "email" = $1
      `;
      values.push(email);
    }

    if (phoneNumber) {
      if (email) {
        query += `
          OR "phoneNumber" = $2
        `;
      } else {
        query += `
          WHERE "phoneNumber" = $1
        `;
      }
      values.push(phoneNumber);
    }
    const result = await client.query<Contact>(query, values);
    const contacts = result.rows;
    if (contacts.length === 0) {
      // Create a new primary contact
      const insertQuery = `
        INSERT INTO "contacts" ("email", "phoneNumber", "linkedId", "linkPrecedence", "createdAt", "updatedAt", "deletedAt")
        VALUES ($1, $2, NULL, 'primary', NOW(), NOW(), NULL)
        RETURNING "id"
      `;
      const insertValues = [email, phoneNumber];
      const insertResult = await client.query<Contact>(
        insertQuery,
        insertValues
      );
      const newPrimaryContactId = insertResult.rows[0].id;

      const response = {
        contact: {
          primaryContactId: newPrimaryContactId,
          emails: [email],
          phoneNumbers: [phoneNumber],
          secondaryContactIds: [],
        },
      };

      res.status(200).json(response);
    } else {
      const response = {
        contact: {
          primaryContactId: "",
          emails: "",
          phoneNumbers: "",
          secondaryContactIds: [],
        },
      };
      res.status(200).json(response);
    }
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: "An error occurred" });
  }
};

export const initDataBase = async (_: any, res: Response) => {
  // try {
  //   await createTable();
  //   await insertData();
  //   res.status(200).json({ message: "Database Intitiated" });
  // } catch (error) {
  //   console.error("Error:", error);
  //   res.status(404).json({ message: "Error" });
  // }
  res.status(200).json({
    message:
      "Code commented use the DB_CONNECTION_STRING provided in Readme.md",
  });
};

// export const createTable = async () => {
//   try {
//     const client = getClient();

//     const query = `
//       CREATE TABLE "contacts" (
//         "id" SERIAL PRIMARY KEY,
//         "phoneNumber" VARCHAR(255),
//         "email" VARCHAR(255),
//         "linkedId" INTEGER,
//         "linkPrecedence" VARCHAR(10),
//         "createdAt" TIMESTAMPTZ DEFAULT current_timestamp,
//         "updatedAt" TIMESTAMPTZ DEFAULT current_timestamp,
//         "deletedAt" TIMESTAMPTZ,
//         FOREIGN KEY ("linkedId") REFERENCES "contacts" ("id")
//       );
//     `;

//     await client.query(query);

//     console.log("Table created successfully");
//   } catch (error) {
//     console.error("Error creating table:", error);
//     throw error;
//   }
// };

// export const insertData = async () => {
//   try {
//     const client = getClient();

//     const query = `
//       INSERT INTO "contacts" ("phoneNumber", "email", "linkedId", "linkPrecedence") VALUES
//         ('1234567890', 'aravind@gmail.com', NULL, 'primary'),
//         ('1234567890', 'araviindm@gmail.com', 1, 'secondary');
//     `;
//     await client.query(query);

//     console.log("Data inserted successfully");
//   } catch (error) {
//     console.error("Error inserting data:", error);
//     throw error;
//   }
// };
