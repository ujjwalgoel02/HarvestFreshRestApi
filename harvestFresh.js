const Joi = require("joi");
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// ─── File paths ───────────────────────────────────────────────────────────────
const PRODUCTS_FILE = path.join(__dirname, "sampleData.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

// ─── Load persisted data ──────────────────────────────────────────────────────
const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));

// ─── Persist helpers ─────────────────────────────────────────────────────────
function saveProducts() {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}
function saveOrders() {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// ─── Validation schema ────────────────────────────────────────────────────────
const productSchema = {
  name: Joi.string().min(2).required(),
  description: Joi.string().min(3).required(),
  categoryId: Joi.string().valid("fruits", "vegetables").required(),
  unit: Joi.string().valid("kg", "pack", "each", "bunch").required(),
  price: Joi.number().positive().required(),
  currency: Joi.string().length(3).default("GBP"),
  stock: Joi.number().integer().min(0).required(),
  organic: Joi.boolean().default(false),
  origin: Joi.string().required(),
  sku: Joi.string().required(),
  images: Joi.array().items(Joi.string().uri()).default([]),
};

function validateProduct(product) {
  return Joi.validate(product, productSchema, { allowUnknown: false });
}

function findProduct(id) {
  return products.find((p) => p.id === parseInt(id));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.send("HarvestFresh API is running!");
});

// GET /api/products — optional ?category=fruits|vegetables filter
app.get("/api/products", (req, res) => {
  const { category } = req.query;
  if (category) {
    const filtered = products.filter((p) => p.categoryId === category);
    return res.send(filtered);
  }
  res.send(products);
});

// GET /api/products/:id
app.get("/api/products/:id", (req, res) => {
  const product = findProduct(req.params.id);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");
  res.send(product);
});

// POST /api/products
app.post("/api/products", (req, res) => {
  const { error, value } = validateProduct(req.body);
  if (error)
    return res.status(400).send(`Error: ${error.details[0].message}`);

  const product = {
    id: products.length + 1,
    ...value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  products.push(product);
  saveProducts();
  res.status(201).send(product);
});

// PUT /api/products/:id
app.put("/api/products/:id", (req, res) => {
  const product = findProduct(req.params.id);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  const { error, value } = validateProduct(req.body);
  if (error)
    return res.status(400).send(`Error: ${error.details[0].message}`);

  Object.assign(product, value, { updatedAt: new Date().toISOString() });
  saveProducts();
  res.send(product);
});

// DELETE /api/products/:id
app.delete("/api/products/:id", (req, res) => {
  const product = findProduct(req.params.id);
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  const index = products.indexOf(product);
  products.splice(index, 1);
  saveProducts();
  res.send(product);
});

// ─── Cart History ─────────────────────────────────────────────────────────────

const orderSchema = {
  userId: Joi.string().min(1).required(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().positive().required(),
      })
    )
    .min(1)
    .required(),
};

function validateOrder(order) {
  return Joi.validate(order, orderSchema, { allowUnknown: false });
}

// POST /api/orders — push a new purchase to cart history
app.post("/api/orders", (req, res) => {
  const { error, value } = validateOrder(req.body);
  if (error)
    return res.status(400).send(`Error: ${error.details[0].message}`);

  // Resolve each item against products and calculate totals
  const resolvedItems = [];
  for (const item of value.items) {
    const product = findProduct(item.productId);
    if (!product)
      return res
        .status(404)
        .send(`Product with ID ${item.productId} was not found.`);

    resolvedItems.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      pricePerUnit: product.price,
      currency: product.currency,
      quantity: item.quantity,
      subtotal: parseFloat((product.price * item.quantity).toFixed(2)),
    });
  }

  const totalAmount = parseFloat(
    resolvedItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
  );

  const order = {
    orderId: orders.length + 1,
    userId: value.userId,
    items: resolvedItems,
    totalAmount,
    currency: resolvedItems[0].currency,
    status: "placed",
    placedAt: new Date().toISOString(),
  };

  orders.push(order);
  saveOrders();
  res.status(201).send(order);
});

// GET /api/orders — get all orders (cart history)
app.get("/api/orders", (req, res) => {
  res.send(orders);
});

// GET /api/orders/:orderId — get a single order by ID
app.get("/api/orders/:orderId", (req, res) => {
  const order = orders.find((o) => o.orderId === parseInt(req.params.orderId));
  if (!order)
    return res.status(404).send("The order with the given ID was not found.");
  res.send(order);
});

// GET /api/orders/user/:userId — get full purchase history for a user
app.get("/api/orders/user/:userId", (req, res) => {
  const userOrders = orders.filter((o) => o.userId === req.params.userId);
  res.send(userOrders);
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`HarvestFresh API listening at http://localhost:${port}`);
});
