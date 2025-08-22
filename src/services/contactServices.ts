import { Contact, IdentifyRequest, IdentifyResponse } from '../types/contact';

export class ContactService {
  async identify(request: IdentifyRequest): Promise<IdentifyResponse> {
    
    return {
      contact: {
        primaryContactId: 1,
        emails: [],
        phoneNumbers: [],
        secondaryContactIds: []
      }
    };
  }
}