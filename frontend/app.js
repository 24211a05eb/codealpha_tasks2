const app = document.getElementById("app");
const toast = document.getElementById("toast");
const API = "/api";

let authState = {
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null")
};

function toastMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body !== "string") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  if (authState.token) headers.Authorization = `Bearer ${authState.token}`;
  const response = await fetch(API + path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function avatar(user, small = false) {
  if (user?.profilePicture) {
    return `<img class="avatar${small ? " small" : ""}" src="${escapeHtml(user.profilePicture)}" alt="${escapeHtml(user.name || user.username)}">`;
  }
  const letter = escapeHtml((user?.name || user?.username || "?").charAt(0).toUpperCase());
  return `<div class="avatar${small ? " small" : ""}">${letter}</div>`;
}

function setAuth(data) {
  authState = { token: data.token, user: data.user };
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  location.hash = "#/";
  render();
}

function logout() {
  authState = { token: null, user: null };
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.hash = "#/login";
  render();
}

function authView(mode = "login") {
  app.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card">
        <p class="brand">Mini Social</p>
        <h1>${mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <form id="auth-form">
          ${mode === "register" ? `
            <div class="field"><label for="name">Name</label><input id="name" name="name" maxlength="50" required></div>
            <div class="field"><label for="username">Username</label><input id="username" name="username" maxlength="30" pattern="[A-Za-z0-9_]{3,30}" required></div>
          ` : ""}
          ${mode === "register" ? `
            <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required></div>
          ` : `
            <div class="field"><label for="identifier">Email or username</label><input id="identifier" name="identifier" required></div>
          `}
          <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" minlength="6" required></div>
          <button class="primary-btn" type="submit">${mode === "login" ? "Log in" : "Create account"}</button>
        </form>
        <p class="switch-auth">${mode === "login" ? "New here?" : "Already have an account?"}
          <button id="switch-auth">${mode === "login" ? "Create account" : "Log in"}</button>
        </p>
      </section>
    </main>`;
  document.getElementById("switch-auth").onclick = () => authView(mode === "login" ? "register" : "login");
  document.getElementById("auth-form").onsubmit = async (event) => {
    event.preventEvent?.();
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const data = await api(mode === "login" ? "/auth/login" : "/auth/register", { method: "POST", body });
      setAuth(data);
      toastMessage(mode === "login" ? "Welcome back!" : "Account created!");
    } catch (error) {
      toastMessage(error.message);
    }
  };
}

function navbar() {
  return `
    <nav class="navbar">
      <div class="nav-inner">
        <button class="logo" data-route="#/">Mini Social</button>
        <div class="search">
          <input id="user-search" placeholder="Search users" autocomplete="off">
          <div id="search-results" class="search-results" hidden></div>
        </div>
        <button class="nav-avatar" data-route="#/profile/${encodeURIComponent(authState.user.username)}" aria-label="Your profile">${avatar(authState.user, true)}</button>
      </div>
    </nav>`;
}

function wireNavigation(root = document) {
  root.querySelectorAll("[data-route]").forEach((element) => {
    element.onclick = () => { location.hash = element.dataset.route; };
  });
}

function postTemplate(post) {
  const ownPost = post.author._id === authState.user._id || post.author === authState.user._id;
  return `
    <article class="card post" data-post-id="${post._id}">
      <div class="post-header">
        ${avatar(post.author)}
        <button class="post-author" data-route="#/profile/${encodeURIComponent(post.author.username)}">
          <strong>${escapeHtml(post.author.name)}</strong>
          <span>@${escapeHtml(post.author.username)} · ${new Date(post.createdAt).toLocaleString()}</span>
        </button>
      </div>
      <p class="post-content">${escapeHtml(post.content)}</p>
      <div class="post-actions">
        <button class="action-btn like-btn ${post.isLiked ? "active" : ""}" data-action="like">
          ${post.isLiked ? "♥" : "♡"} <span>${post.likesCount}</span>
        </button>
        <button class="action-btn" data-action="focus-comment">💬 <span>${post.comments.length}</span></button>
        ${ownPost ? `<button class="action-btn delete-btn" data-action="delete-post">Delete</button>` : ""}
      </div>
      <div class="comments">
        ${post.comments.map((comment) => `
          <div class="comment">
            ${avatar(comment.author, true)}
            <div class="comment-body">
              <strong>@${escapeHtml(comment.author.username)}</strong>
              <p>${escapeHtml(comment.content)}</p>
            </div>
          </div>`).join("")}
        <form class="comment-form">
          <input name="comment" maxlength="300" placeholder="Write a comment..." required>
          <button class="secondary-btn" type="submit">Send</button>
        </form>
      </div>
    </article>`;
}

async function homeView() {
  app.innerHTML = `${navbar()}<main class="layout"><section class="card composer">
    <textarea id="post-content" maxlength="500" placeholder="What's happening?" aria-label="Post content"></textarea>
    <div class="composer-footer"><button id="create-post" class="primary-btn">Post</button></div>
  </section><div id="feed"><p class="empty">Loading posts...</p></div></main>`;
  wireNavigation();
  setupSearch();
  wirePostEvents();
  document.getElementById("create-post").onclick = async () => {
    const content = document.getElementById("post-content").value;
    try {
      await api("/posts", { method: "POST", body: { content } });
      document.getElementById("post-content").value = "";
      await loadFeed();
      toastMessage("Post published");
    } catch (error) {
      toastMessage(error.message);
    }
  };
  await loadFeed();
}

async function loadFeed() {
  try {
    const posts = await api("/posts");
    document.getElementById("feed").innerHTML = posts.length
      ? posts.map(postTemplate).join("")
      : `<section class="card empty">No posts yet. Create the first one!</section>`;
    wirePostEvents();
  } catch (error) {
    toastMessage(error.message);
  }
}

function wirePostEvents() {
  document.querySelectorAll(".post").forEach((postElement) => {
    const postId = postElement.dataset.postId;
    postElement.querySelector('[data-action="like"]').onclick = async (event) => {
      const button = event.currentTarget;
      const liked = button.classList.contains("active");
      try {
        const data = await api(`/posts/${postId}/like`, { method: liked ? "DELETE" : "PUT" });
        button.classList.toggle("active", data.isLiked);
        button.innerHTML = `${data.isLiked ? "♥" : "♡"} <span>${data.likesCount}</span>`;
      } catch (error) {
        toastMessage(error.message);
      }
    };
    postElement.querySelector('[data-action="focus-comment"]').onclick = () => {
      postElement.querySelector(".comment-form input").focus();
    };
    const deleteButton = postElement.querySelector('[data-action="delete-post"]');
    if (deleteButton) deleteButton.onclick = async () => {
      if (!confirm("Delete this post?")) return;
      try {
        await api(`/posts/${postId}`, { method: "DELETE" });
        await loadFeed();
      } catch (error) {
        toastMessage(error.message);
      }
    };
    postElement.querySelector(".comment-form").onsubmit = async (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.comment;
      try {
        await api(`/comments/${postId}`, { method: "POST", body: { content: input.value } });
        await loadFeed();
      } catch (error) {
        toastMessage(error.message);
      }
    };
  });
}

function setupSearch() {
  const input = document.getElementById("user-search");
  const results = document.getElementById("search-results");
  let timeout;
  input.oninput = () => {
    clearTimeout(timeout);
    const query = input.value.trim();
    if (!query) { results.hidden = true; return; }
    timeout = setTimeout(async () => {
      try {
        const users = await api(`/users/search?q=${encodeURIComponent(query)}`);
        results.innerHTML = users.length ? users.map((user) => `
          <button class="search-result" data-username="${escapeHtml(user.username)}">
            ${avatar(user, true)}
            <span><strong>${escapeHtml(user.name)}</strong><br>@${escapeHtml(user.username)}</span>
          </button>`).join("") : `<div class="search-result">No users found</div>`;
        results.hidden = false;
        results.querySelectorAll("[data-username]").forEach((button) => {
          button.onclick = () => { location.hash = `#/profile/${encodeURIComponent(button.dataset.username)}`; };
        });
      } catch (error) {
        toastMessage(error.message);
      }
    }, 250);
  };
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search")) results.hidden = true;
  }, { once: false });
}

async function profileView(username) {
  app.innerHTML = `${navbar()}<main class="layout"><p class="empty">Loading profile...</p></main>`;
  wireNavigation();
  setupSearch();
  try {
    const data = await api(`/users/${encodeURIComponent(username)}`);
    const ownProfile = data.user._id === authState.user._id;
    app.innerHTML = `${navbar()}<main class="layout">
      <section class="card profile-header">
        ${avatar(data.user)}
        <div class="profile-info">
          <h1>${escapeHtml(data.user.name)}</h1>
          <div class="username">@${escapeHtml(data.user.username)}</div>
          <p class="bio">${escapeHtml(data.user.bio || "")}</p>
          <div class="profile-stats">
            <span><strong>${data.followersCount}</strong> followers</span>
            <span><strong>${data.followingCount}</strong> following</span>
          </div>
        </div>
        <div class="profile-actions">
          ${ownProfile
            ? `<button id="edit-profile" class="secondary-btn">Edit profile</button><button id="logout" class="secondary-btn">Log out</button>`
            : `<button id="follow" class="primary-btn">${data.isFollowing ? "Following" : "Follow"}</button>`}
        </div>
      </section>
      <div id="profile-feed">${data.posts.length ? data.posts.map((post) => {
        post.likesCount = post.likes.length;
        post.isLiked = post.likes.some((id) => id === authState.user._id || id._id === authState.user._id);
        post.comments = [];
        return postTemplate(post);
      }).join("") : `<section class="card empty">No posts yet.</section>`}</div>
    </main>`;
    wireNavigation();
    setupSearch();
    wirePostEvents();
    if (ownProfile) {
      document.getElementById("logout").onclick = logout;
      document.getElementById("edit-profile").onclick = () => editProfileDialog(data.user);
    } else {
      const followButton = document.getElementById("follow");
      followButton.onclick = async () => {
        try {
          const result = await api(`/users/${encodeURIComponent(username)}/follow`, { method: data.isFollowing ? "DELETE" : "PUT" });
          data.isFollowing = result.isFollowing;
          followButton.textContent = result.isFollowing ? "Following" : "Follow";
          await profileView(username);
        } catch (error) {
          toastMessage(error.message);
        }
      };
    }
  } catch (error) {
    app.innerHTML = `${navbar()}<main class="layout"><section class="card empty">${escapeHtml(error.message)}</section></main>`;
  }
}

function editProfileDialog(user) {
  const name = prompt("Name", user.name);
  if (name === null) return;
  const bio = prompt("Bio", user.bio || "");
  if (bio === null) return;
  const profilePicture = prompt("Profile picture URL", user.profilePicture || "");
  if (profilePicture === null) return;
  api("/users/me/profile", { method: "PUT", body: { name, bio, profilePicture } })
    .then((updated) => {
      authState.user = updated;
      localStorage.setItem("user", JSON.stringify(updated));
      toastMessage("Profile updated");
      render();
    })
    .catch((error) => toastMessage(error.message));
}

async function render() {
  if (!authState.token) {
    authView(location.hash === "#/register" ? "register" : "login");
    return;
  }
  const hash = location.hash || "#/";
  if (hash === "#/" || hash === "") await homeView();
  else if (hash.startsWith("#/profile/")) {
    await profileView(decodeURIComponent(hash.slice("#/profile/".length)));
  } else if (hash === "#/login" || hash === "#/register") {
    authView(hash === "#/register" ? "register" : "login");
  } else await homeView();
}

window.addEventListener("hashchange", render);
render();
