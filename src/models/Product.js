const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    discountPrice: { type: Number, default: 0 },
    category: {
      type: String,
      enum: ['Men', 'Women', 'Kids', 'Accessories'],
      required: true,
    },
    subCategory: {
      type: String,
      enum: ['T-Shirts', 'Shirts', 'Jeans', 'Dresses', 'Tops', 'Shoes', 'Bags', 'Watches', 'Other'],
      default: 'Other',
    },
    sizes: [{ type: String }],
    colors: [{ type: String }],
    images: [{ type: String }],
    brand: { type: String, default: 'DS Store' },
    stock: { type: Number, required: true, default: 0 },
    inStock: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    reviews: [reviewSchema],
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  this.inStock = this.stock > 0;
  next();
});

module.exports = mongoose.model('Product', productSchema);
