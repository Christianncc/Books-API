const searchInput = document.querySelector("#search-bar"); // Adjust selector to match your search bar ID/class
let debounceTimer;

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchSuggestions(); // Make sure you have this function defined to fetch data
  }, 300);
});

// Function to fetch suggestions
async function fetchSuggestions() {
  const query = searchInput.value.trim();
  if (query.length > 0) {
    const response = await fetch(`/suggestions?query=${query}`);
    const suggestions = await response.json();
    displaySuggestions(suggestions);
  }
}

// Function to display suggestions in the UI
function displaySuggestions(suggestions) {
    const suggestionsList = document.querySelector("#suggestions-list"); // Adjust selector as needed
    suggestionsList.innerHTML = ""; // Clear previous suggestions
  
    const maxResults = 5; // Limit the number of suggestions displayed
    suggestions.slice(0, maxResults).forEach((suggestion) => {
      const listItem = document.createElement("li");
      listItem.textContent = suggestion.title; // Adjust to match the suggestion object structure
  
      // Attach event listener for click
      listItem.addEventListener("click", () => {
        document.querySelector("#search-bar").value = suggestion.title; // Populate search bar
        suggestionsList.innerHTML = ""; // Clear suggestions after selection
      });
  
      suggestionsList.appendChild(listItem);
    });
  }
  


const searchBox = document.getElementById("search-box");
const suggestionsBox = document.getElementById("suggestions");

searchBox.addEventListener("input", async () => {
  const query = searchBox.value.trim();

  if (!query) {
    suggestionsBox.style.display = "none";
    return;
  }

  try {
    const response = await fetch(`/suggestions?query=${encodeURIComponent(query)}`);
    const suggestions = await response.json();

    suggestionsBox.innerHTML = "";
    if (suggestions.length > 0) {
      suggestions.forEach((title) => {
        const div = document.createElement("div");
        div.textContent = title;
        div.addEventListener("click", () => {
          searchBox.value = title;
          suggestionsBox.style.display = "none";
        });
        suggestionsBox.appendChild(div);
      });
      suggestionsBox.style.display = "block";
    } else {
      suggestionsBox.style.display = "none";
    }
  } catch (error) {
    console.error("Error fetching suggestions:", error);
  }
});

document.addEventListener("click", (e) => {
  if (!suggestionsBox.contains(e.target) && e.target !== searchBox) {
    suggestionsBox.style.display = "none";
  }
});
