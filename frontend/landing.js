// Scroll event listener for navbar background change
window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar");
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// Intersection Observer for feature section animations
const featureBoxes = document.querySelectorAll(".feature-box");

const observer = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target); // To only trigger once
      }
    });
  },
  { threshold: 0.2 } // Trigger when 20% of the element is in view
);

featureBoxes.forEach(box => {
  observer.observe(box);
});

// Common message display function
const commonMessageDiv = document.getElementById('commonMessage');
function displayMessage(message, isSuccess = true) {
  commonMessageDiv.innerText = message;
  commonMessageDiv.style.color = isSuccess ? 'green' : 'red';
}

// Login form submission
document.getElementById('loginForm').addEventListener('submit', async function (event) {
  event.preventDefault(); // Prevent the default form submission

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch('http://localhost:3000/api/users/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const result = await response.json();
      localStorage.setItem('jwtToken', result.token); // Store JWT in localStorage
      console.log(result.token)
      displayMessage(`Login successful! Welcome ${result.Name}.`, true);
      setTimeout(() => {
        window.location.href = 'client.html';
      }, 1200); // Redirect to dashboard after 1 second
    } else {
      const error = await response.json();
      displayMessage(`Error: ${error.message || 'Login failed'}`, false);
    }
  } catch (error) {
    displayMessage(`Error: ${error.message}`, false);
  }
});

// Sign-up form submission
document.getElementById('signupForm').addEventListener('submit', async function (event) {
  event.preventDefault(); // Prevent the default form submission

  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  try {
    const response = await fetch('http://localhost:3000/api/users/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (response.ok) {
      const result = await response.json();
      localStorage.setItem('jwtToken', result.token); // Store JWT in localStorage
      displayMessage(`Sign-up successful! Welcome ${result.Name}.`, true);

    } else {
      const error = await response.json();
      displayMessage(`Error: ${error.message || 'Sign-up failed'}`, false);
    }
  } catch (error) {
    displayMessage(`Error: ${error.message}`, false);
  }
});
const token = localStorage.getItem('jwtToken');