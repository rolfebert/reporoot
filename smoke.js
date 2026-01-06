const app = require('./dist/app').default || require('./dist/app');
const port = process.env.SMOKE_PORT || 5555;
app.listen(port, ()=>console.log(`Smoke server running on http://localhost:${port}`));
