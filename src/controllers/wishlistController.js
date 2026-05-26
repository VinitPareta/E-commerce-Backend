// const asyncHandler = require("express-async-handler");
// const Wishlist = require("../models/Wishlist");
// const Product = require("../models/Product");

// // @desc    Get wishlist
// // @route   GET /api/wishlist
// // @access  Private
// const getWishlist = asyncHandler(async (req, res) => {
//   let wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
//     'products',
//     'name price discountPrice images stock inStock category rating'
//   );
//   if (!wishlist) {
//     wishlist = await Wishlist.create({ user: req.user._id, products: [] });
//   }
//   res.json({ success: true, wishlist });
// });

// // @desc    Toggle product in wishlist
// // @route   POST /api/wishlist
// // @access  Private
// const toggleWishlist = asyncHandler(async (req, res) => {
//   const { productId } = req.body;

//   const product = await Product.findById(productId);
//   if (!product) {
//     res.status(404);
//     throw new Error('Product not found');
//   }

//   let wishlist = await Wishlist.findOne({ user: req.user._id });
//   if (!wishlist) {
//     wishlist = await Wishlist.create({ user: req.user._id, products: [] });
//   }

//   const idx = wishlist.products.findIndex((p) => p.toString() === productId);
//   let action = '';
//   if (idx === -1) {
//     wishlist.products.push(productId);
//     action = 'added';
//   } else {
//     wishlist.products.splice(idx, 1);
//     action = 'removed';
//   }

//   await wishlist.save();
//   await wishlist.populate(
//     'products',
//     'name price discountPrice images stock inStock category rating'
//   );
//   res.json({ success: true, action, wishlist });
// });

// // @desc    Remove product from wishlist
// // @route   DELETE /api/wishlist/:productId
// // @access  Private
// const removeFromWishlist = asyncHandler(async (req, res) => {
//   const wishlist = await Wishlist.findOne({ user: req.user._id });
//   if (!wishlist) {
//     res.status(404);
//     throw new Error('Wishlist not found');
//   }

//   wishlist.products = wishlist.products.filter(
//     (p) => p.toString() !== req.params.productId
//   );
//   await wishlist.save();
//   await wishlist.populate(
//     'products',
//     'name price discountPrice images stock inStock category rating'
//   );
//   res.json({ success: true, wishlist });
// });

// module.exports = { getWishlist, toggleWishlist, removeFromWishlist };
const asyncHandler = require("express-async-handler");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

// @desc    Get wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({
    user: req.user._id,
  }).populate(
    "products",
    "name price discountPrice images stock inStock category rating numReviews reviews",
  );

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user._id,
      products: [],
    });
  }

  res.json({
    success: true,
    wishlist,
  });
});

// @desc    Toggle wishlist
// @route   POST /api/wishlist
// @access  Private
const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  let wishlist = await Wishlist.findOne({
    user: req.user._id,
  });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user._id,
      products: [],
    });
  }

  const idx = wishlist.products.findIndex((p) => p.toString() === productId);

  let action = "";

  if (idx === -1) {
    wishlist.products.push(productId);
    action = "added";
  } else {
    wishlist.products.splice(idx, 1);
    action = "removed";
  }

  await wishlist.save();

  await wishlist.populate(
    "products",
    "name price discountPrice images stock inStock category rating numReviews reviews",
  );

  res.json({
    success: true,
    action,
    wishlist,
  });
});

// @desc    Remove from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({
    user: req.user._id,
  });

  if (!wishlist) {
    res.status(404);
    throw new Error("Wishlist not found");
  }

  wishlist.products = wishlist.products.filter(
    (p) => p.toString() !== req.params.productId,
  );

  await wishlist.save();

  await wishlist.populate(
    "products",
    "name price discountPrice images stock inStock category rating numReviews reviews",
  );

  res.json({
    success: true,
    wishlist,
  });
});

module.exports = {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
};
