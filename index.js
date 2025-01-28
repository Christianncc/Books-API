import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fetch from 'node-fetch';  // Importing fetch for ES Modules
import pg from "pg"; // Imports the pg (node-postgres) library for interacting with PostgreSQL databases.

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "testing_wwlj_user", // The username for the PostgreSQL connection.
  host: "dpg-cuc3a6bv2p9s73d143q0-a.oregon-postgres.render.com", // The host where the PostgreSQL database is running.
  database: "books", // The name of the PostgreSQL database to connect to.
  password: "vPGvGXtPGFuSMYQ6D5aiQEXWAgI3IubT", // The password for the PostgreSQL user.
  port: 5432, // The port number where the PostgreSQL database is running (default is 5432).
  ssl: {
    rejectUnauthorized: false, // This will allow self-signed certificates (in some cases), but ensure you understand the security implications.
  },
});
db.connect(); // Establishes a connection to the PostgreSQL database.


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Route for fetching suggestions
// Route for fetching suggestions


async function getBooks() {
  try {
    // List of specific book titles to search for
    const bookTitles = [
      "Harry Potter and the Deathly Hallows",
      "Harry Potter and the Philosopher's Stone",
      "Harry Potter and the Goblet of Fire",
      "Harry Potter and the Chamber of Secrets",
      "Naruto",
      "Halloween Howls",
      "The Art of Loving",
      "The Art of War",
      "Creativity, Inc.",
      "The Canterville Ghost",
      "A Slip of the Keyboard",
      "Chequer Board - Canada",
      "Shadow and Bone",
      "The Shadow Rising", 
      "The Serpent's Shadow",
      "The God of Small Things",
      "Love and Freindship",
      "The Girl Who Loved Tom Gordon",
      "THE FAT CAT SAT ON THE MAT",
      "Fat is a feminist issue",
      "Resident Evil",

    ];

    // Array to store fetched book details
    let books = [];

    for (const title of bookTitles) {
      const response = await axios.get(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`);

      if (response.data.docs && response.data.docs.length > 0) {
        const book = response.data.docs[0];

        // Check if the book has an author and ISBN
        if (book.title && book.author_name && (book.isbn || book.isbn_13)) {
          books.push({
            title: book.title,
            author: book.author_name.join(", "),
            isbn: book.isbn ? book.isbn[0] : book.isbn_13[0],
            coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null
          });
        }
      }
    }

    console.log(books); // Debug: log the fetched books
    return books;
  } catch (error) {
    console.error("Error fetching books:", error);
    return [];
  }
}



async function fetchBooksWithCovers() {
  const dbResult = await db.query("SELECT title, author, isbn FROM books");

  const booksWithCovers = await Promise.all(
    dbResult.rows.map(async (book) => {
      let coverUrl = null;

      if (book.isbn) {
        // Try to fetch the cover using the ISBN
        coverUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-S.jpg`;
      }

      if (!coverUrl || !(await urlExists(coverUrl))) {
        // Fallback: search for a cover using the title
        try {
          const searchResponse = await axios.get(
            `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}&limit=1`
          );

          if (searchResponse.data.docs && searchResponse.data.docs.length > 0) {
            const firstResult = searchResponse.data.docs[0];
            if (firstResult.cover_i) {
              coverUrl = `https://covers.openlibrary.org/b/id/${firstResult.cover_i}-S.jpg`;
            }
          }
        } catch (error) {
          console.error(`Error fetching cover by title for book "${book.title}":`, error);
        }
      }

      return {
        ...book,
        coverUrl,
      };
    })
  );

  return booksWithCovers;
}

// Helper function to check if a URL exists
async function urlExists(url) {
  try {
    const response = await axios.head(url);
    return response.status === 200;
  } catch {
    return false;
  }
}



app.get("/", async (req, res) => {
  
    res.render("homepage.ejs"); // In case of an error, pass an empty array
  }
);

app.get("/explore", async (req, res) => {
  try {
    const books = await getBooks();
    console.log(books); // Log the books data to see what you get
    res.render("brooks.ejs", { randomBooks: books, req }); // Pass books and req to the view
  } catch (error) {
    console.error('Error fetching books:', error);
    res.render("brooks.ejs", { randomBooks: [], req }); // Pass req and an empty array if there's an error
  }
});










app.get("/book/:isbn", async (req, res) => {
  const { isbn } = req.params;

  try {
    const bookQuery =
      "SELECT id, title, author, isbn, review, rating FROM books WHERE isbn = $1";
    const result = await db.query(bookQuery, [isbn]);

    if (result.rows.length > 0) {
      const book = result.rows[0];

      // Initialize cover URL
      let coverUrl = book.isbn
        ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`
        : null;

      // Check if the ISBN-based cover URL exists
      if (!coverUrl || !(await urlExists(coverUrl))) {
        // Fallback: search for a cover using the title
        if (book.title) {
          try {
            const searchResponse = await axios.get(
              `https://openlibrary.org/search.json?title=${encodeURIComponent(
                book.title
              )}&limit=1`
            );

            if (searchResponse.data.docs && searchResponse.data.docs.length > 0) {
              const firstResult = searchResponse.data.docs[0];
              if (firstResult.cover_i) {
                coverUrl = `https://covers.openlibrary.org/b/id/${firstResult.cover_i}-L.jpg`;
              }
            }
          } catch (error) {
            console.error(
              `Error fetching cover by title for book "${book.title}":`,
              error
            );
          }
        }
      }

      res.render("book.ejs", {
        id: book.id,
        title: book.title,
        coverUrl,
        author: book.author,
        review: book.review,
        rating: book.rating,
        isbn: book.isbn, // Include the ISBN
      });
    } else {
      res.status(404).send("Book not found");
    }
  } catch (error) {
    console.error("Error fetching book details:", error);
    res.status(500).send("Internal Server Error");
  }
});






app.get("/suggestions", async (req, res) => {
  const query = req.query.query;
  console.log("Search Query:", query); // Log the query to ensure it reaches the server
  if (!query || query.length < 3) {
    return res.json([]); // Return empty array if query is too short
  }

  try {
    const response = await axios.get(`https://openlibrary.org/search.json?title=${query}`);
    const suggestions = response.data.docs || [];
    

    suggestions.sort((a, b) => {
      const aMatch = a.title.toLowerCase().includes(query.toLowerCase());
      const bMatch = b.title.toLowerCase().includes(query.toLowerCase());
      return bMatch - aMatch; // Ensure the closest matches are at the top
    });

    res.json(suggestions.slice(0, 5).map(suggestion => ({
      title: suggestion.title,
      isbn: suggestion.isbn ? suggestion.isbn[0] : 'N/A',
      cover: suggestion.cover_i ? `https://covers.openlibrary.org/b/id/${suggestion.cover_i}-M.jpg` : null,
    })));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.json([]);
  }
});






app.get("/search", async (req, res) => {
  const query = req.query.query || "Harry Potter"; // Default query if search is empty
  let url;

  const userProvidedISBN = query;

  if (/^\d{10}(\d{3})?$/.test(query)) {
    url = `https://openlibrary.org/api/books?bibkeys=ISBN:${query}&format=json&jscmd=data`;
  } else if (/^\d{1,8}(-?\d{1,2})?$/.test(query)) {
    url = `https://openlibrary.org/api/books?bibkeys=LCCN:${query}&format=json&jscmd=data`;
  } else {
    url = `https://openlibrary.org/search.json?title=${query}`;
  }

  try {
    const response = await axios.get(url);
    let bookData;
    let coverUrl = null;
    let titleResult = "No title available";
    let author = "No author available";
    let isbn = 'N/A';

    if (url.includes("api/books")) {
      const key = url.includes("ISBN") ? `ISBN:${query}` : `LCCN:${query}`;
      bookData = response.data[key];

      if (bookData) {
        coverUrl = bookData.cover ? bookData.cover.medium : null;
        titleResult = bookData.title || "No title available";
        author = bookData.authors && bookData.authors[0]?.name ? bookData.authors[0].name : "No author available";
        isbn = query;
      }
    } else {
      bookData = response.data.docs && response.data.docs[0];

      if (bookData) {
        const coverId = bookData.cover_i;
        coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
        titleResult = bookData.title || "No title available";
        author = bookData.author_name && bookData.author_name[0] ? bookData.author_name[0] : "No author available";
        isbn = bookData.isbn ? bookData.isbn[0] : 'N/A';
      }
    }

    const dbResult = await db.query("SELECT title, author, isbn FROM books");
    const booksWithCovers = dbResult.rows.map(book => ({
      ...book,
      coverUrl: book.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg` : null,
    }));

    res.render("index.ejs", {
      listTitle: "Today",
      bookCover: coverUrl,
      title: titleResult,
      author: author,
      isbn: isbn,
      myBooks: booksWithCovers,
      error: null, // Ensure `error` is always passed
    });
  } catch (error) {
    console.error("Error fetching book data:", error);
    res.render("index.ejs", {
      listTitle: "Today",
      bookCover: null,
      title: "No title available",
      author: "No author available",
      isbn: 'N/A',
      myBooks: [],
      error: "Unable to fetch books.", // Add an error message for failure
    });
  }
});


app.post("/update-rating/:id", async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  try {
    if (rating < 1 || rating > 5) {
      return res.status(400).send("Invalid rating value");
    }

    const updateQuery = "UPDATE books SET rating = $1 WHERE id = $2";
    await db.query(updateQuery, [rating, id]);

    // Fetch the ISBN of the book
    const isbnQuery = "SELECT isbn FROM books WHERE id = $1";
    const result = await db.query(isbnQuery, [id]);

    if (result.rows.length > 0) {
      const isbn = result.rows[0].isbn;
      res.redirect(`/book/${isbn}`); // Redirect to the book page
    } else {
      res.status(404).send("Book not found");
    }
  } catch (error) {
    console.error("Error updating rating:", error);
    res.status(500).send("Internal Server Error");
  }
});



app.post("/update-review/:id", async (req, res) => {
  const { id } = req.params;
  const { review } = req.body;

  try {
    const updateQuery = "UPDATE books SET review = $1 WHERE id = $2";
    await db.query(updateQuery, [review, id]);

    res.redirect(`/book/${req.body.isbn}`); // Redirect to the same book page
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.post("/remove-book", async (req, res) => {
  const { isbn } = req.body;

  try {
    // Delete the book with the given ISBN from the database
    const deleteQuery = "DELETE FROM books WHERE isbn = $1";
    await db.query(deleteQuery, [isbn]);

    // Redirect back to the homepage after deletion
    const referer = req.headers.referer || "/search";
res.redirect(referer);
  } catch (err) {
    console.error("Error deleting book:", err);

    // Fetch the updated list of books and show an error message
    const booksWithCovers = await fetchBooksWithCovers();
    res.render("index.ejs", {
      error: "An error occurred while deleting the book.",
      bookCover: null,
      title: null,
      author: null,
      isbn: null,
      myBooks: booksWithCovers,
    });
  }
});



app.post("/add-book", async (req, res) => {
  const { title, author, isbn } = req.body;

  if (!title || !author || !isbn) {
    const booksWithCovers = await fetchBooksWithCovers();
    return res.render("index.ejs", {
      error: "All fields are required.",
      bookCover: null,
      title: null,
      author: null,
      isbn: null,
      myBooks: booksWithCovers,
    });
  }

  try {
    const existingBookQuery = "SELECT * FROM books WHERE isbn = $1 OR title = $2";
    const values = [isbn, title];
    const existingBookResult = await db.query(existingBookQuery, values);

    if (existingBookResult.rows.length > 0) {
      const booksWithCovers = await fetchBooksWithCovers();
      return res.render("index.ejs", {
        error: "This book is already in your collection.",
        bookCover: null,
        title: null,
        author: null,
        isbn: null,
        myBooks: booksWithCovers,
      });
    }

    const queryText = "INSERT INTO books (title, author, isbn) VALUES ($1, $2, $3)";
    await db.query(queryText, [title, author, isbn]);

    res.redirect(`/search?query=${encodeURIComponent(title)}`);
  } catch (err) {
    console.error("Error inserting into database:", err);
    const booksWithCovers = await fetchBooksWithCovers();
    res.render("index.ejs", {
      error: "An error occurred while adding the book.",
      bookCover: null,
      title: null,
      author: null,
      isbn: null,
      myBooks: booksWithCovers,
    });
  }
});


app.post("/add-book-collection", async (req, res) => {
  const { title, author, isbn, redirectUrl } = req.body;

  if (!isbn) {
    return res.status(400).send("ISBN is required to add a book!");
  }

  try {
    // Fetch book details from Open Library API using ISBN
    const response = await axios.get(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    const bookData = response.data[`ISBN:${isbn}`];

    if (!bookData) {
      return res.status(404).send("Book details not found in the Open Library API.");
    }

    // Use API data as fallback for missing title or author
    const bookTitle = bookData.title || title || "Unknown Title";
    const bookAuthor = bookData.authors
      ? bookData.authors.map((author) => author.name).join(", ")
      : author || "Unknown Author";

    // Check if the book already exists in the database
    const existingBookQuery = "SELECT * FROM books WHERE isbn = $1";
    const existingBookResult = await db.query(existingBookQuery, [isbn]);

    if (existingBookResult.rows.length > 0) {
      return res.redirect(redirectUrl || "/"); // Redirect back to the original page
    }

    // Insert the book into the database
    const insertQuery = "INSERT INTO books (title, author, isbn) VALUES ($1, $2, $3)";
    await db.query(insertQuery, [bookTitle, bookAuthor, isbn]);

    // Redirect back to the original page with a success message
    res.redirect(redirectUrl || "/");
  } catch (error) {
    console.error("Error adding book to collection:", error);

    // Redirect back to the original page with an error message
    res.redirect(redirectUrl || "/");
  }
});












// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});




