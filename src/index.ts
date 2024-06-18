import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';

dotenv.config();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || 'localhost';

const app = express();
app.use(helmet()); // adds important security headers to the response
app.use(express.json()); // for parsing application/json
app.disable('x-powered-by'); // disable the X-Powered-By header to reduce server fingerprint

// curl http://localhost:3000/
app.get('/', (req: Request, res: Response) => {
  res.send({
    type: 'GET',
    time: new Date().toISOString(),
  });
});
// curl -X POST -d '{"name": "Ayush", "age": 20}' -H 'Content-Type: application/json' http://localhost:3000/
app.post('/', (req: Request, res: Response) => {
  console.log(JSON.stringify(req.body));
  res.send({
    type: 'POST',
    time: new Date().toISOString(),
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[rembo] server running on port ${process.env.HOST}:${process.env.PORT}`);
});
