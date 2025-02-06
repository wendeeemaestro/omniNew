"use strict";

// SET CURRENT YEAR
const yearEl = document.querySelector(".year");
const currentYear = new Date().getFullYear();
yearEl.textContent = currentYear;

// MOBILE NAVIGATION
const btnNavEl = document.querySelector(".mobile-hamburger");
const headerEl = document.querySelector(".header");
btnNavEl.addEventListener("click", function () {
  headerEl.classList.toggle("nav-open");
});

// MODAL FUNCTIONALITY
const modal = document.querySelector(".modal");
const overlay = document.querySelector(".overlay");
const btnCloseModal = document.querySelector(".btn--close-modal");
const btnsOpenModal = document.querySelectorAll(".btn--show-modal");

const openModal = function (e) {
  e.preventDefault();
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
};

const closeModal = function () {
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
};

btnsOpenModal.forEach((btn) => btn.addEventListener("click", openModal));
btnCloseModal.addEventListener("click", closeModal);
overlay.addEventListener("click", closeModal);

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

// SMOOTH SCROLLING
const allLinks = document.querySelectorAll("a:link");
allLinks.forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const href = link.getAttribute("href");

    // Scroll back to top
    if (href === "#")
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    // Scroll to other links
    if (href !== "#" && href.startsWith("#")) {
      const sectionEl = document.querySelector(href);
      sectionEl.scrollIntoView({ behavior: "smooth" });
    }

    // Close mobile menu after selection
    if (link.classList.contains("nav-link"))
      headerEl.classList.toggle("nav-open");
  });
});

// STICKY NAVIGATION
const sectionHeroEl = document.querySelector(".home-container");
const observer = new IntersectionObserver(
  function (entries) {
    const ent = entries[0];
    if (ent.isIntersecting === false) {
      document.querySelector(".header").classList.add("stickyNav");
    } else {
      document.querySelector(".header").classList.remove("stickyNav");
    }
  },
  {
    root: null,
    threshold: 0,
  }
);
observer.observe(sectionHeroEl);

// NEW AUTHENTICATION & ORDER FUNCTIONALITY

// Form Elements
const signupForm = document.querySelector(".modal__form");
const loginForm = document.querySelector(".cta-form");
const orderButtons = document.querySelectorAll(".order");

// Test if form exists
console.log("Form element:", signupForm);

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Form submitted"); // Check if event fires

  const formData = {
    name: e.target[0].value,
    email: e.target[1].value,
    password: e.target[2].value,
    phone: e.target[3].value,
  };
  console.log("Form data:", formData); // Check data being sent

  try {
    console.log("Sending request to /api/register");
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    console.log("Response:", response);

    const data = await response.json();
    console.log("Response data:", data);

    if (response.ok) {
      alert("Registration successful! Please login.");
      closeModal();
      signupForm.reset();
    } else {
      alert(data.message || "Registration failed");
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("An error occurred during registration");
  }
});

// Handle Registration
// signupForm.addEventListener("submit", async (e) => {
//   e.preventDefault();

//   const formData1 = {
//     name: e.target[0].value,
//     email: e.target[1].value,
//     password: e.target[2].value,
//   };

//   try {
//     const response = await fetch("/api/register", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(formData1),
//     });

//     const data = await response.json();
//     if (response.ok) {
//       alert("Registration successful! Please login.");
//       closeModal();

//       // Clear form
//       signupForm.reset();
//     } else {
//       alert(data.message || "Registration failed");
//     }
//   } catch (error) {
//     alert("An error occurred during registration");
//   }
// });

// Handle Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
    email: document.getElementById("email").value,
    password: document.getElementById("Password").value,
  };

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("token", data.token);
      alert("Login successful!");
      updateUIAfterLogin();
      loginForm.reset();
    } else {
      alert(data.message || "Login failed");
    }
  } catch (error) {
    alert("An error occurred during login");
  }
});

// Handle Order Placement
orderButtons.forEach((button) => {
  button.addEventListener("click", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to place an order");
      return;
    }

    const mealCard = e.target.closest(".meal");
    const mealId = mealCard.dataset.mealId;

    console.log("Meal ID:", mealId); // Debugging: Check the mealId

    const orderData = {
      meals: [
        {
          mealId: mealId, // Use the mealId
          name: mealCard.querySelector(".meal-name").textContent,
          price: parseFloat(
            mealCard
              .querySelector(".meal-specific span strong")
              .textContent.replace("₦", "")
          ),
          quantity: 1,
        },
      ],
    };

    console.log("Order Data:", orderData); // Debugging: Check the orderData

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Order response error:", errorData);
        throw new Error(errorData.message || "Failed to place order");
      }

      const data = await response.json();
      alert("Order placed successfully!");
    } catch (error) {
      console.error("Order error:", error);
      alert(error.message || "Failed to place order. Please try again.");
    }
  });
});

// orderButtons.forEach((button) => {
//   button.addEventListener("click", async (e) => {
//     e.preventDefault();

//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Please login to place an order");
//       return;
//     }

//     const mealCard = e.target.closest(".meal");
//     const orderData = {
//       meals: [
//         {
//           mealId: mealCard.dataset.mealId, // to get the meal ID
//           name: mealCard.querySelector(".meal-name").textContent,
//           price: parseFloat(
//             mealCard
//               .querySelector(".meal-specific span strong")
//               .textContent.replace("₦", "")
//           ),
//           quantity: 1,
//         },
//       ],
//     };

//     console.log("Sending order data:", orderData);
//     console.log("Token:", token);

//     try {
//       const response = await fetch("/api/orders", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`, // Fixed template literal syntax
//         },
//         body: JSON.stringify(orderData),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         console.error("Order response error:", errorData);
//         throw new Error(errorData.message || "Failed to place order");
//       }

//       const data = await response.json();
//       alert("Order placed successfully!");
//     } catch (error) {
//       console.error("Order error:", error);
//       alert(error.message || "Failed to place order. Please try again.");
//     }
//   });
// });

// Update UI after login
function updateUIAfterLogin() {
  const accountLink = document.querySelector(".nav-cta");
  accountLink.textContent = "My Account";

  // Add a logout button
  if (!document.querySelector(".logout-btn")) {
    const logoutBtn = document.createElement("li");
    logoutBtn.innerHTML = '<a class="nav-link logout-btn" href="#">Logout</a>';
    document.querySelector(".main-nav-list").appendChild(logoutBtn);

    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      accountLink.textContent = "Account";
      logoutBtn.remove();
      alert("Logged out successfully");
    });
  }
}

// Check if user is already logged in on page load
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (token) {
    updateUIAfterLogin();
  }
});

// // SET CURRENT YEAR
// const yearEl = document.querySelector(".year");
// const currentYear = new Date().getFullYear();
// yearEl.textContent = currentYear;

// // MAKE MOBILE NAVIGATION WORK(open & close hamburger menu)
// const btnNavEl = document.querySelector(".mobile-hamburger");
// const headerEl = document.querySelector(".header");
// btnNavEl.addEventListener("click", function () {
//   headerEl.classList.toggle("nav-open");
// });

// //setting up the modal
// const modal = document.querySelector(".modal");
// const overlay = document.querySelector(".overlay");
// const btnCloseModal = document.querySelector(".btn--close-modal");
// const btnsOpenModal = document.querySelectorAll(".btn--show-modal");

// // CREATING the modal*************************
// const openModal = function (e) {
//   e.preventDefault();
//   modal.classList.remove("hidden");
//   overlay.classList.remove("hidden");
// };

// const closeModal = function () {
//   modal.classList.add("hidden");
//   overlay.classList.add("hidden");
// };

// btnsOpenModal.forEach((btn) => btn.addEventListener("click", openModal));

// btnCloseModal.addEventListener("click", closeModal);
// overlay.addEventListener("click", closeModal);

// document.addEventListener("keydown", function (e) {
//   if (e.key === "Escape" && !modal.classList.contains("hidden")) {
//     closeModal();
//   }
// });

// // SMOOTH SCROLLING ANIMATION
// const allLinks = document.querySelectorAll("a:link");
// allLinks.forEach(function (link) {
//   link.addEventListener("click", function (e) {
//     e.preventDefault();
//     const href = link.getAttribute("href");

//     // SCROLL BACK TO TOP
//     if (href === "#")
//       window.scrollTo({
//         top: 0,
//         behavior: "smooth",
//       });

//     // SCROLL TO OTHER LINKS
//     if (href !== "#" && href.startsWith("#")) {
//       const sectionEl = document.querySelector(href);
//       sectionEl.scrollIntoView({ behavior: "smooth" });
//     }

//     // CLOSE HAMBURGER MENU AFTER SELECTION
//     if (link.classList.contains("nav-link"))
//       headerEl.classList.toggle("nav-open");
//   });
// });

// // STICKY NAVIGATION
// const sectionHeroEl = document.querySelector(".home-container");
// const observer = new IntersectionObserver(
//   function (entries) {
//     const ent = entries[0];
//     console.log(ent);

//     if (ent.isIntersecting === false) {
//       document.querySelector(".header").classList.add("stickyNav");
//     } else {
//       document.querySelector(".header").classList.remove("stickyNav");
//     }
//   },

//   {
//     // inside the viewport
//     root: null,
//     threshold: 0,
//   }
// );
// observer.observe(sectionHeroEl);

// //    ******FIXING FLEXBOX GAP PROPERTY MISSING IN SOME SAFARI VERSIONS******

// // function checkFlexGap()
// //     var flex = document.createElement("div");
// //     flex.style.display = "flex";
// //     flex.style.flexDirection = "column";
// //     flex.style.rowGap = "1px";

// //     flex.appendChild(document.createElement("div"));
// //     flex.appendChild(document.createElement("div"));

// //     document.body.appendChild(flex);
// //     var isSupported = flex.scrollHeight === 1;
// //     flex.parentNode.removeChild(flex);
// //     console.log(isSupported);

// //     if (!isSupported) document.body.classList.add("no-flexbox-gap");
// // }
// // checkFlexboxGap();

// // $("button").on("click",function(){
// //     $("h1").fadeToggle();
// // });

// // $("h1").on("click",function(){
// //     $("h1").css("color","yellow");
// // });
