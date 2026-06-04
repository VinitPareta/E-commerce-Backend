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
    email: "vinitpareta7@gmail.com",
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
  // ── EXISTING PRODUCTS (unchanged) ─────────────────────────────────
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
    images: [
      "https://images.unsplash.com/photo-1600923678350-bffdd369a828?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Q2xhc3NpYyUyMFBpbmslMjBIb29kaWV8ZW58MHx8MHx8fDA%3D",
    ],
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
      "https://images.unsplash.com/photo-1691316089197-1269faeb3af7?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8RWxlZ2FudCUyMFdoaXRlJTIwRHJlc3N8ZW58MHx8MHx8fDA%3D",
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
    stock: 0,
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
      "https://images.unsplash.com/photo-1740711152088-88a009e877bb?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Q2FzdWFsJTIwTGluZW4lMjBTaGlydHxlbnwwfHwwfHx8MA%3D%3D",
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
    images: [
      "https://images.unsplash.com/photo-1555583743-991174c11425?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Q2xhc3NpYyUyMERlbmltJTIwSmFja2V0fGVufDB8fDB8fHww",
    ],
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
    images: [
      "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8V2hpdGUlMjBTbmVha2Vyc3xlbnwwfHwwfHx8MA%3D%3D",
    ],
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
    images: [
      "https://images.unsplash.com/photo-1681747685985-a401c271156c?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8UGluayUyMENyb3NzYm9keSUyMEJhZ3xlbnwwfHwwfHx8MA%3D%3D",
    ],
    stock: 28,
    isFeatured: true,
    rating: 4.5,
    numReviews: 11,
  },

  // ── NEW: MEN TOPS ──────────────────────────────────────────────────
  {
    name: "Oxford Button-Down Shirt",
    description:
      "Crisp oxford weave button-down shirt. Versatile enough for office or weekend.",
    price: 1599,
    discountPrice: 1199,
    category: "Men",
    subCategory: "Shirts",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Blue", "Grey"],
    images: [
      "https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8T3hmb3JkJTIwQnV0dG9uLURvd24lMjBTaGlydHxlbnwwfHwwfHx8MA%3D%3D",
    ],
    stock: 35,
    isFeatured: true,
    rating: 4.5,
    numReviews: 20,
  },
  {
    name: "Striped Navy Polo",
    description:
      "Classic navy polo with white stripes. Smart casual essential for every wardrobe.",
    price: 999,
    discountPrice: 799,
    category: "Men",
    subCategory: "T-Shirts",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Navy", "White"],
    images: [
      "https://plus.unsplash.com/premium_photo-1727967194388-d838e1f37dec?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fFN0cmlwZWQlMjBOYXZ5JTIwUG9sb3xlbnwwfHwwfHx8MA%3D%3D",
    ],
    stock: 45,
    isTrending: true,
    rating: 4.2,
    numReviews: 18,
  },
  {
    name: "Graphic Print Oversized Tee",
    description:
      "Trendy oversized graphic tee in soft cotton. Streetwear staple for bold looks.",
    price: 899,
    discountPrice: 699,
    category: "Men",
    subCategory: "T-Shirts",
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Black", "White", "Grey"],
    images: [
      "https://images.unsplash.com/photo-1775817104298-522393e1d72b?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8R3JhcGhpYyUyMFByaW50JTIwT3ZlcnNpemVkJTIwVGVlfGVufDB8fDB8fHww",
    ],
    stock: 50,
    isTrending: true,
    rating: 4.1,
    numReviews: 30,
  },
  {
    name: "Formal Black Blazer",
    description:
      "Tailored slim fit black blazer. Elevates any outfit from casual to sharp.",
    price: 3999,
    discountPrice: 2999,
    category: "Men",
    subCategory: "Other",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Navy"],
    images: [
      "https://plus.unsplash.com/premium_photo-1661326280617-ba5f611d1746?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8Rm9ybWFsJTIwQmxhY2slMjBCbGF6ZXJ8ZW58MHx8MHx8fDA%3D",
    ],
    stock: 18,
    isFeatured: true,
    rating: 4.7,
    numReviews: 24,
  },

  // ── NEW: MEN BOTTOMS ───────────────────────────────────────────────
  {
    name: "Khaki Chino Pants",
    description:
      "Slim fit khaki chinos in a versatile neutral tone. Perfect for smart casual looks.",
    price: 1699,
    discountPrice: 1299,
    category: "Men",
    subCategory: "Jeans",
    sizes: ["28", "30", "32", "34", "36"],
    colors: ["Khaki", "Beige", "Olive"],
    images: [img("1473966968600-fa801b869a1a"), img("1542272604-787c3835535d")],
    stock: 38,
    isTrending: true,
    rating: 4.3,
    numReviews: 22,
  },
  {
    name: "Jogger Track Pants",
    description:
      "Comfortable cotton jogger pants with elastic waist. Great for workouts and lounging.",
    price: 1199,
    discountPrice: 899,
    category: "Men",
    subCategory: "Other",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Grey", "Black", "Navy"],
    images: [img("1515886657613-9f3515b0c78f"), img("1542272604-787c3835535d")],
    stock: 42,
    rating: 4.2,
    numReviews: 16,
  },

  // ── NEW: MEN FOOTWEAR ──────────────────────────────────────────────
  {
    name: "Brown Leather Derby Shoes",
    description:
      "Classic brown leather derby shoes with rubber sole. Timeless formal footwear.",
    price: 3499,
    discountPrice: 2699,
    category: "Men",
    subCategory: "Shoes",
    sizes: ["7", "8", "9", "10", "11"],
    colors: ["Brown", "Black"],
    images: [
      "https://images.unsplash.com/photo-1616696038562-574c18066055?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8QnJvd24lMjBMZWF0aGVyJTIwRGVyYnklMjBTaG9lc3xlbnwwfHwwfHx8MA%3D%3D",
    ],
    stock: 20,
    isFeatured: true,
    rating: 4.6,
    numReviews: 17,
  },
  {
    name: "Canvas Slip-On Shoes",
    description:
      "Lightweight canvas slip-on shoes in classic style. Effortless everyday footwear.",
    price: 1499,
    discountPrice: 1099,
    category: "Men",
    subCategory: "Shoes",
    sizes: ["7", "8", "9", "10", "11"],
    colors: ["White", "Black", "Navy"],
    images: [img("1600185365926-3a2ce3cdb9eb"), img("1542291026-7eec264c27ff")],
    stock: 30,
    isTrending: true,
    rating: 4.1,
    numReviews: 28,
  },
  {
    name: "Sports Running Shoes",
    description:
      "Lightweight mesh running shoes with superior cushioning. Built for performance.",
    price: 3299,
    discountPrice: 2499,
    category: "Men",
    subCategory: "Shoes",
    sizes: ["7", "8", "9", "10", "11"],
    colors: ["Black", "White", "Red"],
    images: [img("1542291026-7eec264c27ff"), img("1600185365926-3a2ce3cdb9eb")],
    stock: 25,
    isTrending: true,
    rating: 4.5,
    numReviews: 40,
  },

  // ── NEW: WOMEN TOPS ────────────────────────────────────────────────
  {
    name: "Off-Shoulder Crop Top",
    description:
      "Trendy off-shoulder crop top in soft jersey fabric. Perfect for summer evenings.",
    price: 899,
    discountPrice: 699,
    category: "Women",
    subCategory: "Tops",
    sizes: ["XS", "S", "M", "L"],
    colors: ["White", "Black", "Red"],
    images: [img("1551163943-3f6a855d1153"), img("1564257631407-4deb1f99d992")],
    stock: 40,
    isTrending: true,
    rating: 4.4,
    numReviews: 22,
  },
  {
    name: "Embroidered Kurti",
    description:
      "Elegant cotton kurti with hand embroidery. Perfect for festive occasions and daily wear.",
    price: 1599,
    discountPrice: 1199,
    category: "Women",
    subCategory: "Tops",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Blue", "Pink", "Green"],
    images: [
      "https://images.unsplash.com/photo-1777888766898-084641327f1a?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fEVtYnJvaWRlcmVkJTIwS3VydGl8ZW58MHx8MHx8fDA%3D",
    ],
    stock: 30,
    isFeatured: true,
    rating: 4.6,
    numReviews: 28,
  },
  {
    name: "Striped Wrap Blouse",
    description:
      "Chic striped wrap blouse with tie waist. Flattering for all body types.",
    price: 1299,
    discountPrice: 999,
    category: "Women",
    subCategory: "Tops",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Navy", "White", "Pink"],
    images: [
      "https://images.unsplash.com/photo-1577976658971-c3d0eaf4ef07?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8U3RyaXBlZCUyMFdyYXAlMjBCbG91c2V8ZW58MHx8MHx8fDA%3D",
    ],
    stock: 32,
    rating: 4.3,
    numReviews: 15,
  },

  // ── NEW: WOMEN BOTTOMS ─────────────────────────────────────────────
  {
    name: "High Waist Palazzo Pants",
    description:
      "Flowy high waist palazzo pants in chiffon. Elegant and comfortable for all occasions.",
    price: 1499,
    discountPrice: 1099,
    category: "Women",
    subCategory: "Other",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Black", "Beige", "Navy"],
    images: [
      img("1515886657613-9f3515b0c78f"),
      img("1594938298603-a3d2bef9da4e"),
    ],
    stock: 28,
    isTrending: true,
    rating: 4.4,
    numReviews: 19,
  },
  {
    name: "Denim Midi Skirt",
    description:
      "Classic denim midi skirt with button-front detail. A versatile wardrobe staple.",
    price: 1799,
    discountPrice: 1399,
    category: "Women",
    subCategory: "Other",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Blue", "Black"],
    images: [
      "https://images.unsplash.com/photo-1726640131511-e2c46042a2cf?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fERlbmltJTIwTWlkaSUyMFNraXJ0fGVufDB8fDB8fHww",
    ],
    stock: 24,
    rating: 4.3,
    numReviews: 14,
  },
  {
    name: "Floral Print Maxi Skirt",
    description:
      "Beautiful floral maxi skirt in lightweight fabric. Perfect for brunches and outings.",
    price: 1599,
    discountPrice: 1199,
    category: "Women",
    subCategory: "Other",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Pink", "Yellow", "White"],
    images: [
      "https://images.unsplash.com/photo-1603600694679-48f52061b807?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8RmxvcmFsJTIwUHJpbnQlMjBNYXhpJTIwU2tpcnR8ZW58MHx8MHx8fDA%3D",
    ],
    stock: 20,
    isFeatured: true,
    rating: 4.5,
    numReviews: 21,
  },

  // ── NEW: WOMEN DRESSES ─────────────────────────────────────────────
  {
    name: "Black Bodycon Dress",
    description:
      "Sleek black bodycon dress for a confident, polished look. Perfect for evenings out.",
    price: 2199,
    discountPrice: 1699,
    category: "Women",
    subCategory: "Dresses",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Black", "Red"],
    images: [
      img("1539109136881-3be0616acf4b"),
      img("1490481651871-ab68de25d43d"),
    ],
    stock: 22,
    isTrending: true,
    rating: 4.6,
    numReviews: 27,
  },
  {
    name: "Boho Printed Maxi Dress",
    description:
      "Flowy boho print maxi dress with spaghetti straps. Summer vacation essential.",
    price: 2499,
    discountPrice: 1899,
    category: "Women",
    subCategory: "Dresses",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Multicolor", "Orange", "Blue"],
    images: [
      "https://images.unsplash.com/photo-1733043014211-8d699f6a82b1?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Qm9obyUyMFByaW50ZWQlMjBNYXhpJTIwRHJlc3N8ZW58MHx8MHx8fDA%3D",
    ],
    stock: 18,
    isFeatured: true,
    rating: 4.7,
    numReviews: 33,
  },

  // ── NEW: WOMEN FOOTWEAR ────────────────────────────────────────────
  {
    name: "Block Heel Sandals",
    description:
      "Comfortable block heel sandals with ankle strap. Chic and easy to walk in all day.",
    price: 2299,
    discountPrice: 1799,
    category: "Women",
    subCategory: "Shoes",
    sizes: ["5", "6", "7", "8"],
    colors: ["Nude", "Black", "White"],
    images: [img("1596703263926-eb0762ee17e4"), img("1543163521-1bf539c55dd2")],
    stock: 25,
    isTrending: true,
    rating: 4.4,
    numReviews: 16,
  },
  {
    name: "White Platform Sneakers",
    description:
      "Chunky platform sneakers in crisp white. The ultimate streetwear statement shoe.",
    price: 2999,
    discountPrice: 2299,
    category: "Women",
    subCategory: "Shoes",
    sizes: ["5", "6", "7", "8", "9"],
    colors: ["White", "Black"],
    images: [img("1600185365926-3a2ce3cdb9eb"), img("1542291026-7eec264c27ff")],
    stock: 20,
    isFeatured: true,
    rating: 4.5,
    numReviews: 23,
  },
  {
    name: "Embellished Flat Sandals",
    description:
      "Gorgeous embellished flat sandals. Pairs beautifully with kurtis and ethnic wear.",
    price: 1499,
    discountPrice: 1099,
    category: "Women",
    subCategory: "Shoes",
    sizes: ["5", "6", "7", "8"],
    colors: ["Gold", "Silver", "Brown"],
    images: [
      "https://images.unsplash.com/photo-1618615098938-84fc29796e76?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8RW1iZWxsaXNoZWQlMjBGbGF0JTIwU2FuZGFsc3xlbnwwfHwwfHx8MA%3D%3D",
    ],
    stock: 30,
    rating: 4.3,
    numReviews: 18,
  },

  // ── NEW: ACCESSORIES ───────────────────────────────────────────────
  {
    name: "Gold Layered Necklace",
    description:
      "Delicate gold-tone layered necklace. Adds instant elegance to any outfit.",
    price: 899,
    discountPrice: 699,
    category: "Accessories",
    subCategory: "Other",
    sizes: [],
    colors: ["Gold", "Silver"],
    images: [
      "https://images.unsplash.com/photo-1727252586975-578c9122ec95?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fEdvbGQlMjBMYXllcmVkJTIwTmVja2xhY2V8ZW58MHx8MHx8fDA%3D",
    ],
    stock: 50,
    isTrending: true,
    rating: 4.5,
    numReviews: 35,
  },
  {
    name: "Aviator Sunglasses",
    description:
      "Classic gold frame aviator sunglasses with UV400 protection. A timeless essential.",
    price: 1299,
    discountPrice: 999,
    category: "Accessories",
    subCategory: "Other",
    sizes: [],
    colors: ["Gold", "Black"],
    images: [
      img("1572635196237-14b3f281503f"),
      img("1508296695527-27e8f49e3e1d"),
    ],
    stock: 35,
    isTrending: true,
    rating: 4.4,
    numReviews: 29,
  },
  {
    name: "Canvas Backpack",
    description:
      "Spacious canvas backpack with laptop sleeve. Durable and stylish for daily use.",
    price: 1999,
    discountPrice: 1499,
    category: "Accessories",
    subCategory: "Bags",
    sizes: [],
    colors: ["Olive", "Black", "Navy"],
    images: [
      "https://images.unsplash.com/photo-1474376962954-d8a681cc53b2?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Q2FudmFzJTIwQmFja3BhY2t8ZW58MHx8MHx8fDA%3D",
    ],
    stock: 25,
    isFeatured: true,
    rating: 4.6,
    numReviews: 31,
  },
  {
    name: "Silk Scarf",
    description:
      "Luxurious silk scarf with vibrant print. Can be worn as a headscarf, neck wrap or bag accessory.",
    price: 1199,
    discountPrice: 899,
    category: "Accessories",
    subCategory: "Other",
    sizes: [],
    colors: ["Multicolor", "Pink", "Blue"],
    images: [
      "https://images.unsplash.com/photo-1677478863154-55ecce8c7536?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8U2lsayUyMFNjYXJmfGVufDB8fDB8fHww",
    ],
    stock: 40,
    rating: 4.3,
    numReviews: 14,
  },
  {
    name: "Leather Bifold Wallet",
    description:
      "Slim genuine leather bifold wallet with card slots. Elegant everyday essential for men.",
    price: 1499,
    discountPrice: 1099,
    category: "Accessories",
    subCategory: "Other",
    sizes: [],
    colors: ["Brown", "Black"],
    images: [img("1548036328-c9fa89d128fa"), img("1566150905458-1bf1fc113f0d")],
    stock: 45,
    rating: 4.5,
    numReviews: 26,
  },
  {
    name: "Chronograph Sports Watch",
    description:
      "Bold chronograph watch with stainless steel case. For the man who means business.",
    price: 6999,
    discountPrice: 4999,
    category: "Accessories",
    subCategory: "Watches",
    sizes: [],
    colors: ["Black", "Silver"],
    images: [
      "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Q2hyb25vZ3JhcGglMjBTcG9ydHMlMjBXYXRjaHxlbnwwfHwwfHx8MA%3D%3D",
    ],
    stock: 12,
    isFeatured: true,
    rating: 4.8,
    numReviews: 19,
  },
  {
    name: "Rose Gold Bracelet Watch",
    description:
      "Elegant rose gold bracelet watch for women. Slim design that complements any outfit.",
    price: 3999,
    discountPrice: 2999,
    category: "Accessories",
    subCategory: "Watches",
    sizes: [],
    colors: ["Rose Gold", "White"],
    images: [
      img("1524592094714-0f0654e20314"),
      img("1523275335684-37898b6baf30"),
    ],
    stock: 16,
    isFeatured: true,
    rating: 4.7,
    numReviews: 22,
  },

  // ── NEW: KIDS ──────────────────────────────────────────────────────
  {
    name: "Kids Denim Dungaree",
    description:
      "Adorable denim dungaree for kids. Easy to wear and durable for active play.",
    price: 999,
    discountPrice: 799,
    category: "Kids",
    subCategory: "Jeans",
    sizes: ["2Y", "4Y", "6Y", "8Y", "10Y"],
    colors: ["Blue", "Pink"],
    images: [
      "https://images.unsplash.com/photo-1670577628542-e5ab31abe30b?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fEtpZHMlMjBEZW5pbSUyMER1bmdhcmVlfGVufDB8fDB8fHww",
    ],
    stock: 35,
    isFeatured: true,
    rating: 4.5,
    numReviews: 18,
  },
  {
    name: "Kids Graphic Tee Set",
    description:
      "Fun graphic print t-shirt and shorts set for kids. Soft cotton, bright prints.",
    price: 799,
    discountPrice: 599,
    category: "Kids",
    subCategory: "T-Shirts",
    sizes: ["2Y", "4Y", "6Y", "8Y"],
    colors: ["Yellow", "Blue", "Pink"],
    images: [
      "https://images.unsplash.com/photo-1721324210842-008a013870db?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8S2lkcyUyMEdyYXBoaWMlMjBUZWUlMjBTZXR8ZW58MHx8MHx8fDA%3D",
    ],
    stock: 40,
    isTrending: true,
    rating: 4.3,
    numReviews: 14,
  },
  {
    name: "Kids Party Dress",
    description:
      "Gorgeous tulle party dress for girls. Sparkly and comfortable for special occasions.",
    price: 1499,
    discountPrice: 1099,
    category: "Kids",
    subCategory: "Dresses",
    sizes: ["2Y", "4Y", "6Y", "8Y", "10Y"],
    colors: ["Pink", "White", "Purple"],
    images: [
      "https://images.unsplash.com/photo-1578897366846-358bb1c2412a?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8S2lkcyUyMFBhcnR5JTIwRHJlc3N8ZW58MHx8MHx8fDA%3D",
    ],
    stock: 20,
    isFeatured: true,
    rating: 4.7,
    numReviews: 25,
  },
  {
    name: "Kids Canvas Sneakers",
    description:
      "Comfortable canvas sneakers for kids with velcro strap. Easy on, easy off.",
    price: 999,
    discountPrice: 749,
    category: "Kids",
    subCategory: "Shoes",
    sizes: ["1", "2", "3", "4", "5"],
    colors: ["White", "Blue", "Pink"],
    images: [
      "https://images.unsplash.com/photo-1720019315435-b10b01792d9f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8S2lkcyUyMENhbnZhcyUyMFNuZWFrZXJzfGVufDB8fDB8fHww",
    ],
    stock: 45,
    isTrending: true,
    rating: 4.4,
    numReviews: 20,
  },
];

const seedDatabase = async () => {
  await Order.deleteMany();
  await Cart.deleteMany();
  await Wishlist.deleteMany();
  await Product.deleteMany();
  await User.deleteMany();

  const createdUsers = await User.create(users);
  const createdProducts = await Product.create(products);

  console.log(
    `✅ Seeded ${createdUsers.length} users, ${createdProducts.length} products`,
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
