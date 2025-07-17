# WhatsApp Integration for Student Registration System

This document provides instructions on how to set up and use the WhatsApp integration feature in the Student Registration System.

## Overview

The WhatsApp integration allows administrators to:
- Send individual messages to students
- Send broadcast messages to groups of students
- Create and manage message templates
- Send documents (such as receipts, invoices, etc.)
- Configure WhatsApp settings

## Prerequisites

1. An UltraMsg account (https://ultramsg.com)
2. A WhatsApp Business account
3. Environment variables set up with UltraMsg credentials

## Environment Variables

Add the following environment variables to your `.env` file:

```
ULTRAMSG_INSTANCE_ID=your_instance_id
ULTRAMSG_TOKEN=your_token
ULTRAMSG_BASE_URL=https://api.ultramsg.com
ULTRAMSG_BUSINESS_NAME=Your Business Name
ULTRAMSG_AUTO_REPLY=false
ULTRAMSG_DELIVERY_REPORTS=true
ULTRAMSG_MESSAGE_QUEUE=true
ULTRAMSG_RATE_LIMIT=standard
```

## API Endpoints

### Send a Single Message

```
POST /api/whatsapp/send
```

Request body:
```json
{
  "to": "+919876543210",
  "message": "Hello, this is a test message"
}
```

### Send a Broadcast Message

```
POST /api/whatsapp/broadcast
```

Request body:
```json
{
  "recipients": ["+919876543210", "+919876543211", "+919876543212"],
  "message": "Hello, this is a broadcast message"
}
```

### Send a Document

```
POST /api/whatsapp/document
```

Request body:
```json
{
  "to": "+919876543210",
  "documentUrl": "https://example.com/document.pdf",
  "caption": "Here is your receipt"
}
```

### Send a Template Message

```
POST /api/whatsapp/template
```

Request body:
```json
{
  "to": "+917094176551",
  "templateName": "fee_reminder",
  "variables": {
    "student_name": "John Doe",
    "amount": "5000",
    "due_date": "2023-12-31"
  }
}
```

### Get WhatsApp Status

```
GET /api/whatsapp/status
```

### Save WhatsApp Settings

```
POST /api/whatsapp/settings
```

Request body:
```json
{
  "businessName": "EduFlow Institute",
  "autoReply": true,
  "deliveryReports": true,
  "messageQueue": true,
  "rateLimiting": "standard",
  "timezone": "Asia/Kolkata",
  "workingHours": {
    "enabled": true,
    "start": "09:00",
    "end": "18:00"
  }
}
```

### Send Batch Notification

```
POST /api/whatsapp/batch-notification
```

Request body:
```json
{
  "batchId": "60d21b4667d0d8992e610c85",
  "message": "Hello students, there will be no class tomorrow."
}
```

## Template Management

### Get All Templates

```
GET /api/whatsapp/templates
```

### Get Template by ID

```
GET /api/whatsapp/templates/:id
```

### Create Template

```
POST /api/whatsapp/templates
```

Request body:
```json
{
  "name": "Fee Reminder",
  "content": "Hi {student_name}, this is a reminder that your fee payment of ₹{amount} is due on {due_date}. Please make the payment to avoid any inconvenience.",
  "category": "Payment"
}
```

### Update Template

```
PUT /api/whatsapp/templates/:id
```

Request body:
```json
{
  "name": "Fee Reminder",
  "content": "Hi {student_name}, this is a reminder that your fee payment of ₹{amount} is due on {due_date}. Please make the payment to avoid any inconvenience.",
  "category": "Payment"
}
```

### Delete Template

```
DELETE /api/whatsapp/templates/:id
```

### Increment Template Usage

```
POST /api/whatsapp/templates/:id/increment
```

## Frontend Integration

The frontend provides a user-friendly interface for managing WhatsApp communications:

1. **Dashboard**: View recent messages and quick actions
2. **Send Message**: Send individual messages to students
3. **Templates**: Manage message templates
4. **Broadcast**: Send messages to multiple students at once
5. **Settings**: Configure WhatsApp settings

## Troubleshooting

If you encounter issues with the WhatsApp integration:

1. Check that your UltraMsg account is active and has sufficient credits
2. Verify that the environment variables are correctly set
3. Check the server logs for error messages
4. Ensure that the phone numbers are in the correct format (with country code)
5. Test the connection using the "Test Connection" button in the settings tab

## Security Considerations

- All WhatsApp API endpoints are protected with authentication and authorization
- Only admin users can send WhatsApp messages
- API keys and tokens are stored securely in environment variables
- Phone numbers are formatted to ensure they are valid before sending messages

## Rate Limiting

UltraMsg has rate limits on message sending. The default settings are:

- Low: 10 messages per minute
- Standard: 30 messages per minute
- High: 60 messages per minute

Choose the appropriate setting based on your needs and account limitations. 