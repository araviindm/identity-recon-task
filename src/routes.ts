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
      let primaryContact: Contact | undefined;
      primaryContact = contacts.find((contact) => contact.linkedId === null);
      if (!primaryContact) {
        const primaryContactId = contacts[0].linkedId;
        const primaryContactQuery = `
          SELECT *
          FROM "contacts"
          WHERE "id" = $1
        `;
        const primaryContactValues = [primaryContactId];
        const primaryContactResult = await client.query<Contact>(
          primaryContactQuery,
          primaryContactValues
        );

        primaryContact = primaryContactResult.rows[0];
      }
      const primaryContactId = primaryContact?.id;

      const secondaryContactsQuery = `
          SELECT *
          FROM "contacts"
          WHERE "linkedId" = $1
        `;
      const secondaryContactsValues = [primaryContactId];
      const secondaryContactsResult = await client.query<Contact>(
        secondaryContactsQuery,
        secondaryContactsValues
      );
      const secondaryContacts = secondaryContactsResult.rows;

      let isContactExists: boolean = false;
      if (email) {
        isContactExists = contacts.some(
          (contact) => contact.email === email && contact.email !== null
        );
      } else if (phoneNumber) {
        isContactExists = contacts.some(
          (contact) =>
            contact.phoneNumber === phoneNumber && contact.phoneNumber !== null
        );
      }
      let newSecondaryContact: Contact | undefined;
      let result;
      if (!isContactExists) {
        const insertQuery = `
          INSERT INTO "contacts" ("email", "phoneNumber", "linkedId", "linkPrecedence", "createdAt", "updatedAt", "deletedAt")
          VALUES ($1, $2, $3, 'secondary', NOW(), NOW(), NULL)
          RETURNING "id"
        `;
        const insertValues = [email, phoneNumber, primaryContactId];
        const insertResult = await client.query(insertQuery, insertValues);
        result = insertResult.rows[0];
        const secondaryContactsQuery = `
          SELECT *
          FROM "contacts"
          WHERE "id" = $1
        `;
        const secondaryContactsValues = [result.id];
        const secondaryContactsResult = await client.query<Contact>(
          secondaryContactsQuery,
          secondaryContactsValues
        );
        newSecondaryContact = secondaryContactsResult.rows[0];
      }
      const secondaryContactIds = secondaryContacts.map(
        (contact) => contact.id
      );
      if (result?.id) {
        secondaryContactIds.push(result.id);
      }
      if (newSecondaryContact) {
        secondaryContacts.push(newSecondaryContact!);
      }

      const emailSet = new Set([
        primaryContact?.email,
        ...secondaryContacts.map((contact) => contact.email).filter(Boolean),
      ]);
      const emails = Array.from(emailSet);

      const phoneNumberSet = new Set([
        primaryContact?.phoneNumber,
        ...secondaryContacts
          .map((contact) => contact.phoneNumber)
          .filter(Boolean),
      ]);
      const phoneNumbers = Array.from(phoneNumberSet);

      const response = {
        contact: {
          primaryContactId,
          emails,
          phoneNumbers,
          secondaryContactIds,
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
