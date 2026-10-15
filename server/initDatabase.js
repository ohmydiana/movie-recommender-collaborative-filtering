const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./database');

const DATASET_ZIP_PATH = path.join(__dirname, '..', 'ml-100k.zip');
const DATASET_DIR_PATH = path.join(__dirname, '..', 'ml-100k');
const DEFAULT_USER_PASSWORD = 'movielens123';
const ADMIN_USER_ID = 1000;

function readDatasetFile(fileName) {
  const extractedPath = path.join(DATASET_DIR_PATH, fileName);
  if (fs.existsSync(extractedPath)) {
    return fs.readFileSync(extractedPath, 'utf8');
  }

  if (!fs.existsSync(DATASET_ZIP_PATH)) {
    throw new Error(`MovieLens dataset not found. Expected ${DATASET_ZIP_PATH} or ${extractedPath}`);
  }

  return execFileSync('unzip', ['-p', DATASET_ZIP_PATH, `ml-100k/${fileName}`], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
}

function parseGenres() {
  return readDatasetFile('u.genre')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|'))
    .filter((parts) => parts.length === 2)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map(([genreName]) => genreName);
}

function parseYear(rawDate) {
  if (!rawDate) {
    return null;
  }

  const match = rawDate.match(/(\d{4})$/);
  return match ? Number(match[1]) : null;
}

function parseProducts(genreNames) {
  return readDatasetFile('u.item')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|');
      const id = Number(parts[0]);
      const title = parts[1];
      const releaseDate = parts[2];
      const imageUrl = parts[4] || null;
      const genreFlags = parts.slice(5);
      const genres = genreFlags
        .map((flag, index) => (flag === '1' ? genreNames[index] : null))
        .filter(Boolean);

      return {
        id,
        title,
        year: parseYear(releaseDate),
        genre: genres.length > 0 ? genres.join(', ') : 'Unknown',
        imageUrl
      };
    });
}

function parseUsers() {
  return readDatasetFile('u.user')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id] = line.split('|');
      const numericId = Number(id);

      return {
        id: numericId,
        username: `ml_user_${numericId}`,
        email: `ml_user_${numericId}@example.com`
      };
    });
}

function parseRatings() {
  return readDatasetFile('u.data')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [userId, productId, rating] = line.split('\t');

      return {
        userId: Number(userId),
        productId: Number(productId),
        rating: Number(rating)
      };
    });
}

function clearExistingData() {
  db.exec(`
    DELETE FROM user_similarities;
    DELETE FROM recommendations;
    DELETE FROM ratings;
    DELETE FROM users;
    DELETE FROM products;
  `);
}

async function initializeDatabase() {
  console.log('Initializing database...');

  initDatabase();

  const genreNames = parseGenres();
  const users = parseUsers();
  const products = parseProducts(genreNames);
  const ratings = parseRatings();

  console.log(`Loaded dataset: ${users.length} users, ${products.length} movies, ${ratings.length} ratings`);

  const adminPassword = await bcrypt.hash('admin123', 10);
  const importedUserPassword = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);

  const insertAllData = db.transaction(() => {
    clearExistingData();

    const insertUser = db.prepare(
      'INSERT INTO users (id, username, password, email, is_admin) VALUES (?, ?, ?, ?, ?)'
    );
    const insertProduct = db.prepare(
      'INSERT INTO products (id, title, image_url, year, genre) VALUES (?, ?, ?, ?, ?)'
    );
    const insertRating = db.prepare(
      'INSERT INTO ratings (user_id, product_id, rating) VALUES (?, ?, ?)'
    );

    for (const user of users) {
      insertUser.run(user.id, user.username, importedUserPassword, user.email, 0);
    }

    insertUser.run(ADMIN_USER_ID, 'admin', adminPassword, 'admin@example.com', 1);

    for (const product of products) {
      insertProduct.run(product.id, product.title, product.imageUrl, product.year, product.genre);
    }

    for (const rating of ratings) {
      insertRating.run(rating.userId, rating.productId, rating.rating);
    }
  });

  insertAllData();

  console.log('\nDatabase initialization complete!');
  console.log(`Imported ${users.length} MovieLens users`);
  console.log(`Imported ${products.length} movies`);
  console.log(`Imported ${ratings.length} ratings`);
  console.log('\nLogin credentials:');
  console.log('  Admin - username: admin, password: admin123');
  console.log(`  Dataset users - username: ml_user_1 ... ml_user_${users.length}, password: ${DEFAULT_USER_PASSWORD}`);
  console.log('\nYou can now:');
  console.log('1. Start the server: npm run server');
  console.log('2. Login as admin (username: admin, password: admin123)');
  console.log('3. Compute similarities and recommendations from the admin panel');

  process.exit(0);
}

initializeDatabase().catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
