const mongoose = require('mongoose');
const Product = require('../models/product');
const ProductVariant = require('../models/productVariant');
const User = require('../models/user');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

const createOliveOilProduct = async () => {
  try {
    await connectDB();

    // Check if olive oil product already exists
    const existingProduct = await Product.findOne({ name: /olive oil/i });
    if (existingProduct) {
      console.log('Olive oil product already exists. Skipping creation.');
      process.exit(0);
    }

    // Find a seller (admin user)
    const seller = await User.findOne({ role: 'admin' });
    if (!seller) {
      console.log('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    // Create the main olive oil product
    const productData = {
      name: 'Premium Olive Oil',
      description: 'Select your perfect size and enjoy the finest extra virgin olive oil, directly from our groves to your table. Each bottle represents generations of Palestinian olive farming tradition.',
      price: 7.99, // Base price for smallest size
      originalPrice: null,
      unit: 'bottle',
      stockQuantity: 1000,
      images: ['/oil.png'],
      category: 'olive_oil',
      seller: seller._id,
      rewardTUTPercent: 10,
      tutRewardFixed: 0,
      inStock: true,
      featured: true,
      rating: 4.9,
      features: ['Cold Pressed', 'Organic Certified', 'Extra Virgin', 'Direct from Farm'],
      specifications: {
        'Origin': 'Palestine',
        'Processing': 'Cold Pressed',
        'Certification': 'Organic',
        'Shelf Life': '24 months'
      },
      shipping: {
        free: true,
        estimatedDays: '3-5 business days'
      },
      sustainability: {
        carbonNeutral: true,
        locallySourced: true,
        plasticFree: false
      },
      hasVariants: true,
      variantType: 'size',
      variantLabel: 'Size'
    };

    const product = new Product(productData);
    await product.save();
    console.log('✅ Created Premium Olive Oil product');

    // Create product variants
    const variants = [
      {
        product: product._id,
        name: '250ml',
        sku: `OLIVE-250ML-${Date.now()}`,
        price: 7.99,
        stockQuantity: 100,
        isActive: true,
        attributes: { size: '250ml', volume: '250' },
        weight: { value: 250, unit: 'ml' },
        sortOrder: 1
      },
      {
        product: product._id,
        name: '500ml',
        sku: `OLIVE-500ML-${Date.now()}`,
        price: 13.99,
        stockQuantity: 100,
        isActive: true,
        attributes: { size: '500ml', volume: '500' },
        weight: { value: 500, unit: 'ml' },
        sortOrder: 2
      },
      {
        product: product._id,
        name: '750ml',
        sku: `OLIVE-750ML-${Date.now()}`,
        price: 18.99,
        stockQuantity: 100,
        isActive: true,
        attributes: { size: '750ml', volume: '750' },
        weight: { value: 750, unit: 'ml' },
        sortOrder: 3
      },
      {
        product: product._id,
        name: '1L',
        sku: `OLIVE-1L-${Date.now()}`,
        price: 23.99,
        stockQuantity: 100,
        isActive: true,
        attributes: { size: '1L', volume: '1000' },
        weight: { value: 1, unit: 'l' },
        sortOrder: 4
      },
      {
        product: product._id,
        name: '2L',
        sku: `OLIVE-2L-${Date.now()}`,
        price: 39.99,
        stockQuantity: 100,
        isActive: true,
        attributes: { size: '2L', volume: '2000' },
        weight: { value: 2, unit: 'l' },
        sortOrder: 5
      }
    ];

    for (const variantData of variants) {
      const variant = new ProductVariant(variantData);
      await variant.save();
      console.log(`✅ Created variant: ${variant.name} - ${variant.price} JOD`);
    }

    console.log('🎉 Premium Olive Oil product with variants created successfully!');
    console.log('📦 Product ID:', product._id);
    console.log('🔧 You can now manage variants in the admin panel');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating olive oil product:', error.message);
    process.exit(1);
  }
};

createOliveOilProduct();

