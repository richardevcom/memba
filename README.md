## ''memba?: SMS Reminders for Seniors

![GitHub package.json version](https://img.shields.io/github/package-json/v/richardevcom/memba)

<p align="center">
    <img src="https://i.ibb.co/2jhkNs2/memba-ezgif-com-loop-count.gif" />
</p>

**Memba** is a digital assistant designed to help seniors stay on top of their daily tasks by sending them SMS reminders. It leverages the power of Google Cloud services and machine learning to provide a user-friendly and intelligent solution.

### Features

- **Simple and Familiar:** Memba utilizes SMS, a technology most seniors are already comfortable with. No need to learn new apps or interfaces!
- **AI-Powered Understanding:** Vertex AI, a powerful language model from Google Cloud, ensures accurate parsing of reminder messages, even with variations in phrasing.
- **Secure Storage:** Reminders are securely stored in a Google Cloud SQL MySQL database.
- **Automated Delivery:** Scheduled background jobs ensure timely delivery of reminder notifications via SMS.

### Installation

**Prerequisites:**

- Node.js and npm, pnpm (or yarn) installed on your system.
- A Twilio account with a phone number.
- A Google Cloud project with Cloud Run, Vertex AI and Cloud SQL enabled.

**Setting Up:**

1. Clone this repository:

```bash
git clone https://github.com/richardevcom/memba.git
```

2. Install dependencies:

```bash
npm install
```

**Configuration:**

1. Create a `.env` file in the project root directory.
2. Add the following environment variables to your `.env` file, replacing the placeholders with your actual credentials:

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
VERTEX_AI_PROJECT_ID=your_vertex_ai_project_id
VERTEX_AI_LOCATION=your_vertex_ai_location
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
CLOUD_SQL_CONNECTION_STRING=your_cloud_sql_connection_string
```

**Running Memba:**

```bash
npm start
```

This will start the Memba application in production mode.

### Development

For development purposes, you can use the following commands:

- `npm run build`: Builds the application for development.
- `npm run dev`: Starts the application in development mode with hot reloading.
- `npm run db:push`: Pushes your Prisma schema changes to the database.
- `npm run db:migrate`: Applies Prisma migrations to your database.
- `npm run db:studio`: Opens Prisma Studio for interacting with your database.

### License

Memba is licensed under the GPL-3.0-only license. See the [`LICENSE`](LICENSE) file for details.

### Contributing

We welcome contributions to Memba! Please see the `CONTRIBUTING.md` file (if it exists) for guidelines on how to contribute.

### Authors

- Ayush ([ayush.keshav2004@gmail.com](https://github.com/is-it-ayush))
- Richard ([hello@richardev.com](https://github.com/richardevcom))
