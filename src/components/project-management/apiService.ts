export interface CreateLaborPORequest {
  name: string;
  plannedStartDate: string;
  plannedEndDate: string;
  personResponsibleId: string;
  locationId: string;
  vendorId: string;
  parentElementId: string;
}

export interface CreateLaborPOResponse {
  id: string;
  name: string;
}

export interface AddResourceLineItemRequest {
  documentId: string;
  resourceId: string;
  resourceParentId: string;
  managedResourceLineItemType: string;
  quantity: number;
}

export interface AddResourceLineItemResponse {
  addedResourceLineIds: string[];
  affectedRootLineIds: string[];
  addedNoteLineId: string | null;
  nonRootClonedLineIds: string[] | null;
}

export interface UpdateLineItemDatesRequest {
  documentId: string;
  lineItemId: string;
  alternatePickupDate: string;
  alternateReturnDate: string;
}

export interface UpdateLineItemDatesResponse {
  success: boolean;
}

export interface ProjectDetails {
  id: string;
  name: string;
}

export interface ProjectHeader {
  documentName: string;
  venueId: string;
  plannedStartDate: string;
  plannedEndDate: string;
  personResponsibleId: { id: string };
  locationId: string;
}

const X_AUTH_TOKEN = '82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E';

export const getProjectDetails = async (searchText: string): Promise<ProjectDetails[]> => {
  const url = `https://sectorpro.flexrentalsolutions.com/f5/api/element/search?searchText=${searchText}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': X_AUTH_TOKEN,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch project details: ${response.statusText}`);
  }

  return response.json();
};

export const getProjectHeader = async (projectId: string): Promise<ProjectHeader> => {
  const url = `https://sectorpro.flexrentalsolutions.com/f5/api/element/${projectId}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': X_AUTH_TOKEN,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch project header: ${response.statusText}`);
  }

  return response.json();
};

export const createLaborPO = async (data: CreateLaborPORequest): Promise<CreateLaborPOResponse> => {
  const url = 'https://sectorpro.flexrentalsolutions.com/f5/api/element';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: '*/*',
      'X-Auth-Token': X_AUTH_TOKEN,
    },
    body: JSON.stringify({
      definitionId: 'labor-po-definition-id',
      parentElementId: data.parentElementId,
      open: true,
      locked: false,
      documentNumber: data.name,
      name: data.name,
      plannedStartDate: data.plannedStartDate,
      plannedEndDate: data.plannedEndDate,
      personResponsibleId: data.personResponsibleId,
      locationId: data.locationId,
      vendorId: data.vendorId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Labor PO: ${response.statusText}`);
  }

  const responseData = await response.json();
  return {
    id: responseData.id,
    name: responseData.name,
  };
};

export const addResourceLineItem = async (
  data: AddResourceLineItemRequest
): Promise<AddResourceLineItemResponse> => {
  const url = `https://sectorpro.flexrentalsolutions.com/f5/api/financial-document-line-item/${data.documentId}/add-resource/${data.resourceId}?resourceParentId=${data.resourceParentId}&managedResourceLineItemType=${data.managedResourceLineItemType}&quantity=${data.quantity}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'X-Auth-Token': X_AUTH_TOKEN,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to add resource line item: ${response.statusText}`);
  }

  return response.json();
};

export const updateLineItemDates = async (
  data: UpdateLineItemDatesRequest
): Promise<UpdateLineItemDatesResponse> => {
  const url = `https://sectorpro.flexrentalsolutions.com/f5/api/financial-document-line-item/${data.documentId}/bulk-update`;

  const payload = {
    bulkData: [
      {
        itemId: data.lineItemId,
        alternatePickupDate: data.alternatePickupDate,
        alternateReturnDate: data.alternateReturnDate,
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: '*/*',
      'X-Auth-Token': X_AUTH_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update line item dates: ${response.statusText}`);
  }

  return { success: true };
};
