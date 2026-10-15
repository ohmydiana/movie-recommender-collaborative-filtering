# MovieLens Recommender

A full-stack web app that recommends movies using **user-based collaborative filtering**. Users rate movies, the system finds people with similar taste and predicts ratings for movies they haven't seen yet.

Semestral project for **BI-VWM (Searching the Web and Multimedia Databases)** at FIT CTU in Prague, built by Diana Sichanhová and Matej Hric.

📄 **Final report (Slovak):** [vwm-collaborative-filtering-final.pdf](vwm-collaborative-filtering-final.pdf)

## Features

- **Browse & rate** 1,682 movies (search, filters: all / recommended / rated / unrated, 1–5 star ratings)
- **Personalized recommendations** — only for movies the user hasn't rated yet
- **Admin panel** — choose the similarity metric, tune parameters, run the computations and see stats (time, users processed, recommendations generated)
- **Three similarity metrics implemented from scratch** (no ML libraries): Spearman, Pearson and cosine similarity

## How it works

1. For every pair of users with at least *m* ratings (default 5), compute their similarity over the movies both have rated.
2. For each user and each unrated movie, predict the rating from the *n* most similar users (default 10):

   ```
   p(a,j) = v̄(a) + κ · Σ w(a,i)·(v(i,j) − v̄(i)) / Σ |w(a,i)|
   ```

   where `v̄` is a user's average rating, `w(a,i)` the similarity of users *a* and *i*, and `κ` a scaling constant (default 1.0). The result is clamped to 1–5.
3. Movies with the highest predicted rating are shown as recommendations.

## Tech stack

**Frontend:** React 18, React Router, Webpack, Babel
**Backend:** Node.js, Express, SQLite (better-sqlite3), JWT + bcrypt
**Data:** [MovieLens 100K](https://grouplens.org/datasets/movielens/100k/) — 943 users, 1,682 movies, 100,000 ratings

## Running locally

Requirements: Node.js 16+ and npm.

```bash
npm install

# Download the MovieLens 100K dataset into the project root
curl -O https://files.grouplens.org/datasets/movielens/ml-100k.zip

# Create the SQLite database and import the dataset
npm run init-db

# Start backend (http://localhost:5000) and frontend (http://localhost:3000)
npm start
```

Open http://localhost:3000 and log in:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| User | `ml_user_1` … `ml_user_943` | `movielens123` |

You can also register a new account. Dataset users already have ratings, so recommendations can be generated straight away:

1. Log in as `admin` → **Admin Panel** → pick a metric and parameters.
2. Click **Compute User Similarities**, then **Compute Recommendations** (computing all pairs takes a while).
3. Log in as e.g. `ml_user_1` → recommended movies are highlighted on the movie list and on the **Recommendations** page.

To reset the database, delete `server/database.sqlite` and run `npm run init-db` again.

> **macOS note:** port 5000 is often taken by AirPlay Receiver. Turn it off in System Settings → General → AirDrop & Handoff, or change the port in `server/index.js` and `API_URL` in `src/App.js`.

## Project structure

```
server/
  algorithms/similarity.js       Spearman, Pearson, cosine
  algorithms/recommendations.js  similarity + prediction computation
  routes/                        REST API (auth, products, ratings, recommendations, admin)
  middleware/auth.js             JWT authentication
  database.js, initDatabase.js   SQLite schema and MovieLens import
src/
  components/                    React views (movie list, recommendations, admin panel, login…)
  App.js                         routing and API URL
```

## Limitations

- Similarity computation is O(n²) over users and runs in a single Node.js thread.
- Cold start: new users get no recommendations until they rate enough movies.

## Acknowledgements

MovieLens data: F. Maxwell Harper and Joseph A. Konstan. 2015. *The MovieLens Datasets: History and Context.* ACM TiiS 5(4). The dataset is not included in this repository due to its license — download it from GroupLens as shown above.
