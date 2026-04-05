# Development To-Do

## Email on Task Assignment
- When a task is assigned to someone in Twenty CRM, automatically email them
- **Approach**: Webhook + script on the droplet
  1. Configure Twenty webhook to fire on task create/update
  2. Script on droplet catches the webhook, checks assignee
  3. Sends email via Gmail SMTP (DAM Gmail account)
- **Email content**: "You've been assigned a task: [task name] — [link to CRM]"
- **Prerequisites**:
  - Decide which Gmail to send from
  - Assignees need email addresses in the CRM
  - Set up Gmail App Password for SMTP
