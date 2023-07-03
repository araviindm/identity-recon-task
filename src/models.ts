export interface Contact {
  id: number;
  phoneNumber?: string;
  email?: string;
  linkedId?: number;
  linkPrecedence: LinkPrecedence;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
enum LinkPrecedence {
  primary = "primary",
  secondary = "secondary",
}

export interface IdentifyRequest {
  email?: string;
  phoneNumber?: number;
}

export interface IdentifyResponse {
  primaryContatctId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}
