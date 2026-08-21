import { Client } from "@hubspot/api-client";

let hubspotClient: Client | null = null;

function getHubSpotClient(): Client {
  if (!hubspotClient) {
    const apiKey = process.env.HUBSPOT_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[HubSpot] HUBSPOT_API_KEY not configured. Running in development mode without HubSpot integration."
        );
        // Return a mock client that won't be used
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return null as any;
      }
      throw new Error("HUBSPOT_API_KEY environment variable is not configured");
    }

    hubspotClient = new Client({ accessToken: apiKey });
  }

  return hubspotClient;
}

export interface ContactData {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  message?: string;
  [key: string]: string | undefined;
}

export async function createOrUpdateContact(
  contactData: ContactData
): Promise<{ id: string; isNew: boolean }> {
  try {
    // Check if API key is configured
    const apiKey = process.env.HUBSPOT_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[HubSpot Dev Mode] Would create/update contact: ${contactData.email}`);
        return {
          id: `dev_${Date.now()}`,
          isNew: true,
        };
      }
      throw new Error("HUBSPOT_API_KEY is not configured");
    }

    const client = getHubSpotClient();

    // Prepare properties
    const properties: Record<string, string> = {
      email: contactData.email,
    };

    if (contactData.firstName) properties.firstname = contactData.firstName;
    if (contactData.lastName) properties.lastname = contactData.lastName;
    if (contactData.phone) properties.phone = contactData.phone;
    if (contactData.company) properties.company = contactData.company;
    if (contactData.jobTitle) properties.jobtitle = contactData.jobTitle;

    // Try to create or update contact
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.crm.contacts.basicApi as any).upsertByEmail(
      contactData.email,
      {
        properties,
      }
    );

    return {
      id: response.id,
      isNew: response.properties?.hs_lead_status === "NEW",
    };
  } catch (error) {
    console.error("Error creating/updating HubSpot contact:", error);
    throw error;
  }
}

export async function createDeal(
  contactId: string,
  dealData: {
    dealname: string;
    dealstage: string;
    amount?: number;
    closedate?: string;
    description?: string;
    [key: string]: string | number | undefined;
  }
): Promise<{ id: string }> {
  try {
    // Check if API key is configured
    const apiKey = process.env.HUBSPOT_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[HubSpot Dev Mode] Would create deal: ${dealData.dealname}`);
        return { id: `dev_deal_${Date.now()}` };
      }
      throw new Error("HUBSPOT_API_KEY is not configured");
    }

    const client = getHubSpotClient();

    const properties: Record<string, string> = {
      dealname: dealData.dealname,
      dealstage: dealData.dealstage,
    };

    if (dealData.amount) properties.amount = String(dealData.amount);
    if (dealData.closedate) properties.closedate = dealData.closedate;
    if (dealData.description) properties.description = dealData.description;

    const response = await client.crm.deals.basicApi.create({
      properties,
    });

    // Associate deal with contact
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.crm.deals as any).associationsApi?.create(response.id, "contacts", [
      contactId,
    ]);

    return { id: response.id };
  } catch (error) {
    console.error("Error creating HubSpot deal:", error);
    throw error;
  }
}

export async function addContactToList(
  contactId: string,
  listId: string
): Promise<void> {
  try {
    const client = getHubSpotClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.crm.lists.membershipsApi as any).addContactsToList(listId, {
      inputs: [{ id: contactId }],
    });
  } catch (error) {
    console.error("Error adding contact to HubSpot list:", error);
    throw error;
  }
}

export async function addNote(
  contactId: string,
  note: string
): Promise<{ id: string }> {
  try {
    // Check if API key is configured
    const apiKey = process.env.HUBSPOT_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[HubSpot Dev Mode] Would add note to contact ${contactId}`);
        return { id: `dev_note_${Date.now()}` };
      }
      throw new Error("HUBSPOT_API_KEY is not configured");
    }

    const client = getHubSpotClient();

    const response = await client.crm.objects.notes.basicApi.create({
      properties: {
        hs_note_body: note,
      },
    });

    // Associate note with contact
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.crm.objects.notes as any).associationsApi?.create(response.id, "contacts", [
      contactId,
    ]);

    return { id: response.id };
  } catch (error) {
    console.error("Error adding note to HubSpot contact:", error);
    throw error;
  }
}
