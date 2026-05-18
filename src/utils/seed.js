require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");

const users = [
  {
    name: "Admin",
    email: "admin@dsstore.com",
    password: "admin123",
    role: "admin",
  },
  {
    name: "John Doe",
    email: "john@example.com",
    password: "john1234",
    role: "user",
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "jane1234",
    role: "user",
  },
];

const img = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

const products = [
  {
    name: "Classic Pink Hoodie",
    description:
      "A premium cotton blend pink hoodie with cozy fleece interior, perfect for casual outings and lounging.",
    price: 1499,
    discountPrice: 1199,
    category: "Women",
    subCategory: "Tops",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Pink", "White", "Black"],
    images: [img("1556905055-8f358a7a47b2"), img("1503342217505-b0a15ec3261c")],
    stock: 25,
    isFeatured: true,
    isTrending: true,
    rating: 4.6,
    numReviews: 12,
  },
  {
    name: "Slim Fit Black Jeans",
    description:
      "Stretchable slim fit denim jeans with a modern cut. Pairs perfectly with any top.",
    price: 1899,
    discountPrice: 1499,
    category: "Men",
    subCategory: "Jeans",
    sizes: ["28", "30", "32", "34", "36"],
    colors: ["Black", "Blue"],
    images: [img("1542272604-787c3835535d"), img("1473966968600-fa801b869a1a")],
    stock: 40,
    isFeatured: true,
    isTrending: true,
    rating: 4.4,
    numReviews: 25,
  },
  {
    name: "Elegant White Dress",
    description:
      "Flowy summer white dress with delicate lace detail. A timeless wardrobe piece.",
    price: 2499,
    discountPrice: 1999,
    category: "Women",
    subCategory: "Dresses",
    sizes: ["XS", "S", "M", "L"],
    colors: ["White", "Pink"],
    images: [
      img("1490481651871-ab68de25d43d"),
      img("1539109136881-3be0616acf4b"),
    ],
    stock: 18,
    isFeatured: true,
    rating: 4.8,
    numReviews: 31,
  },
  {
    name: "Premium Cotton T-Shirt",
    description:
      "100% organic cotton crew-neck t-shirt. Soft, breathable and ultra-comfortable.",
    price: 799,
    discountPrice: 599,
    category: "Men",
    subCategory: "T-Shirts",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Black", "Pink", "Grey"],
    images: [
      img("1521572163474-6864f9cf17ab"),
      img("1583743814966-8936f5b7be1a"),
    ],
    stock: 60,
    isTrending: true,
    rating: 4.3,
    numReviews: 50,
  },
  {
    name: "Designer Pink Heels",
    description:
      "Statement pink heels with comfortable cushioning. Perfect for evening events.",
    price: 3499,
    discountPrice: 2799,
    category: "Women",
    subCategory: "Shoes",
    sizes: ["5", "6", "7", "8", "9"],
    colors: ["Pink", "Black"],
    images: [img("1543163521-1bf539c55dd2"), img("1596703263926-eb0762ee17e4")],
    stock: 12,
    isFeatured: true,
    rating: 4.5,
    numReviews: 18,
  },
  {
    name: "Casual Linen Shirt",
    description:
      "Breathable linen blend casual shirt for summer days. Effortless and stylish.",
    price: 1299,
    discountPrice: 999,
    category: "Men",
    subCategory: "Shirts",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Pink", "Beige"],
    images: [
      img("1602810318383-e386cc2a3ccf"),
      img("1620012253295-c15cc3e65df4"),
    ],
    stock: 30,
    isTrending: true,
    rating: 4.2,
    numReviews: 15,
  },
  {
    name: "Stylish Leather Handbag",
    description:
      "Premium leather handbag with multiple compartments. Elegant and spacious.",
    price: 3999,
    discountPrice: 2999,
    category: "Accessories",
    subCategory: "Bags",
    sizes: [],
    colors: ["Pink", "Black", "Brown"],
    images: [
      img("1584917865442-de89df76afd3"),
      img("1591561954557-26941169b49e"),
    ],
    stock: 20,
    isFeatured: true,
    rating: 4.7,
    numReviews: 22,
  },
  {
    name: "Minimal Wrist Watch",
    description:
      "Sleek minimal design wrist watch with leather strap. Perfect everyday accessory.",
    price: 4999,
    discountPrice: 3499,
    category: "Accessories",
    subCategory: "Watches",
    sizes: [],
    colors: ["Black", "Rose Gold"],
    images: [
      img("1523275335684-37898b6baf30"),
      img("1524592094714-0f0654e20314"),
    ],
    stock: 15,
    isTrending: true,
    rating: 4.6,
    numReviews: 28,
  },
  {
    name: "Pink Floral Top",
    description:
      "Beautiful floral print top in pink. Perfect for casual day outings.",
    price: 999,
    discountPrice: 749,
    category: "Women",
    subCategory: "Tops",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Pink", "White"],
    images: [img("1564257631407-4deb1f99d992"), img("1551163943-3f6a855d1153")],
    stock: 35,
    isTrending: true,
    rating: 4.4,
    numReviews: 19,
  },
  {
    name: "Classic Denim Jacket",
    description:
      "Timeless denim jacket that pairs with everything. Soft wash and comfortable fit.",
    price: 2299,
    discountPrice: 1799,
    category: "Men",
    subCategory: "Other",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "Black"],
    images: [img("1551028719-00167b16eac5"), img("1601333144130-8cbb312386b6")],
    stock: 22,
    rating: 4.5,
    numReviews: 14,
  },
  {
    name: "White Sneakers",
    description:
      "Trendy white sneakers with cushioned sole. Comfortable for all day wear.",
    price: 2799,
    discountPrice: 2199,
    category: "Men",
    subCategory: "Shoes",
    sizes: ["7", "8", "9", "10", "11"],
    colors: ["White", "Pink"],
    images: [img("1542291026-7eec264c27ff"), img("1600185365926-3a2ce3cdb9eb")],
    stock: 0,
    rating: 4.3,
    numReviews: 33,
  },
  {
    name: "Pink Crossbody Bag",
    description:
      "Compact pink crossbody bag with adjustable strap. Stylish and functional.",
    price: 1799,
    discountPrice: 1399,
    category: "Accessories",
    subCategory: "Bags",
    sizes: [],
    colors: ["Pink", "Black", "White"],
    images: [img("1548036328-c9fa89d128fa"), img("1566150905458-1bf1fc113f0d")],
    stock: 28,
    isFeatured: true,
    rating: 4.5,
    numReviews: 11,
  },
];

// Reusable seeding logic - works against an already-connected mongoose
const seedDatabase = async () => {
  await Order.deleteMany();
  await Cart.deleteMany();
  await Wishlist.deleteMany();
  await Product.deleteMany();
  await User.deleteMany();

  const createdUsers = await User.create(users);
  const createdProducts = await Product.create(products);

  console.log(
    `Seeded ${createdUsers.length} users, ${createdProducts.length} products`,
  );
  console.log("Login credentials:");
  console.log("  Admin: admin@dsstore.com / admin123");
  console.log("  User:  john@example.com  / john1234");
};

const destroyDatabase = async () => {
  await Order.deleteMany();
  await Cart.deleteMany();
  await Wishlist.deleteMany();
  await Product.deleteMany();
  await User.deleteMany();
  console.log("All data destroyed");
};

module.exports = { seedDatabase, destroyDatabase };

// CLI entry point: `npm run seed` or `npm run seed -- -d`
if (require.main === module) {
  const connectDB = require("../config/db");
  (async () => {
    try {
      await connectDB();
      if (process.argv[2] === "-d") {
        await destroyDatabase();
      } else {
        await seedDatabase();
      }
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("Seed error:", err);
      process.exit(1);
    }
  })();
}
