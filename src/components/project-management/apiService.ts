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

interface FlexField<T> {
  fieldType: string;
  data?: T;
  fieldRestrictions: {
    readOnly: boolean;
    readOnlyReason: string | null;
    timeAssociated: boolean;
    required: boolean;
  };
}

interface FlexUserData {
  id: string;
  name: string;
  userName: string;
  domainId: string;
}

interface FlexPersonResponsible {
  id: string;
  name: string;
  preferredDisplayString: string;
  barcode: string | null;
  deleted: boolean;
  shortName: string | null;
  shortNameOrName: string;
  className: string | null;
}

interface ProjectHeaderResponse {
  documentName: FlexField<string>;
  documentNumber: FlexField<string>;
  personResponsibleId: FlexField<FlexPersonResponsible>;
  plannedStartDate: FlexField<string>;
  plannedEndDate: FlexField<string>;
  venueId: FlexField<string>;
  createdByUserId: FlexField<FlexUserData>;
  lastEditBy: FlexField<FlexUserData>;
  lastEditDate: FlexField<string>;
  createdByDate: FlexField<string>;
  clientId: FlexField<string>;
  customerPO: FlexField<string>;
}

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
  const timestamp = new Date().getTime();
  const url = `https://sectorpro.flexrentalsolutions.com/f5/api/element/${projectId}/header-data/?_dc=${timestamp}&codeList=documentName&codeList=documentNumber&codeList=personResponsibleId&codeList=plannedStartDate&codeList=plannedEndDate&codeList=createdByUserId&codeList=createdByDate&codeList=lastEditBy&codeList=lastEditDate&codeList=clientId&codeList=venueId&codeList=customerPO`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': X_AUTH_TOKEN,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch project header: ${response.statusText}`);
  }

  const data: ProjectHeaderResponse = await response.json();
  
  // Transform the response to match the expected ProjectHeader interface
  return {
    documentName: data.documentName.data || '',
    venueId: data.venueId.data || '',
    plannedStartDate: data.plannedStartDate.data || '',
    plannedEndDate: data.plannedEndDate.data || '',
    personResponsibleId: data.personResponsibleId.data ? { id: data.personResponsibleId.data.id } : { id: '' },
    locationId: data.venueId.data || ''
  };
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
