import { query } from '../database/db';
import { Contact, IdentifyRequest, IdentifyResponse } from '../types/contact';

export class ContactService {
  async identify(request: IdentifyRequest): Promise<IdentifyResponse> {
    const { email, phoneNumber } = request;
    
    if (!email && !phoneNumber) {
      throw new Error('Either email or phoneNumber must be provided');
    }

    // find existing contacts that match email or no.
    const existingContacts = await this.findMatchingContacts(email, phoneNumber);
    
    if (existingContacts.length === 0) {
      return await this.createNewPrimaryContact(email, phoneNumber);
    }
    
    const needsNewContact = this.shouldCreateNewContact(existingContacts, email, phoneNumber);
    
    if (needsNewContact) {
      await this.createSecondaryContact(existingContacts, email, phoneNumber);
    }
    
    await this.handlePrimaryConsolidation(existingContacts, email, phoneNumber);
    
    //get it all mapped and return
    return await this.getConsolidatedResponse(existingContacts);
  }

  private async findMatchingContacts(email?: string, phoneNumber?: string): Promise<Contact[]> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (email) {
      whereConditions.push(`email = $${paramIndex++}`);
      params.push(email);
    }

    if (phoneNumber) {
      whereConditions.push(`phone_number = $${paramIndex++}`);
      params.push(phoneNumber);
    }

    const whereClause = whereConditions.join(' OR ');
    
    const result = await query(`
      SELECT id, phone_number as "phoneNumber", email, linked_id as "linkedId", 
             link_precedence as "linkPrecedence", created_at as "createdAt", 
             updated_at as "updatedAt", deleted_at as "deletedAt"
      FROM contacts 
      WHERE deleted_at IS NULL AND (${whereClause})
      ORDER BY created_at ASC
    `, params);

    return result.rows;
  }

  private async createNewPrimaryContact(email?: string, phoneNumber?: string): Promise<IdentifyResponse> {
    const result = await query(`
      INSERT INTO contacts (phone_number, email, linked_id, link_precedence) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, phone_number as "phoneNumber", email, linked_id as "linkedId", 
                link_precedence as "linkPrecedence", created_at as "createdAt", 
                updated_at as "updatedAt", deleted_at as "deletedAt"
    `, [phoneNumber || null, email || null, null, 'primary']);

    const contact = result.rows[0];
    
    return {
      contact: {
        primaryContactId: contact.id,
        emails: contact.email ? [contact.email] : [],
        phoneNumbers: contact.phoneNumber ? [contact.phoneNumber] : [],
        secondaryContactIds: []
      }
    };
  }

  private shouldCreateNewContact(existingContacts: Contact[], email?: string, phoneNumber?: string): boolean {
    // check if the exact combination already exists
    const exactMatch = existingContacts.find(contact => 
      contact.email === (email || null) && contact.phoneNumber === (phoneNumber || null)
    );
    
    if (exactMatch) {
      return false; 
    }

    // check if we have new information
    const hasNewEmail = email && !existingContacts.some(contact => contact.email === email);
    const hasNewPhone = phoneNumber && !existingContacts.some(contact => contact.phoneNumber === phoneNumber);
    
    return Boolean(hasNewEmail) || Boolean(hasNewPhone);
  }

  private async createSecondaryContact(existingContacts: Contact[], email?: string, phoneNumber?: string): Promise<void> {
    // find the primary no.
    const primaryContact = existingContacts.find(contact => contact.linkPrecedence === 'primary') || 
                          existingContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    const actualPrimaryId = primaryContact.linkedId || primaryContact.id;

    await query(`
      INSERT INTO contacts (phone_number, email, linked_id, link_precedence) 
      VALUES ($1, $2, $3, $4)
    `, [phoneNumber || null, email || null, actualPrimaryId, 'secondary']);
  }

  private async handlePrimaryConsolidation(existingContacts: Contact[], email?: string, phoneNumber?: string): Promise<void> {
    const primaryContacts = existingContacts.filter(contact => contact.linkPrecedence === 'primary');
    
    if (primaryContacts.length <= 1) {
      return; 
    }

    primaryContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const oldestPrimary = primaryContacts[0];
    const contactsToUpdate = primaryContacts.slice(1);

    // update newer primary no to secondary
    for (const contact of contactsToUpdate) {
      await query(`
        UPDATE contacts 
        SET link_precedence = 'secondary', linked_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [oldestPrimary.id, contact.id]);

      
      await query(`
        UPDATE contacts 
        SET linked_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE linked_id = $2
      `, [oldestPrimary.id, contact.id]);
    }
  }

  private async getConsolidatedResponse(existingContacts: Contact[]): Promise<IdentifyResponse> {
    // find the primary no.
    let primaryContact = existingContacts.find(contact => contact.linkPrecedence === 'primary');
    
    if (!primaryContact) {
      primaryContact = existingContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    }

    const primaryId = primaryContact.linkedId || primaryContact.id;

    // get all no. in the same group
    const allLinkedContacts = await query(`
      SELECT id, phone_number as "phoneNumber", email, linked_id as "linkedId", 
             link_precedence as "linkPrecedence", created_at as "createdAt", 
             updated_at as "updatedAt", deleted_at as "deletedAt"
      FROM contacts 
      WHERE deleted_at IS NULL AND (id = $1 OR linked_id = $1)
      ORDER BY created_at ASC
    `, [primaryId]);

    const contacts = allLinkedContacts.rows;
    const primary = contacts.find(c => c.linkPrecedence === 'primary');
    const secondaries = contacts.filter(c => c.linkPrecedence === 'secondary');

    const emails = new Set<string>();
    const phoneNumbers = new Set<string>();

    if (primary?.email) emails.add(primary.email);
    if (primary?.phoneNumber) phoneNumbers.add(primary.phoneNumber);

    secondaries.forEach(contact => {
      if (contact.email) emails.add(contact.email);
      if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    });

    return {
      contact: {
        primaryContactId: primary?.id || primaryId,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds: secondaries.map(c => c.id)
      }
    };
  }
}