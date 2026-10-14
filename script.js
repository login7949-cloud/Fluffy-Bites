// ==========================================
// FLUFFY BITES CUSTOMER
// COMPLETE SCRIPT
// ==========================================

const FIREBASE_URL =
  "https://fluffy-74041-default-rtdb.asia-southeast1.firebasedatabase.app";

const defaultProducts = [
  {
    id: 1,
    name: "Buttermilk Pancake",
    category: "Classic",
    price: 30000,
    rating: 4.8,
    image: "https://i.pinimg.com/736x/b6/97/e8/b697e84233207d47edf6526a6261dc8f.jpg",
    description: "Classic fluffy pancakes served with butter and maple syrup. Soft, warm, and lightly sweet."
  },
  {
    id: 2,
    name: "Blueberry Pancake",
    category: "Berry",
    price: 40000,
    rating: 4.9,
    image: "https://images.ctfassets.net/rgvc7bserjck/2H6ooYaMvZBGkTwBRxASMx/72f8f02aede11df58843f58df829cd74/FB_Blueberry_Pancakes.jpg",
    description: "Fluffy pancakes with juicy blueberries, whipped cream, and a light maple drizzle."
  },
  {
    id: 3,
    name: "Chocolate Pancake",
    category: "Chocolate",
    price: 42000,
    rating: 4.9,
    image: "https://www.tastingtable.com/img/gallery/for-the-absolute-best-dessert-pancakes-stuff-them-with-cookie-dough/l-intro-1719007454.jpg",
    description: "Rich chocolate pancakes topped with chocolate chips and whipped cream."
  },
  {
    id: 4,
    name: "Strawberry Pancake",
    category: "Berry",
    price: 45000,
    rating: 4.8,
    image: "https://static.wixstatic.com/media/c8119e_49c301eb7a0243828bb5f11c76da248c~mv2_d_5632_3755_s_4_2.jpg/v1/fill/w_660%2Ch_440%2Cal_c%2Cq_80%2Cusm_0.66_1.00_0.01%2Cenc_auto/c8119e_49c301eb7a0243828bb5f11c76da248c~mv2_d_5632_3755_s_4_2.jpg",
    description: "Soft pancakes with fresh strawberries, whipped cream, and strawberry sauce."
  },
  {
    id: 5,
    name: "Banana Pancake",
    category: "Classic",
    price: 38000,
    rating: 4.7,
    image: "https://thienhongphat.vn/images/ruou%20vang/mon%20an/pancake.png",
    description: "Golden pancakes paired with sliced banana, butter, and caramel syrup."
  },
  {
    id: 6,
    name: "Biscoff Pancake",
    category: "Special",
    price: 48000,
    rating: 4.9,
    image: "https://alicerezepte.de/assets/images/1764769508442-em8urj0d.jpg",
    description: "Fluffy pancakes with cookie crumbs, Biscoff spread, and whipped cream."
  }
];

let products = [...defaultProducts];
let selectedProduct = null;
let quantity = 1;
let cart = [];
let favorites = [];
let currentCategory = "All";
let tableNumber = "";
let orderType = "Dine-in";

let currentOrderId =
  localStorage.getItem("lastOrderId") || null;

let currentConversationId =
  localStorage.getItem("fluffyCustomerConversationId") || null;

let chatPollingStarted = false;


// ==========================================
// FIREBASE HELPERS
// ==========================================

async function firebaseGet(path) {
  const response = await fetch(`${FIREBASE_URL}/${path}.json`);

  if (!response.ok) {
    throw new Error("Firebase GET failed: " + response.status);
  }

  return await response.json();
}

async function firebasePatch(path, data) {
  const response = await fetch(`${FIREBASE_URL}/${path}.json`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Firebase PATCH failed: " + response.status);
  }

  return await response.json();
}

async function firebasePost(path, data) {
  const response = await fetch(`${FIREBASE_URL}/${path}.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Firebase POST failed: " + response.status);
  }

  return await response.json();
}


// ==========================================
// GENERAL HELPERS
// ==========================================

function formatPrice(price) {
  return "Rp" + Number(price || 0).toLocaleString("id-ID");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[char];
  });
}

// Nomor struk mengikuti ID pesanan Firebase.
// Format sama dengan website Owner: # + 6 karakter terakhir.
function getReceiptNumber(orderId) {
  if (!orderId) return "-";

  return "#" + String(orderId).slice(-6).toUpperCase();
}

function getCustomerName() {
  const input = document.getElementById("customerName");
  const inputName = input ? input.value.trim() : "";

  if (inputName) {
    localStorage.setItem("fluffyCustomerName", inputName);
    return inputName;
  }

  return localStorage.getItem("fluffyCustomerName") || "Customer";
}


// ==========================================
// LOAD MENU FROM FIREBASE
// ==========================================

async function loadCustomerMenu() {
  try {
    const data = await firebaseGet("menu");

    if (!data || Object.keys(data).length === 0) {
      products = [...defaultProducts];
      displayProducts(getFilteredProducts());
      return;
    }

    products = Object.entries(data)
      .filter(([, item]) => item && item.available !== false)
      .map(([firebaseId, item], index) => ({
        id: index + 1,
        firebaseId,
        name: item.name || "Pancake",
        category: item.category || "Classic",
        price: Number(item.price) || 0,
        rating: Number(item.rating) || 4.8,
        image: item.image || "",
        description: item.description || ""
      }));

    if (products.length === 0) {
      products = [...defaultProducts];
    }

    displayProducts(getFilteredProducts());

    if (document.getElementById("favoritePage")?.classList.contains("active")) {
      renderFavorites();
    }

  } catch (error) {
    console.error("Failed to load customer menu:", error);

    products = [...defaultProducts];
    displayProducts(getFilteredProducts());
  }
}


// ==========================================
// PRODUCTS
// ==========================================

function displayProducts(list = products) {
  const grid = document.getElementById("productGrid");
  const count = document.getElementById("productCount");

  if (!grid || !count) return;

  grid.innerHTML = "";
  count.innerText = list.length + " items";

  list.forEach(product => {
    const isFavorite = favorites.includes(product.id);

    grid.innerHTML += `
      <div class="product-card">
        <button
          class="card-favorite"
          onclick="toggleFavorite(event, ${product.id})"
        >${isFavorite ? "♥" : "♡"}</button>

        <div onclick="openProduct(${product.id})">
          <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
          <h3>${escapeHTML(product.name)}</h3>

          <div class="rating">
            <span>★ ${product.rating}</span>
            · 15 min
          </div>

          <div class="product-price">
            ${formatPrice(product.price)}
          </div>
        </div>
      </div>
    `;
  });
}


// ==========================================
// PRODUCT DETAIL
// ==========================================

function openProduct(id) {
  selectedProduct = products.find(product => product.id === id);

  if (!selectedProduct) return;

  quantity = 1;

  const detailImage = document.getElementById("detailImage");
  const detailName = document.getElementById("detailName");
  const detailRating = document.getElementById("detailRating");
  const detailDescription = document.getElementById("detailDescription");
  const quantityElement = document.getElementById("quantity");

  if (detailImage) detailImage.src = selectedProduct.image;
  if (detailName) detailName.innerText = selectedProduct.name;

  if (detailRating) {
    detailRating.innerText = "★ " + selectedProduct.rating + " · 15 min";
  }

  if (detailDescription) {
    detailDescription.innerText = selectedProduct.description;
  }

  if (quantityElement) quantityElement.innerText = quantity;

  updateDetailPrice();
  updateDetailFavorite();
  showPage("detailPage");
}

function updateDetailFavorite() {
  const button = document.getElementById("detailFavorite");

  if (!button || !selectedProduct) return;

  button.innerText = favorites.includes(selectedProduct.id) ? "♥" : "♡";
}

function toggleDetailFavorite() {
  if (!selectedProduct) return;

  toggleFavorite(null, selectedProduct.id);
  updateDetailFavorite();
}

function toggleFavorite(event, id) {
  if (event) event.stopPropagation();

  if (favorites.includes(id)) {
    favorites = favorites.filter(favoriteId => favoriteId !== id);
    showMessage("Removed from favorites");
  } else {
    favorites.push(id);
    showMessage("Added to favorites ♥");
  }

  displayProducts(getFilteredProducts());

  if (selectedProduct && selectedProduct.id === id) {
    updateDetailFavorite();
  }

  const favoritePage = document.getElementById("favoritePage");

  if (favoritePage && favoritePage.classList.contains("active")) {
    renderFavorites();
  }
}


// ==========================================
// FAVORITES
// ==========================================

function openFavorites() {
  showPage("favoritePage");
  renderFavorites();
  setActiveNav("navFavorite");
}

function renderFavorites() {
  const container = document.getElementById("favoriteProducts");

  if (!container) return;

  const favoriteProducts = products.filter(product =>
    favorites.includes(product.id)
  );

  if (favoriteProducts.length === 0) {
    container.innerHTML = `
      <div class="empty-favorite">
        <div>♡</div>
        <p>No favorite pancakes yet.</p>
        <small>Tap the heart icon on a pancake to save it here.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  favoriteProducts.forEach(product => {
    container.innerHTML += `
      <div class="product-card">
        <button
          class="card-favorite"
          onclick="toggleFavorite(event, ${product.id})"
        >♥</button>

        <div onclick="openProduct(${product.id})">
          <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
          <h3>${escapeHTML(product.name)}</h3>

          <div class="rating">
            <span>★ ${product.rating}</span>
            · 15 min
          </div>

          <div class="product-price">
            ${formatPrice(product.price)}
          </div>
        </div>
      </div>
    `;
  });
}


// ==========================================
// QUANTITY
// ==========================================

function changeQuantity(amount) {
  quantity += amount;

  if (quantity < 1) quantity = 1;

  const quantityElement = document.getElementById("quantity");

  if (quantityElement) {
    quantityElement.innerText = quantity;
  }

  updateDetailPrice();
}

function updateDetailPrice() {
  if (!selectedProduct) return;

  const priceElement = document.getElementById("detailPrice");

  if (priceElement) {
    priceElement.innerText = formatPrice(
      selectedProduct.price * quantity
    );
  }
}


// ==========================================
// CART
// ==========================================

function addToCart() {
  if (!selectedProduct) return;

  const existing = cart.find(item => item.id === selectedProduct.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      quantity
    });
  }

  updateCartBadge();
  showMessage("Added to cart");
  openCart();
}

function openCart() {
  showPage("cartPage");
  renderCart();
  setActiveNav("navCart");
}

function renderCart() {
  const container = document.getElementById("cartItems");

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:#8B7B72">
        <div style="font-size:45px">🛒</div>
        <p>Your cart is empty.</p>
      </div>
    `;

    const subtotal = document.getElementById("subtotal");
    const total = document.getElementById("total");
    const cartOrderType = document.getElementById("cartOrderType");

    if (subtotal) subtotal.innerText = "Rp0";
    if (total) total.innerText = "Rp0";
    if (cartOrderType) cartOrderType.innerText = "Not selected";

    updateCartBadge();
    return;
  }

  container.innerHTML = "";

  let total = 0;

  cart.forEach(item => {
    total += item.price * item.quantity;

    container.innerHTML += `
      <div class="cart-item">
        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}">

        <div>
          <h3>${escapeHTML(item.name)}</h3>
          <p>${formatPrice(item.price)}</p>

          <div class="cart-quantity">
            <button onclick="changeCartQuantity(${item.id}, -1)">−</button>
            <span>${item.quantity}</span>
            <button onclick="changeCartQuantity(${item.id}, 1)">+</button>
          </div>
        </div>

        <button
          onclick="removeCart(${item.id})"
          style="border:none;background:none;font-size:18px;color:#8B7B72"
        >×</button>
      </div>
    `;
  });

  const subtotal = document.getElementById("subtotal");
  const totalElement = document.getElementById("total");
  const cartOrderType = document.getElementById("cartOrderType");

  if (subtotal) subtotal.innerText = formatPrice(total);
  if (totalElement) totalElement.innerText = formatPrice(total);
  if (cartOrderType) cartOrderType.innerText = orderType;

  updateCartBadge();
}

function changeCartQuantity(id, amount) {
  const item = cart.find(product => product.id === id);

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(product => product.id !== id);
  }

  updateCartBadge();
  renderCart();
}

function removeCart(id) {
  cart = cart.filter(product => product.id !== id);

  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");

  if (!badge) return;

  badge.innerText = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );
}


// ==========================================
// TABLE
// ==========================================

function openTable() {
  showPage("tablePage");
  setActiveNav("navTable");
  updateTableDisplay();
}

function saveTableNumber() {
  const input = document.getElementById("tableNumber");

  if (!input) return;

  const value = input.value.trim();

  if (!value) {
    showMessage("Please enter your table number");
    return;
  }

  tableNumber = value;
  localStorage.setItem("fluffyTableNumber", tableNumber);

  updateTableDisplay();
  showMessage("Table number saved");
}

function updateTableDisplay() {
  const current = document.getElementById("currentTable");

  if (!current) return;

  current.innerText = tableNumber
    ? "Current table: Table " + tableNumber
    : "No table number saved";
}


// ==========================================
// ORDER TYPE
// ==========================================

function selectOrderType(type) {
  orderType = type;

  const dineIn = document.getElementById("dineInOption");
  const takeaway = document.getElementById("takeawayOption");
  const tableSection = document.getElementById("tableCheckoutSection");

  if (dineIn) dineIn.classList.remove("selected");
  if (takeaway) takeaway.classList.remove("selected");

  if (type === "Dine-in") {
    if (dineIn) dineIn.classList.add("selected");
    if (tableSection) tableSection.style.display = "block";
  } else {
    if (takeaway) takeaway.classList.add("selected");
    if (tableSection) tableSection.style.display = "none";
  }

  renderCart();
}


// ==========================================
// CUSTOMER CHAT: FIREBASE
// ==========================================

function createConversationId() {
  if (currentConversationId) {
    return currentConversationId;
  }

  currentConversationId =
    "customer_" +
    Date.now() +
    "_" +
    Math.random().toString(36).slice(2, 10);

  localStorage.setItem(
    "fluffyCustomerConversationId",
    currentConversationId
  );

  return currentConversationId;
}

async function ensureConversation() {
  const conversationId = createConversationId();
  const customerName = getCustomerName();

  await firebasePatch(`chats/${conversationId}`, {
    customerName,
    updatedAt: new Date().toISOString()
  });

  return conversationId;
}

function openMessages() {
  showPage("messagePage");
  setActiveNav("navMessage");

  const badge = document.getElementById("messageBadge");

  if (badge) badge.style.display = "none";

  loadCustomerChat();
  startCustomerChatPolling();
}

function handleChatKey(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  const input = document.getElementById("chatInput");

  if (!input) return;

  const message = input.value.trim();

  if (!message) return;

  input.disabled = true;

  try {
    const conversationId = await ensureConversation();

    await firebasePost(
      `chats/${conversationId}/messages`,
      {
        sender: "customer",
        text: message,
        createdAt: new Date().toISOString()
      }
    );

    input.value = "";

    await loadCustomerChat();

  } catch (error) {
    console.error("Failed to send customer message:", error);
    showMessage("Message could not be sent. Please try again.");
  } finally {
    input.disabled = false;
    input.focus();
  }
}

async function loadCustomerChat() {
  if (!currentConversationId) return;

  try {
    const conversation = await firebaseGet(
      `chats/${currentConversationId}`
    );

    const container = document.getElementById("chatMessages");

    if (!container) return;

    if (!conversation || !conversation.messages) {
      container.innerHTML = `
        <div class="message worker">
          <div class="message-bubble">
            Hello! How can we help you today? 😊
          </div>
          <small>Fluffy Bites</small>
        </div>
      `;

      return;
    }

    const messages = Object.values(conversation.messages)
      .sort((a, b) => {
        return new Date(a.createdAt || 0) -
               new Date(b.createdAt || 0);
      });

    container.innerHTML = messages.map(message => {
      const isCustomer = message.sender === "customer";

      return `
        <div class="message ${isCustomer ? "user" : "worker"}">
          <div class="message-bubble">
            ${escapeHTML(message.text || "")}
          </div>
          <small>
            ${isCustomer ? "You" : "Fluffy Bites"}
            · ${formatChatTime(message.createdAt)}
          </small>
        </div>
      `;
    }).join("");

    container.scrollTop = container.scrollHeight;

  } catch (error) {
    console.error("Failed to load customer chat:", error);
  }
}

function formatChatTime(value) {
  if (!value) return "Now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function startCustomerChatPolling() {
  if (chatPollingStarted) return;

  chatPollingStarted = true;

  setInterval(() => {
    const messagePage = document.getElementById("messagePage");

    if (
      currentConversationId &&
      messagePage &&
      messagePage.classList.contains("active")
    ) {
      loadCustomerChat();
    }
  }, 3000);
}


// ==========================================
// CHECKOUT
// ==========================================

function openCheckout() {
  if (cart.length === 0) {
    showMessage("Your cart is empty");
    return;
  }

  if (orderType === "Dine-in" && !tableNumber) {
    showMessage("Please enter your table number first");
    openTable();
    return;
  }

  const checkoutTotal = document.getElementById("checkoutTotal");
  const checkoutTable = document.getElementById("checkoutTable");

  if (checkoutTotal) {
    checkoutTotal.innerText = formatPrice(getCartTotal());
  }

  if (checkoutTable) {
    checkoutTable.value = tableNumber
      ? "Table " + tableNumber
      : "";
  }

  const orderTypeInput = document.querySelector(
    'input[name="orderType"][value="' + orderType + '"]'
  );

  if (orderTypeInput) {
    orderTypeInput.checked = true;
  }

  selectOrderType(orderType);
  showPage("checkoutPage");
}

function getCartTotal() {
  return cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}


// ==========================================
// ORDER RECEIPT
// ==========================================

function displayOrderReceipt(orderId, orderData) {
  const receiptNumber = getReceiptNumber(orderId);

  const successPageIds = [
    "successPage",
    "success",
    "success-page"
  ];

  let successPage = null;

  for (const id of successPageIds) {
    const element = document.getElementById(id);

    if (element) {
      successPage = element;
      break;
    }
  }

  if (!successPage) {
    showMessage("Order placed! Receipt: " + receiptNumber);
    return;
  }

  // Hapus resi yang dibuat oleh script sebelumnya agar tidak berulang.
  const generatedReceipt =
    successPage.querySelector("#generatedReceiptNumber");

  if (generatedReceipt) {
    generatedReceipt.remove();
  }

  // Perbarui nomor resi yang sudah ada di HTML.
  const existingReceipt =
    successPage.querySelector("#receiptNumber") ||
    successPage.querySelector("#orderNumber") ||
    successPage.querySelector(".receipt-number");

  if (existingReceipt) {
    existingReceipt.textContent = receiptNumber;
  } else {
    // Jika HTML masih berisi Order #FB001 tanpa elemen khusus,
    // ganti nomor tetap tersebut dengan nomor pesanan Firebase.
    const textElements = successPage.querySelectorAll(
      "p, span, div, h1, h2, h3, h4, strong"
    );

    let replaced = false;

    for (const element of textElements) {
      if (
        element.children.length === 0 &&
        /#FB001/.test(element.textContent)
      ) {
        element.textContent = element.textContent.replace(
          /#FB001/g,
          receiptNumber
        );

        replaced = true;
      }
    }

    // Jika nomor tetap tidak ditemukan, tambahkan kotak resi.
    if (!replaced) {
      const receiptBox = document.createElement("div");

      receiptBox.id = "generatedReceiptNumber";

      receiptBox.style.cssText =
        "margin:16px auto;padding:14px;border-radius:12px;" +
        "background:#fff0f5;text-align:center;max-width:320px;";

      const label = document.createElement("p");
      label.style.cssText =
        "margin:0 0 6px;font-size:13px;color:#8B7B72;";
      label.textContent = "Your Receipt Number";

      const number = document.createElement("strong");
      number.style.cssText =
        "font-size:24px;color:#d65a83;";
      number.textContent = receiptNumber;

      const note = document.createElement("p");
      note.style.cssText =
        "margin:8px 0 0;font-size:12px;color:#8B7B72;";
      note.textContent = "Please keep this number for your order.";

      receiptBox.append(label, number, note);
      successPage.prepend(receiptBox);
    }
  }

  const successMessage = document.getElementById("successMessage");

  if (successMessage) {
    successMessage.textContent =
      `Thank you, ${orderData.customerName}! Your order has been placed successfully.`;
  }

  showPage(successPage.id);
}


// ==========================================
// PLACE ORDER
// ==========================================

async function placeOrder() {
  const customerNameInput = document.getElementById("customerName");

  if (!customerNameInput) {
    showMessage("Customer name field was not found.");
    return;
  }

  const customerName = customerNameInput.value.trim();

  if (!customerName) {
    showMessage("Please enter your name.");
    return;
  }

  if (cart.length === 0) {
    showMessage("Your cart is empty.");
    return;
  }

  if (orderType === "Dine-in" && !tableNumber) {
    showMessage("Please enter your table number.");
    return;
  }

  localStorage.setItem("fluffyCustomerName", customerName);

  const paymentOption = document.querySelector(
    'input[name="payment"]:checked'
  );

  const order = {
    customerName,
    orderType,
    tableNumber: orderType === "Dine-in" ? String(tableNumber) : "",
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity)
    })),
    total: getCartTotal(),
    paymentMethod: paymentOption
      ? paymentOption.value
      : "Not selected",
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  try {
    const response = await fetch(`${FIREBASE_URL}/orders.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      throw new Error("Firebase returned HTTP " + response.status);
    }

    const result = await response.json();

    if (!result || !result.name) {
      throw new Error("Firebase did not return an order ID.");
    }

    // Ambil ID pesanan asli dari Firebase.
    currentOrderId = result.name;

    // Simpan ID asli agar pengecekan status menggunakan pesanan yang benar.
    localStorage.setItem("lastOrderId", currentOrderId);

    // Kosongkan keranjang setelah pesanan berhasil disimpan.
    cart = [];

    updateCartBadge();
    renderCart();

    // Tampilkan nomor struk yang sesuai dengan ID Firebase.
    displayOrderReceipt(currentOrderId, order);

    showMessage(
      "Order placed! Receipt: " + getReceiptNumber(currentOrderId)
    );

  } catch (error) {
    console.error("Failed to save order:", error);

    showMessage(
      "Order could not be saved. Please check your connection."
    );
  }
}


// ==========================================
// ORDER STATUS CHECK
// ==========================================

async function checkLastOrderStatus() {
  if (!currentOrderId) return;

  try {
    const order = await firebaseGet(
      `orders/${currentOrderId}`
    );

    if (!order) return;

    const statusElement = document.getElementById("orderStatus");

    if (statusElement) {
      statusElement.textContent = order.status || "Pending";
    }

    const receiptElement =
      document.getElementById("receiptNumber") ||
      document.getElementById("orderNumber") ||
      document.querySelector(".receipt-number");

    if (receiptElement) {
      receiptElement.textContent = getReceiptNumber(currentOrderId);
    }

  } catch (error) {
    console.error("Failed to check order status:", error);
  }
}


// ==========================================
// CATEGORY AND SEARCH
// ==========================================

function filterCategory(category, button) {
  currentCategory = category;

  document.querySelectorAll(".category").forEach(btn => {
    btn.classList.remove("active");
  });

  if (button) {
    button.classList.add("active");
  }

  displayProducts(getFilteredProducts());
}

function getFilteredProducts() {
  let result = products;

  if (currentCategory !== "All") {
    result = result.filter(product =>
      product.category === currentCategory
    );
  }

  return result;
}

function searchProducts() {
  const searchInput = document.getElementById("searchInput");

  if (!searchInput) return;

  const keyword = searchInput.value.toLowerCase();

  const result = getFilteredProducts().filter(product =>
    product.name.toLowerCase().includes(keyword)
  );

  displayProducts(result);
}


// ==========================================
// PAGE NAVIGATION
// ==========================================

function showPage(pageId) {
  const targetPage = document.getElementById(pageId);

  if (!targetPage) {
    console.error("Page not found:", pageId);
    return false;
  }

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  targetPage.classList.add("active");

  return true;
}

function setActiveNav(navId) {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  const selected = document.getElementById(navId);

  if (selected) {
    selected.classList.add("active");
  }
}

function goHome() {
  showPage("homePage");
  setActiveNav("navHome");
}


// ==========================================
// TOAST MESSAGE
// ==========================================

function showMessage(message) {
  const toast = document.getElementById("toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.innerText = message;
  toast.style.display = "block";

  clearTimeout(window.fluffyToastTimeout);

  window.fluffyToastTimeout = setTimeout(() => {
    toast.style.display = "none";
  }, 2500);
}


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  tableNumber = localStorage.getItem("fluffyTableNumber") || "";

  displayProducts();
  updateCartBadge();
  updateTableDisplay();

  await loadCustomerMenu();

  if (currentConversationId) {
    loadCustomerChat();
  }

  // Perbarui menu Owner setiap 10 detik.
  setInterval(loadCustomerMenu, 10000);

  // Perbarui status pesanan terakhir setiap 5 detik.
  setInterval(checkLastOrderStatus, 5000);
});