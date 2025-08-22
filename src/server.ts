import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Bitespeed Identity Service');
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});