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
          OR "phoneNumber" = $${values.length + 1}
        `;
      } else {
        query += `
          WHERE "phoneNumber" = $${values.length + 1}
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
      let count = 0;
      let primaryContacts: Contact[] = [];
      for (const contact of contacts) {
        if (contact["linkedId"] === null) {
          count++;
          primaryContacts.push(contact);
          if (count > 1) {
            break;
          }
        }
      }
      if (count === 1) {
        // If there's only primary
        let primaryContact = primaryContacts[0];
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
        const existingContact = contacts.find(
          (contact) =>
            contact.phoneNumber === phoneNumber || contact.email === email
        );
        let newSecondaryContact: Contact | undefined;
        let result;
        if (existingContact) {
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
      } else {
        console.log("Two primary");
        // If there's two primary
        let primaryContactId: number | undefined;
        const emails: string[] = [];
        const phoneNumbers: string[] = [];
        const secondaryContactIds: number[] = [];
        if (primaryContacts[0].id > primaryContacts[1].id) {
          primaryContacts[0].linkPrecedence = "secondary";
          primaryContacts[0].linkedId = primaryContacts[1].id;

          primaryContactId = primaryContacts[1].id;
          secondaryContactIds.push(primaryContacts[0].id);
        } else {
          primaryContacts[1].linkPrecedence = "secondary";
          primaryContacts[1].linkedId = primaryContacts[0].id;

          primaryContactId = primaryContacts[0].id;
          secondaryContactIds.push(primaryContacts[1].id);
        }

        const updateQuery = `
          UPDATE "contacts"
          SET "linkPrecedence" = $1, "linkedId" = $2
          WHERE "id" = $3;
        `;
        const updateValues = [
          "secondary",
          primaryContactId,
          secondaryContactIds[0],
        ];
        await client.query(updateQuery, updateValues);

        primaryContacts.forEach((obj) => {
          if (obj.email !== null) {
            emails.push(obj.email);
          }
          if (obj.phoneNumber !== null) {
            phoneNumbers.push(obj.phoneNumber);
          }
        });

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
    }
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: "An error occurred" });
  }
};
