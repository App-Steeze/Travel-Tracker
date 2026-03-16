import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = process.env.PORT || 3000;
env.config();
const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON user_id = users.id WHERE user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser(){
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user)=>user.id == currentUserId);
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();

  if(!currentUser){
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: "teal",
      currentId: currentUserId
    });
    
  }else{
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      currentId: currentUser.id
    });

  }
    console.log("Current User:", currentUser)
  
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();
  console.log("Current User:",currentUser);

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }

});

app.post("/new", async (req, res) => {
  const userName = req.body.name;
  const userColor = req.body.color;

  const result = await db.query("INSERT INTO users(name, color) VALUES($1, $2) RETURNING *", [userName, userColor]);
  
  const id = result.rows[0].id;
  currentUserId = id;
  res.redirect("/");
});

app.post("/delete-user", async(req, res)=>{
  const currentUser = await getCurrentUser();
  const id = currentUser.id;
  try{
    await db.query("DELETE FROM visited_countries WHERE user_id = $1;", [id]);
    await db.query("DELETE FROM users WHERE id = $1", [id]);

    console.log("User deleted successfully");
    res.redirect("/");
  }catch(err){
    console.log(err);
    res.redirect("/");
  }  
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
