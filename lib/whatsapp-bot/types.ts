export type WhatsAppMessage = {
  from?: string;
  text?: {
    body?: string;
  };
  type?: string;
};

export type WhatsAppStatusEvent = {
  id?: string;
  status?: string;
  recipient_id?: string;
  errors?: Array<{
    code?: number;
    title?: string;
    message?: string;
    error_data?: {
      details?: string;
    };
  }>;
};

export type WebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessage[];
        statuses?: WhatsAppStatusEvent[];
      };
    }>;
  }>;
};

export type StoreForCommand = {
  id: string;
  name: string;
  vendor_id: string;
};

export type WebhookDebugResult = {
  from: string;
  body: string;
  inferred_command: string;
  role: "vendor" | "customer" | "system";
  scope_store_id?: string | null;
  status: "ok" | "error";
  error?: string;
  /** Present only when the AI intent layer translated the raw message into this canonical command. */
  ai_interpreted_as?: string;
};
